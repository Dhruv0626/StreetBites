import { calculateTomTomRoute, normalizeToLngLat } from '../services/tomtomRoutingService';

export interface RoadRoutingResult {
  distanceKm: number;
  etaText: string;
  travelTimeMinutes: number;
  deliveryFee: number;
  coordinates: [number, number][];
  isRoadRoute: boolean;
  breakdown: string;
}

// In-memory cache for road route calculations (synced with sessionStorage for reload persistence)
const roadRouteCache = new Map<string, RoadRoutingResult>();

/**
 * Checks for a cached road route in memory or sessionStorage
 */
export function getCachedRoadDistanceAndFee(
  originCoords: [number, number] | undefined,
  destinationCoords: [number, number] | undefined
): RoadRoutingResult | null {
  if (!originCoords || !destinationCoords || originCoords.length < 2 || destinationCoords.length < 2) {
    return null;
  }

  const normOrigin = normalizeToLngLat(originCoords);
  const normDest = normalizeToLngLat(destinationCoords);
  const cacheKey = `sb_road_${normOrigin[0].toFixed(4)}_${normOrigin[1].toFixed(4)}->${normDest[0].toFixed(4)}_${normDest[1].toFixed(4)}`;

  if (roadRouteCache.has(cacheKey)) {
    return roadRouteCache.get(cacheKey)!;
  }

  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const stored = sessionStorage.getItem(cacheKey);
      if (stored) {
        const parsed = JSON.parse(stored) as RoadRoutingResult;
        roadRouteCache.set(cacheKey, parsed);
        return parsed;
      }
    } catch {}
  }

  return null;
}

/**
 * Haversine Formula for Geodesic Distance in Kilometers
 * @param coord1 [longitude, latitude]
 * @param coord2 [longitude, latitude]
 * @returns distance in km rounded to 2 decimal places
 */
export function calculateDistanceKm(
  coord1: [number, number] | undefined,
  coord2: [number, number] | undefined
): number {
  if (!coord1 || !coord2 || coord1.length < 2 || coord2.length < 2) {
    return 2.5; // fallback default distance
  }

  const norm1 = normalizeToLngLat(coord1);
  const norm2 = normalizeToLngLat(coord2);

  const [lng1, lat1] = norm1;
  const [lng2, lat2] = norm2;

  // Validate numbers
  if (isNaN(lng1) || isNaN(lat1) || isNaN(lng2) || isNaN(lat2)) {
    return 2.5;
  }

  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const dist = R * c;

  return Math.round(dist * 100) / 100;
}

/**
 * Calculate dynamic delivery fee based on calculated road distance
 * Fixed Pricing:
 * - ₹22 for the first 2.0 km
 * - ₹7/km for remaining distance beyond 2.0 km
 */
export function calculateDeliveryFee(distanceKm: number, hasItems: boolean = true): number {
  if (!hasItems || distanceKm <= 0) return 0;

  if (distanceKm <= 2.0) {
    return 22;
  }
  const extraKm = distanceKm - 2.0;
  return Math.round(22 + extraKm * 7);
}

/**
 * Returns human-readable breakdown of delivery fee calculation
 */
export function getDeliveryFeeBreakdown(distanceKm: number): string {
  if (distanceKm <= 0) return '₹0';
  if (distanceKm <= 2.0) {
    return '₹22 base fee (first 2.0 km)';
  }
  const extra = (distanceKm - 2.0).toFixed(1);
  const extraCost = Math.round((distanceKm - 2.0) * 7);
  return `₹22 base (2 km) + ₹${extraCost} (${extra} km @ ₹7/km)`;
}

/**
 * Calculate Estimated Delivery Time (ETA) based on distance
 */
export function calculateETA(distanceKm: number, roadTravelMinutes?: number): string {
  if (roadTravelMinutes && roadTravelMinutes > 0) {
    const minMins = Math.max(15, roadTravelMinutes + 8); // include 8 min food prep / pickup
    const maxMins = minMins + 7;
    return `${minMins}–${maxMins} min`;
  }

  if (distanceKm <= 0) return '20–25 min';
  const minMinutes = Math.round(15 + distanceKm * 2.5);
  const maxMinutes = Math.round(minMinutes + 6);
  return `${minMinutes}–${maxMinutes} min`;
}

/**
 * ─── Accurate Road-by-Road Distance & Delivery Fee Calculation ───────────────
 * Queries TomTom Routing API (with OSRM fallback) to get the true road driving distance,
 * winding road coordinates polyline, and live traffic travel time.
 */
export async function calculateRoadDistanceAndFee(
  originCoords: [number, number] | undefined,
  destinationCoords: [number, number] | undefined,
  hasItems: boolean = true
): Promise<RoadRoutingResult> {
  if (!originCoords || !destinationCoords || originCoords.length < 2 || destinationCoords.length < 2) {
    const fallbackDist = 2.5;
    const fee = calculateDeliveryFee(fallbackDist, hasItems);
    return {
      distanceKm: fallbackDist,
      etaText: calculateETA(fallbackDist),
      travelTimeMinutes: 18,
      deliveryFee: fee,
      coordinates: [],
      isRoadRoute: false,
      breakdown: getDeliveryFeeBreakdown(fallbackDist),
    };
  }

  const normOrigin = normalizeToLngLat(originCoords);
  const normDest = normalizeToLngLat(destinationCoords);
  const cacheKey = `sb_road_${normOrigin[0].toFixed(4)}_${normOrigin[1].toFixed(4)}->${normDest[0].toFixed(4)}_${normDest[1].toFixed(4)}`;

  const cached = getCachedRoadDistanceAndFee(normOrigin, normDest);
  if (cached) {
    return cached;
  }

  try {
    const routeRes = await calculateTomTomRoute([normOrigin, normDest], {
      travelMode: 'motorcycle',
      traffic: false,
      routeType: 'fastest',
    });

    if (routeRes.success && routeRes.distanceInKm > 0 && routeRes.coordinates.length >= 2) {
      const roadKm = routeRes.distanceInKm;
      const travelMins = routeRes.travelTimeInMinutes;
      const fee = calculateDeliveryFee(roadKm, hasItems);
      const eta = calculateETA(roadKm, travelMins);
      const breakdown = getDeliveryFeeBreakdown(roadKm);

      const result: RoadRoutingResult = {
        distanceKm: roadKm,
        etaText: eta,
        travelTimeMinutes: travelMins,
        deliveryFee: fee,
        coordinates: routeRes.coordinates,
        isRoadRoute: true,
        breakdown,
      };

      roadRouteCache.set(cacheKey, result);
      if (typeof window !== 'undefined' && window.sessionStorage) {
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(result));
        } catch {}
      }
      return result;
    }
  } catch (err) {
    console.warn('TomTom road calculation error:', err);
  }

  // Haversine fallback
  const fallbackKm = calculateDistanceKm(normOrigin, normDest);
  const fee = calculateDeliveryFee(fallbackKm, hasItems);
  const fallbackResult: RoadRoutingResult = {
    distanceKm: fallbackKm,
    etaText: calculateETA(fallbackKm),
    travelTimeMinutes: Math.round(fallbackKm * 3),
    deliveryFee: fee,
    coordinates: [normOrigin, normDest],
    isRoadRoute: false,
    breakdown: getDeliveryFeeBreakdown(fallbackKm),
  };

  roadRouteCache.set(cacheKey, fallbackResult);
  return fallbackResult;
}
