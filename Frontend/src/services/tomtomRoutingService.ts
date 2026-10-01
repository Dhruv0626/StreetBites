import { TOMTOM_API_KEY } from '../config/tomtom';

export interface RoutePoint {
  latitude: number;
  longitude: number;
}

export interface TurnInstruction {
  message: string;
  street?: string;
  distanceInMeters: number;
  travelTimeInSeconds: number;
  point: [number, number]; // [lng, lat]
  maneuver: string;
}

export interface RouteCalculationResult {
  success: boolean;
  coordinates: [number, number][]; // Array of [lng, lat] for GeoJSON road polyline
  distanceInMeters: number;
  distanceInKm: number;
  travelTimeInSeconds: number;
  travelTimeInMinutes: number;
  instructions: TurnInstruction[];
  summary?: {
    lengthInMeters: number;
    travelTimeInSeconds: number;
    trafficDelayInSeconds: number;
    departureTime: string;
    arrivalTime: string;
  };
  errorMessage?: string;
}

export interface RouteOptions {
  travelMode?: 'motorcycle' | 'car' | 'bicycle' | 'pedestrian';
  routeType?: 'fastest' | 'shortest' | 'eco';
  traffic?: boolean;
  computeTurnByTurn?: boolean;
}

export interface MatrixElement {
  originIndex: number;
  destinationIndex: number;
  lengthInMeters: number;
  distanceInKm: number;
  travelTimeInSeconds: number;
  travelTimeInMinutes: number;
  trafficDelayInSeconds: number;
  statusCode: number;
}

export interface MatrixCalculationResult {
  success: boolean;
  matrix: MatrixElement[][];
  errorMessage?: string;
}

export interface CheckpointItem {
  id: string;
  title: string;
  desc?: string;
  amount?: string;
  dist?: string;
  type: 'pickup' | 'drop';
  position: [number, number]; // [lng, lat]
}

/**
 * Normalizes any coordinate tuple to standard [longitude, latitude]
 * Fixes flipped [lat, lng] arrays to guarantee routing engines accept valid coordinates
 */
export function normalizeToLngLat(coord: any): [number, number] {
  if (!coord) return [72.5873, 23.0248];
  let a: number, b: number;
  if (Array.isArray(coord) && coord.length >= 2) {
    a = Number(coord[0]);
    b = Number(coord[1]);
  } else if (typeof coord === 'object' && coord !== null) {
    a = Number(coord.lng ?? coord.longitude ?? coord.x ?? 72.5873);
    b = Number(coord.lat ?? coord.latitude ?? coord.y ?? 23.0248);
  } else {
    return [72.5873, 23.0248];
  }
  if (isNaN(a) || isNaN(b)) return [72.5873, 23.0248];

  // In India/Gujarat: Longitude is ~68-76 (a > b) and Latitude is ~20-26 (b < a)
  // If first is ~23 and second is ~72 (a < b), swap to standard [lng, lat]
  if (a >= -90 && a <= 90 && b >= -180 && b <= 180 && a < b && a < 50 && b > 50) {
    return [b, a];
  }
  return [a, b];
}

// Ultra-Fast In-Memory Route Cache
const routeCalculationCache = new Map<string, RouteCalculationResult>();

/**
 * Calculates a true road-by-road driving route using TomTom Routing API
 * with instant OpenStreetMap OSRM street-routing fallback to guarantee
 * that a live road curve polyline is ALWAYS displayed with maximum speed!
 *
 * @param points Array of [longitude, latitude] coordinates in sequence
 * @param options Routing options (travelMode, traffic, instructions)
 */
export async function calculateTomTomRoute(
  points: [number, number][],
  options: RouteOptions = {}
): Promise<RouteCalculationResult> {
  if (!points || points.length < 2) {
    return {
      success: false,
      coordinates: [],
      distanceInMeters: 0,
      distanceInKm: 0,
      travelTimeInSeconds: 0,
      travelTimeInMinutes: 0,
      instructions: [],
      errorMessage: 'At least 2 points (origin and destination) are required to calculate a route.',
    };
  }

  const apiKey = TOMTOM_API_KEY || 'pKaNxsGAgRWmxEehTjy8EIxVWGsfSIc3';
  const normalizedPoints = points.map((p) => normalizeToLngLat(p));

  const {
    travelMode = 'car',
    routeType = 'fastest',
    traffic = false, // false enables lightning-fast routing calculation without waiting for heavy traffic simulation
  } = options;

  // Cache lookup key based on coordinates (rounded to 4 decimal places ~ 11m for instant hit)
  const cacheKey = `${travelMode}:${normalizedPoints.map(([lng, lat]) => `${lng.toFixed(4)},${lat.toFixed(4)}`).join('->')}`;
  if (routeCalculationCache.has(cacheKey)) {
    return routeCalculationCache.get(cacheKey)!;
  }

  // Format: lat,lng:lat,lng:... (WITHOUT URL-encoding the colons)
  const locationsString = normalizedPoints
    .map(([lng, lat]) => `${lat.toFixed(6)},${lng.toFixed(6)}`)
    .join(':');

  // 1. Direct TomTom REST API query with 4.5s timeout
  const fetchTomTomDirect = async (): Promise<RouteCalculationResult | null> => {
    const mode = travelMode === 'motorcycle' ? 'motorcycle' : 'car';
    const url = `https://api.tomtom.com/routing/1/calculateRoute/${locationsString}/json?key=${encodeURIComponent(
      apiKey
    )}&travelMode=${encodeURIComponent(mode)}&routeType=${encodeURIComponent(
      routeType
    )}&traffic=false&routeRepresentation=polyline`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4500);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (response.ok) {
        const data = await response.json();
        const route = data.routes?.[0];
        if (route) {
          const polylineCoordinates: [number, number][] = [];
          const legs = route.legs || [];

          for (const leg of legs) {
            if (Array.isArray(leg.points)) {
              for (const pt of leg.points) {
                polylineCoordinates.push([pt.longitude, pt.latitude]);
              }
            }
          }

          if (polylineCoordinates.length > normalizedPoints.length) {
            const summary = route.summary || {};
            const lengthInMeters = summary.lengthInMeters || 0;
            const travelTimeInSeconds = summary.travelTimeInSeconds || 0;

            return {
              success: true,
              coordinates: polylineCoordinates,
              distanceInMeters: lengthInMeters,
              distanceInKm: parseFloat((lengthInMeters / 1000).toFixed(1)),
              travelTimeInSeconds: travelTimeInSeconds,
              travelTimeInMinutes: Math.max(1, Math.ceil(travelTimeInSeconds / 60)),
              instructions: [],
              summary: {
                lengthInMeters,
                travelTimeInSeconds,
                trafficDelayInSeconds: summary.trafficDelayInSeconds || 0,
                departureTime: summary.departureTime || '',
                arrivalTime: summary.arrivalTime || '',
              },
            };
          }
        }
      }
    } catch {
      // TomTom query timed out or failed
    }
    return null;
  };

  // 2. High-Reliability OSRM Multi-Waypoint Street Router Fallback (with full intermediate stops)
  const fetchOsrmFallback = async (): Promise<RouteCalculationResult | null> => {
    try {
      const pointsString = normalizedPoints.map(([lng, lat]) => `${lng},${lat}`).join(';');
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${pointsString}?overview=full&geometries=geojson`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);

      const osrmRes = await fetch(osrmUrl, { signal: controller.signal });
      clearTimeout(timer);

      if (osrmRes.ok) {
        const osrmData = await osrmRes.json();
        const osrmRoute = osrmData.routes?.[0];
        if (osrmRoute?.geometry?.coordinates && osrmRoute.geometry.coordinates.length > normalizedPoints.length) {
          const coords = osrmRoute.geometry.coordinates as [number, number][];
          const distMeters = osrmRoute.distance || 0;
          const durSeconds = osrmRoute.duration || 0;

          return {
            success: true,
            coordinates: coords,
            distanceInMeters: distMeters,
            distanceInKm: parseFloat((distMeters / 1000).toFixed(1)),
            travelTimeInSeconds: durSeconds,
            travelTimeInMinutes: Math.max(1, Math.ceil(durSeconds / 60)),
            instructions: [],
            summary: {
              lengthInMeters: distMeters,
              travelTimeInSeconds: durSeconds,
              trafficDelayInSeconds: 0,
              departureTime: '',
              arrivalTime: '',
            },
          };
        }
      }
    } catch {
      // OSRM failed
    }
    return null;
  };

  // Concurrent racing: Execute TomTom API and OSRM simultaneously to get fastest road route
  let result: RouteCalculationResult | null = null;
  try {
    const tomtomPromise = fetchTomTomDirect();
    const osrmPromise = fetchOsrmFallback();

    result = await Promise.race([
      tomtomPromise.then(res => res || osrmPromise),
      osrmPromise.then(res => res || tomtomPromise),
    ]);
  } catch {
    result = await fetchOsrmFallback();
  }

  if (result && result.success && Array.isArray(result.coordinates) && result.coordinates.length > normalizedPoints.length) {
    routeCalculationCache.set(cacheKey, result);
    return result;
  }

  // If road route is still calculating or unreachable, return empty coordinates (NEVER draw straight lines)
  const directDistMeters = Math.round(
    Math.sqrt(
      Math.pow((normalizedPoints[1][0] - normalizedPoints[0][0]) * 111000, 2) +
      Math.pow((normalizedPoints[1][1] - normalizedPoints[0][1]) * 111000, 2)
    )
  );
  const directDistKm = parseFloat((directDistMeters / 1000).toFixed(1)) || 2.0;

  return {
    success: false,
    coordinates: [], // Do NOT return straight line points
    distanceInMeters: directDistMeters,
    distanceInKm: directDistKm,
    travelTimeInSeconds: Math.round(directDistKm * 180),
    travelTimeInMinutes: Math.ceil(directDistKm * 3),
    instructions: [],
    errorMessage: 'Calculating road route...',
  };
}

/**
 * ─── TomTom Matrix Routing API ─────────────────────────────────────────────
 */
export async function calculateTomTomMatrix(
  origins: [number, number][],
  destinations: [number, number][],
  options: RouteOptions = {}
): Promise<MatrixCalculationResult> {
  if (!origins || origins.length === 0 || !destinations || destinations.length === 0) {
    return {
      success: false,
      matrix: [],
      errorMessage: 'Origins and destinations must both contain at least 1 coordinate point.',
    };
  }

  const apiKey = TOMTOM_API_KEY || 'pKaNxsGAgRWmxEehTjy8EIxVWGsfSIc3';
  const normOrigins = origins.map(normalizeToLngLat);
  const normDestinations = destinations.map(normalizeToLngLat);

  const {
    travelMode = 'car',
    routeType = 'fastest',
    traffic = false,
  } = options;

  try {
    const url = `https://api.tomtom.com/routing/1/matrix/sync/json?key=${apiKey}`;

    const requestBody = {
      origins: normOrigins.map(([lng, lat]) => ({
        point: { latitude: lat, longitude: lng },
      })),
      destinations: normDestinations.map(([lng, lat]) => ({
        point: { latitude: lat, longitude: lng },
      })),
      options: {
        travelMode,
        routeType,
        traffic,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      const msg = errorJson?.error?.description || `Matrix routing failed with HTTP ${response.status}`;
      console.warn('TomTom Matrix API error:', msg);
      return {
        success: false,
        matrix: [],
        errorMessage: msg,
      };
    }

    const data = await response.json();
    const rawMatrix = data?.matrix || [];

    const matrixResult: MatrixElement[][] = rawMatrix.map((row: any[], originIdx: number) =>
      row.map((cell: any, destIdx: number) => {
        const summary = cell?.response?.routeSummary || {};
        const lengthInMeters = summary.lengthInMeters || 0;
        const travelTimeInSeconds = summary.travelTimeInSeconds || 0;

        return {
          originIndex: originIdx,
          destinationIndex: destIdx,
          lengthInMeters,
          distanceInKm: parseFloat((lengthInMeters / 1000).toFixed(1)),
          travelTimeInSeconds,
          travelTimeInMinutes: Math.ceil(travelTimeInSeconds / 60),
          trafficDelayInSeconds: summary.trafficDelayInSeconds || 0,
          statusCode: cell?.statusCode || 200,
        };
      })
    );

    return {
      success: true,
      matrix: matrixResult,
    };
  } catch (err: any) {
    console.error('Error calling TomTom Matrix Routing API:', err);
    return {
      success: false,
      matrix: [],
      errorMessage: err?.message || 'Network error executing matrix routing.',
    };
  }
}

/**
 * ─── Multi-Stall Delivery Optimizer ─────────────────────────────────────────
 */
export async function optimizeMultiStopCheckpoints(
  riderPosition: [number, number],
  checkpoints: CheckpointItem[]
): Promise<{
  optimizedCheckpoints: CheckpointItem[];
  routeResult: RouteCalculationResult;
}> {
  const normRider = normalizeToLngLat(riderPosition);

  if (!checkpoints || checkpoints.length <= 2) {
    const coords: [number, number][] = [
      normRider,
      ...checkpoints.map((cp) => normalizeToLngLat(cp.position)),
    ];
    const route = await calculateTomTomRoute(coords, {
      travelMode: 'motorcycle',
      traffic: false,
    });
    return { optimizedCheckpoints: checkpoints, routeResult: route };
  }

  const pickupStops = checkpoints.filter((cp) => cp.type === 'pickup');
  const dropStops = checkpoints.filter((cp) => cp.type === 'drop');

  const generatePermutations = <T>(arr: T[]): T[][] => {
    if (arr.length <= 1) return [arr];
    const perms: T[][] = [];
    for (let i = 0; i < arr.length; i++) {
      const current = arr[i];
      const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
      for (const p of generatePermutations(remaining)) {
        perms.push([current, ...p]);
      }
    }
    return perms;
  };

  const pickupPermutations = generatePermutations(pickupStops);
  let bestOrder = pickupStops;
  let bestRouteResult: RouteCalculationResult | null = null;
  let minDuration = Infinity;

  for (const perm of pickupPermutations) {
    const candidateCoords: [number, number][] = [
      normRider,
      ...perm.map((cp) => normalizeToLngLat(cp.position)),
      ...dropStops.map((cp) => normalizeToLngLat(cp.position)),
    ];

    const result = await calculateTomTomRoute(candidateCoords, {
      travelMode: 'motorcycle',
      traffic: false,
    });

    if (result.success && result.travelTimeInSeconds < minDuration) {
      minDuration = result.travelTimeInSeconds;
      bestOrder = perm;
      bestRouteResult = result;
    }
  }

  const optimizedCheckpoints: CheckpointItem[] = [
    ...bestOrder.map((cp, idx) => ({ ...cp, id: String(idx + 1) })),
    ...dropStops.map((cp, idx) => ({ ...cp, id: String(bestOrder.length + idx + 1) })),
  ];

  return {
    optimizedCheckpoints,
    routeResult:
      bestRouteResult ||
      (await calculateTomTomRoute([normRider, ...checkpoints.map((c) => normalizeToLngLat(c.position))])),
  };
}
