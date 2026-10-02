import React, { useState, useEffect } from 'react';
import { TomTomMap } from '../../components/map/TomTomMap';
import { type MapMarker } from '../../types/map';
import {
  Compass,
  CheckCircle2,
  Navigation,
  Loader2,
  ArrowRight,
  Clock,
  Volume2,
  VolumeX,
  X,
  LocateFixed,
  Play,
  Home,
  Bell,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import riderService, { type ActiveRouteData } from '../../services/riderService';
import {
  calculateTomTomRoute,
  type RouteCalculationResult,
} from '../../services/tomtomRoutingService';

/**
 * Computes the forward compass bearing / azimuth (0 - 360 deg) from start to destination coordinate.
 * Both points are standard [longitude, latitude].
 */
function calculateBearing(start: [number, number], dest: [number, number]): number {
  const [startLng, startLat] = start;
  const [destLng, destLat] = dest;

  const lat1 = (startLat * Math.PI) / 180;
  const lat2 = (destLat * Math.PI) / 180;
  const dLng = ((destLng - startLng) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

export const RiderRoute: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeRoute, setActiveRoute] = useState<ActiveRouteData | null>(null);
  const [activeStopIndex, setActiveStopIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isAtDoor, setIsAtDoor] = useState(false);
  const [isMarkingAtDoor, setIsMarkingAtDoor] = useState(false);

  // Live TomTom routing calculation state
  const [routeResult, setRouteResult] = useState<RouteCalculationResult | null>(null);
  const [isRouting, setIsRouting] = useState(false);
  const [riderLiveLocation, setRiderLiveLocation] = useState<[number, number] | null>(null);
  const [deviceGpsHeading, setDeviceGpsHeading] = useState<number | null>(null);

  // ── 3D Turn-By-Turn Navigation Mode State ──────────────────────────────────
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [isVoiceMuted, setIsVoiceMuted] = useState<boolean>(false);

  const speakInstruction = (text: string) => {
    if (isVoiceMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch { }
  };

  const handleStartNavigation = () => {
    setIsNavigating(true);
    speakInstruction(`Starting navigation to ${activeCheckpoint?.title || 'next stop'}.`);
  };

  const handleStopNavigation = () => {
    setIsNavigating(false);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // ── 1. Live GPS Location Tracking for Rider ────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;

    const handlePos = (pos: GeolocationPosition) => {
      setRiderLiveLocation([pos.coords.longitude, pos.coords.latitude]);
      if (typeof pos.coords.heading === 'number' && !isNaN(pos.coords.heading) && pos.coords.heading >= 0) {
        setDeviceGpsHeading(pos.coords.heading);
      }
    };

    // Get initial position immediately with high accuracy, falling back to standard if needed
    navigator.geolocation.getCurrentPosition(
      handlePos,
      () => {
        navigator.geolocation.getCurrentPosition(
          handlePos,
          (e) => console.warn('Fallback GPS warning:', e),
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 }
    );

    // Watch position as rider moves along the road
    const watchId = navigator.geolocation.watchPosition(
      handlePos,
      (err) => {
        console.warn('GPS continuous watch warning:', err);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchActiveRoute = async (isPoll: boolean = false) => {
      try {
        if (!isPoll) setIsLoading(true);
        const res = await riderService.getActiveRoute({
          riderId: user?._id || user?.id,
          email: user?.email,
        });

        if (isMounted && res && res.success && res.data) {
          const routeData = res.data;
          const targetOrderId = routeData.rawId || routeData.orderId;

          // Retrieve locally stored collected checkpoints as instant fallback
          let localCollected: number[] = [];
          try {
            const raw = localStorage.getItem(`sb_rider_collected_${targetOrderId}`);
            if (raw) localCollected = JSON.parse(raw);
          } catch { }

          const serverCollected: number[] = Array.isArray(routeData.collectedCheckpoints)
            ? routeData.collectedCheckpoints
            : [];

          const mergedCollected = Array.from(new Set([...serverCollected, ...localCollected]));

          // Sync checkpoints with collected state
          const updatedCheckpoints = (routeData.checkpoints || []).map((cp, idx) => ({
            ...cp,
            isCollected: mergedCollected.includes(idx) || cp.isCollected,
          }));

          routeData.checkpoints = updatedCheckpoints;
          routeData.collectedCheckpoints = mergedCollected;
          if (routeData.status === 'RIDER_AT_DOOR' || routeData.status === 'AT_DOOR') {
            setIsAtDoor(true);
          }
          setActiveRoute(routeData);

          // Calculate current active stop: first stall that is NOT yet collected (or the final drop stop)
          let firstPendingIdx = 0;
          while (
            firstPendingIdx < updatedCheckpoints.length - 1 &&
            mergedCollected.includes(firstPendingIdx)
          ) {
            firstPendingIdx++;
          }
          setActiveStopIndex(firstPendingIdx);
        } else if (isMounted && res && res.success && !res.data) {
          setActiveRoute(null);
        }
      } catch (err) {
        console.error('Failed to load active route:', err);
      } finally {
        if (isMounted && !isPoll) {
          setIsLoading(false);
        }
      }
    };

    fetchActiveRoute(false);

    // Live sync polling every 4 seconds to get real-time vendor food prep/ready status
    const pollInterval = setInterval(() => {
      fetchActiveRoute(true);
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [user]);

  const checkpoints = activeRoute?.checkpoints || [];
  const activeCheckpoint = checkpoints.length > 0
    ? checkpoints[Math.min(activeStopIndex, checkpoints.length - 1)]
    : null;

  // Calculate live TomTom route whenever active checkpoints change or live GPS updates (with fast debouncing)
  useEffect(() => {
    let isMounted = true;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const computeRoute = async () => {
      if (!checkpoints || checkpoints.length < 2) {
        if (isMounted) setRouteResult(null);
        return;
      }

      setIsRouting(true);

      // Determine active route stops in sequence:
      // If live GPS is available, start route from rider's exact live GPS coordinate to upcoming stops!
      let stopsToRoute: [number, number][] = [];

      if (riderLiveLocation && Array.isArray(riderLiveLocation) && riderLiveLocation.length === 2) {
        const upcomingStops = checkpoints.slice(activeStopIndex).map(
          (cp) => [cp.position[0], cp.position[1]] as [number, number]
        );
        stopsToRoute = [riderLiveLocation, ...upcomingStops];
      } else {
        const routeCheckpoints = activeStopIndex === 0
          ? checkpoints
          : [checkpoints[activeStopIndex - 1], ...checkpoints.slice(activeStopIndex)];
        stopsToRoute = routeCheckpoints.map(
          (cp) => [cp.position[0], cp.position[1]] as [number, number]
        );
      }

      if (stopsToRoute.length < 2) {
        stopsToRoute = checkpoints.map(cp => [cp.position[0], cp.position[1]] as [number, number]);
      }

      try {
        const result = await calculateTomTomRoute(stopsToRoute, {
          travelMode: 'motorcycle',
          traffic: false,
          computeTurnByTurn: true,
        });

        if (isMounted) {
          if (
            result &&
            result.success &&
            Array.isArray(result.coordinates) &&
            result.coordinates.length > stopsToRoute.length
          ) {
            setRouteResult(result);
          }
        }
      } catch (calcErr) {
        console.warn('Error calculating rider route:', calcErr);
      } finally {
        if (isMounted) setIsRouting(false);
      }
    };

    // Debounce recalculation so route updates instantly without lagging on GPS jitter
    timerId = setTimeout(() => {
      computeRoute();
    }, 300);

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [
    checkpoints.length,
    activeStopIndex,
    riderLiveLocation?.[0] ? Number(riderLiveLocation[0].toFixed(3)) : null,
    riderLiveLocation?.[1] ? Number(riderLiveLocation[1].toFixed(3)) : null,
  ]);

  // ── Calculate Precise Forward Bearing along the Road / Next Step ─────────────
  const riderHeading = React.useMemo(() => {
    if (!riderLiveLocation || !Array.isArray(riderLiveLocation) || riderLiveLocation.length < 2) {
      return 0;
    }

    const [rLng, rLat] = riderLiveLocation;
    const routeCoords = routeResult?.coordinates;

    // 1. If we have the TomTom road polyline coordinates
    if (routeCoords && routeCoords.length >= 2) {
      let closestIdx = 0;
      let minDistanceSq = Infinity;

      // Find closest node on road polyline
      for (let i = 0; i < routeCoords.length; i++) {
        const [cLng, cLat] = routeCoords[i];
        const dLng = cLng - rLng;
        const dLat = cLat - rLat;
        const distSq = dLng * dLng + dLat * dLat;
        if (distSq < minDistanceSq) {
          minDistanceSq = distSq;
          closestIdx = i;
        }
      }

      // Look ahead along the road polyline (at least 15-30 meters / 2+ nodes ahead)
      let targetIdx = closestIdx + 1;
      while (targetIdx < routeCoords.length) {
        const [tLng, tLat] = routeCoords[targetIdx];
        const [curLng, curLat] = routeCoords[closestIdx];
        const dLng = tLng - curLng;
        const dLat = tLat - curLat;
        // ~0.0001 deg ≈ 11 meters
        if (Math.hypot(dLng, dLat) > 0.0001 || targetIdx === routeCoords.length - 1) {
          break;
        }
        targetIdx++;
      }

      if (targetIdx < routeCoords.length) {
        const targetPt = routeCoords[targetIdx];
        return Math.round(calculateBearing([rLng, rLat], targetPt));
      }
    }

    // 2. Direct bearing towards next active checkpoint if polyline is not available
    if (activeCheckpoint && Array.isArray(activeCheckpoint.position) && activeCheckpoint.position.length >= 2) {
      const targetPos: [number, number] = [
        activeCheckpoint.position[0],
        activeCheckpoint.position[1],
      ];
      return Math.round(calculateBearing([rLng, rLat], targetPos));
    }

    // 3. Fallback to device hardware compass heading if available
    if (typeof deviceGpsHeading === 'number' && !isNaN(deviceGpsHeading) && deviceGpsHeading >= 0) {
      return Math.round(deviceGpsHeading);
    }

    return 0;
  }, [riderLiveLocation, routeResult?.coordinates, activeCheckpoint, deviceGpsHeading]);

  // Map markers for active checkpoints & live rider position
  const routeMarkers: MapMarker[] = React.useMemo(() => {
    const list: MapMarker[] = [];

    // 1. Live Rider Marker (with Dynamic Forward Road Heading)
    if (riderLiveLocation && Array.isArray(riderLiveLocation) && riderLiveLocation.length === 2) {
      list.push({
        id: 'rider-live-gps',
        position: riderLiveLocation,
        title: 'You (Rider)',
        description: 'Live GPS Location',
        type: 'rider',
        heading: riderHeading,
        popupHtml: `
          <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 4px; min-width: 160px;">
            <div style="font-weight: 800; font-size: 13px; color: #1c1917;">🛵 You (Rider)</div>
            <div style="font-size: 11px; color: #059669; font-weight: 700; margin-top: 2px;">● Live GPS Tracking Active (${riderHeading}°)</div>
          </div>
        `,
      });
    }

    // 2. All Pickup Stall & Customer Drop Checkpoints
    const usedPositions: [number, number][] = [];

    checkpoints.forEach((cp, index) => {
      const isActive = index === activeStopIndex;
      const isDrop = cp.type === 'drop';
      const stopLetter = cp.id || String.fromCharCode(65 + index); // A, B, C...

      let pos: [number, number] = Array.isArray(cp.position) && cp.position.length >= 2
        ? [Number(cp.position[0]), Number(cp.position[1])]
        : [72.5714, 23.0225];

      // Jitter safeguard: if two checkpoints have identical or very close positions (< 0.0001 deg), offset them so both pins are distinctly visible on the map
      const duplicateCount = usedPositions.filter(p => Math.abs(p[0] - pos[0]) < 0.0001 && Math.abs(p[1] - pos[1]) < 0.0001).length;
      if (duplicateCount > 0) {
        const angle = (duplicateCount * (2 * Math.PI / 3));
        const offset = 0.00045 * duplicateCount;
        pos = [
          Number((pos[0] + Math.cos(angle) * offset).toFixed(6)),
          Number((pos[1] + Math.sin(angle) * offset).toFixed(6)),
        ];
      }
      usedPositions.push(pos);

      list.push({
        id: `stop-${stopLetter.toLowerCase()}-${index}`,
        position: pos,
        title: cp.title || (isDrop ? 'Customer Drop' : 'Pickup Stall'),
        description: cp.desc || '',
        type: isDrop ? 'customer' : 'stall',
        popupHtml: `
          <div style="font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; padding: 4px; max-width: 220px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 3px;">
              <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 2px 6px; border-radius: 6px; background: ${isDrop ? '#D1FAE5' : '#FCE8E6'}; color: ${isDrop ? '#047857' : '#D94A38'};">
                ${isDrop ? `📍 Drop · Stop ${stopLetter}` : `🏪 Stop ${stopLetter} · Pickup`}
              </span>
              ${isActive ? '<span style="font-size: 9px; font-weight: 800; color: #D94A38;">CURRENT TARGET</span>' : ''}
            </div>
            <div style="font-weight: 800; font-size: 13px; color: #1c1917; margin-bottom: 2px;">
              ${stopLetter}. ${cp.title}
            </div>
            <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">${cp.desc || ''}</div>
            <div style="font-size: 11px; font-weight: 700; color: #D94A38;">${cp.amount || ''}</div>
          </div>
        `,
      });
    });

    return list;
  }, [checkpoints, activeStopIndex, riderLiveLocation, riderHeading]);

  const handleNextCheckpoint = async () => {
    if (activeStopIndex < checkpoints.length - 1 && activeRoute) {
      const currentIdx = activeStopIndex;
      const nextIdx = activeStopIndex + 1;
      const targetOrderId = activeRoute.rawId || activeRoute.orderId;

      // Update local storage immediately for instant persistence across reloads
      let localCollected: number[] = [];
      try {
        const raw = localStorage.getItem(`sb_rider_collected_${targetOrderId}`);
        if (raw) localCollected = JSON.parse(raw);
      } catch { }
      if (!localCollected.includes(currentIdx)) {
        localCollected.push(currentIdx);
      }
      try {
        localStorage.setItem(`sb_rider_collected_${targetOrderId}`, JSON.stringify(localCollected));
      } catch { }

      // Update in-memory active route state
      setActiveRoute(prev => {
        if (!prev) return prev;
        const updatedCheckpoints = (prev.checkpoints || []).map((cp, idx) => ({
          ...cp,
          isCollected: localCollected.includes(idx) || cp.isCollected,
        }));
        return {
          ...prev,
          collectedCheckpoints: localCollected,
          checkpoints: updatedCheckpoints,
        };
      });

      setActiveStopIndex(nextIdx);

      try {
        await riderService.collectCheckpoint(
          targetOrderId,
          currentIdx,
          checkpoints.length,
          {
            riderId: user?._id || user?.id,
            email: user?.email,
          }
        );
      } catch (err) {
        console.warn('Failed to sync checkpoint progress to backend:', err);
      }
    }
  };

  const handleMarkAtDoor = async () => {
    if (!activeRoute) return;
    setIsMarkingAtDoor(true);
    try {
      const targetOrderId = activeRoute.rawId || activeRoute.orderId;
      const res = await riderService.markAtDoor(targetOrderId, {
        riderId: user?._id || user?.id,
        email: user?.email,
      });
      if (res && res.success) {
        setIsAtDoor(true);
        speakInstruction('You have arrived at the customer doorstep. Please request the 4-digit Delivery OTP.');
      }
    } catch (err) {
      console.warn('Failed to mark at door:', err);
    } finally {
      setIsMarkingAtDoor(false);
    }
  };

  const handleCompleteDelivery = async () => {
    if (!activeRoute) return;
    if (!enteredOtp.trim()) {
      setOtpError('Please enter the 4-digit OTP provided by customer.');
      return;
    }
    setOtpError(null);
    setIsCompleting(true);

    try {
      const targetOrderId = activeRoute.rawId || activeRoute.orderId;
      const res = await riderService.verifyOtpAndComplete(
        targetOrderId,
        enteredOtp.trim(),
        {
          riderId: user?._id || user?.id,
          email: user?.email,
        }
      );

      if (res && res.success) {
        navigate('/rider/Dashboard/earnings');
      } else {
        setOtpError(res?.message || 'Invalid Delivery OTP. Please verify with customer.');
      }
    } catch (err: any) {
      setOtpError(err.message || 'Verification failed. Please check OTP with customer.');
    } finally {
      setIsCompleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3 bg-white rounded-3xl border border-[#EFEBE4] max-w-5xl mx-auto w-full">
        <Loader2 className="w-10 h-10 text-[#D94A38] animate-spin" />
        <p className="text-sm font-bold text-stone-600">Checking for active delivery assignment...</p>
      </div>
    );
  }

  // When no active delivery order is assigned
  if (!activeRoute || checkpoints.length === 0) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto w-full animate-fadeIn pb-8">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Active Delivery Route</h1>
          <p className="text-sm text-stone-500 mt-1">Live turn-by-turn checkpoints for ongoing orders.</p>
        </div>

        <div className="bg-white border border-[#EFEBE4] rounded-3xl p-16 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
            <Compass className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-lg font-bold text-stone-900">No Active Route In Progress</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              You are not currently delivering an order. Head over to the Order Queue to accept nearby requests from Khau Galli food stalls.
            </p>
          </div>
          <button
            onClick={() => navigate('/rider/Dashboard/queue')}
            className="bg-[#D94A38] hover:bg-[#c43d2e] text-white text-xs font-bold py-3 px-6 rounded-xl transition-all shadow-[0_4px_15px_rgba(217,74,56,0.3)] flex items-center gap-2 cursor-pointer"
          >
            Go to Order Queue <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const mapCenter: [number, number] = riderLiveLocation && Array.isArray(riderLiveLocation) && riderLiveLocation.length === 2
    ? riderLiveLocation
    : (activeCheckpoint && Array.isArray(activeCheckpoint.position) && activeCheckpoint.position.length >= 2
      ? [activeCheckpoint.position[0], activeCheckpoint.position[1]]
      : [72.5873, 23.0242]);

  const mapZoom = isNavigating ? 17.5 : 15;
  const mapPitch = isNavigating ? 55 : 0;
  const mapBearing = isNavigating ? (riderHeading || 0) : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full animate-fadeIn pb-8">
      {/* Top Title & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest block">
            Order · {activeRoute.orderId} · {Math.max(1, checkpoints.length - 1)} Pickups · 1 Drop
          </span>
          <h1 className="text-3xl font-medium text-stone-900 mt-2">
            Route <span className="text-[#D94A38] font-bold">{Math.min(activeStopIndex + 1, checkpoints.length)} of {checkpoints.length} stops</span>
          </h1>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-left md:text-right w-full md:w-auto">
          <div className="bg-white md:bg-transparent p-4 md:p-0 rounded-xl border border-[#EFEBE4] md:border-none shadow-sm md:shadow-none">
            <span className="text-xs text-stone-500 font-bold uppercase tracking-widest block">Payment</span>
            <span className="text-lg font-bold text-stone-900">{activeRoute.paymentMethod}</span>
          </div>
          <div className="bg-white md:bg-transparent p-4 md:p-0 rounded-xl border border-[#EFEBE4] md:border-none shadow-sm md:shadow-none">
            <span className="text-xs text-stone-500 font-bold uppercase tracking-widest block">Earning</span>
            <span className="text-xl font-bold text-[#D94A38]">₹{activeRoute.riderEarnedFee}</span>
          </div>
          {activeRoute.paymentMethod === 'COD' && (
            <div className="bg-white md:bg-transparent p-4 md:p-0 rounded-xl border border-[#EFEBE4] md:border-none shadow-sm md:shadow-none col-span-2 sm:col-span-1">
              <span className="text-xs text-stone-500 font-bold uppercase tracking-widest block">Collect Cash</span>
              <span className="text-xl font-bold text-stone-900">₹{activeRoute.totalAmount}</span>
            </div>
          )}
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Interactive TomTom Map Navigation Area */}
        <div className="lg:col-span-3 bg-white border border-[#EFEBE4] rounded-3xl h-[420px] md:h-[580px] overflow-hidden relative shadow-sm">
          {/* Top Prompt Banner when finding/calculating road route */}
          {isRouting && !isNavigating && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-stone-900/90 backdrop-blur-md text-white text-xs font-bold px-4 py-2 rounded-2xl shadow-xl border border-stone-700/80 flex items-center gap-2.5 animate-fadeIn pointer-events-none">
              <Loader2 className="w-3.5 h-3.5 text-[#D94A38] animate-spin" />
              <span>Calculating road route...</span>
            </div>
          )}

          {/* ─── Google Maps Style Turn-by-Turn Top Navigation HUD ─── */}
          {isNavigating && (
            <div className="absolute top-4 left-4 right-4 z-30 animate-fadeIn">
              <div className="bg-[#054E3B] text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl border border-emerald-500/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-700/80 border border-emerald-400/40 flex items-center justify-center shrink-0 text-white shadow-inner">
                    <Navigation className="w-6 h-6 text-emerald-200" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
                        Stop {activeStopIndex + 1} of {checkpoints.length} · {activeCheckpoint?.type === 'drop' ? 'Customer Delivery' : 'Pickup'}
                      </span>
                      {isRouting && (
                        <span className="text-[10px] text-emerald-200 flex items-center gap-1">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" /> recalculating...
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-white truncate mt-0.5">
                      {activeCheckpoint?.title}
                    </h3>
                    <p className="text-[11px] text-emerald-100/80 truncate mt-0.5">
                      {activeCheckpoint?.dist || activeCheckpoint?.desc || 'Follow road highlights'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsVoiceMuted(!isVoiceMuted)}
                    title={isVoiceMuted ? 'Unmute Voice Guidance' : 'Mute Voice Guidance'}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer border ${isVoiceMuted
                      ? 'bg-emerald-900/80 border-emerald-700 text-emerald-400'
                      : 'bg-emerald-600 border-emerald-400 text-white'
                      }`}
                  >
                    {isVoiceMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={handleStopNavigation}
                    className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <X className="w-4 h-4" />
                    <span>Exit</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <TomTomMap
            center={mapCenter}
            zoom={mapZoom}
            pitch={mapPitch}
            bearing={mapBearing}
            markers={routeMarkers}
            routeCoordinates={
              routeResult && routeResult.coordinates && routeResult.coordinates.length > checkpoints.length
                ? routeResult.coordinates
                : undefined
            }
            className="w-full h-full rounded-3xl overflow-hidden relative"
          />

          {/* Floating Re-center to Rider Button */}
          {isNavigating && riderLiveLocation && (
            <button
              type="button"
              onClick={() => {
                setRiderLiveLocation([...riderLiveLocation]);
              }}
              className="absolute bottom-20 right-4 z-20 w-11 h-11 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-stone-200 flex items-center justify-center text-stone-700 hover:text-emerald-700 hover:scale-105 transition-all cursor-pointer"
              title="Re-center on Rider"
            >
              <LocateFixed className="w-5 h-5 text-emerald-600" />
            </button>
          )}

          {/* Bottom Navigation Target & Start Navigation Bar */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10 gap-2">
            {riderLiveLocation ? (
              <div className="bg-emerald-950/90 backdrop-blur-md text-emerald-300 text-[11px] font-bold px-3 py-2 rounded-xl shadow-lg flex items-center gap-2 border border-emerald-800 pointer-events-auto">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Live GPS Active</span>
              </div>
            ) : (
              <div className="bg-stone-900/80 backdrop-blur-md text-stone-300 text-[11px] font-medium px-3 py-2 rounded-xl shadow-lg flex items-center gap-2 border border-stone-800 pointer-events-auto">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>Locating Rider GPS...</span>
              </div>
            )}

            {!isNavigating ? (
              <div className="flex items-center gap-2 pointer-events-auto">
                <div className="bg-stone-900/90 backdrop-blur-md text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-lg flex items-center gap-2 border border-stone-800 hidden sm:flex">
                  <Navigation className="w-3.5 h-3.5 text-[#D94A38]" />
                  <span>Next: {activeCheckpoint?.title || 'Stop'}</span>
                </div>

                <button
                  type="button"
                  onClick={handleStartNavigation}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Start Navigation</span>
                </button>
              </div>
            ) : (
              <div className="bg-emerald-950/95 backdrop-blur-md text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-xl border border-emerald-700/80 flex items-center gap-2 pointer-events-auto">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>3D Navigation Active</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Checkpoints */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="tour-checkpoints bg-white border border-[#EFEBE4] rounded-3xl p-6 flex-1 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-medium text-stone-900">Checkpoints</h3>
              <span className="text-xs text-stone-500 uppercase font-bold text-right">
                {checkpoints.length} STOPS
              </span>
            </div>

            <div className="space-y-4">
              {checkpoints.map((cp, index) => {
                const isDone = index < activeStopIndex;
                const isActive = index === activeStopIndex;

                if (isDone) {
                  return (
                    <div key={cp.id} className="bg-[#FAF7F2] border border-[#EFEBE4] rounded-2xl p-4 flex gap-4 opacity-60 transition-all">
                      <div className="w-8 h-8 rounded-full bg-stone-200 text-stone-500 flex items-center justify-center font-bold text-sm shrink-0">{cp.id}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between gap-2">
                          <div>
                            <h4 className="text-stone-900 font-bold text-sm">{cp.title}</h4>
                            <span className="text-xs text-stone-500">{cp.desc}</span>
                          </div>
                          <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-2 py-1 rounded-lg shrink-0">
                            {cp.type === 'drop' ? 'Delivered' : 'Collected'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (isActive) {
                  return (
                    <div key={cp.id} className="bg-white border-2 border-[#D94A38] rounded-2xl p-4 flex gap-4 shadow-sm transition-all">
                      <div className="w-8 h-8 rounded-full bg-[#D94A38] text-white flex items-center justify-center font-bold text-sm shrink-0">{cp.id}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between gap-2">
                          <div>
                            <h4 className="text-stone-900 font-bold text-sm">{cp.title}</h4>
                            <span className="text-xs text-stone-500">{cp.desc}</span>
                          </div>
                          <span className="bg-[#FCE8E6] text-[#D94A38] text-xs font-bold px-2 py-1 rounded-lg shrink-0">
                            {cp.type === 'drop' ? 'Next Drop' : 'Next Pickup'}
                          </span>
                        </div>
                        <div className="mt-2 flex justify-between text-xs font-medium">
                          <span className="text-stone-500">{cp.dist}</span>
                          <span className="text-[#D94A38] font-bold">{cp.amount}</span>
                        </div>

                        {cp.type === 'pickup' ? (
                          cp.isReady || cp.status === 'READY' ? (
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>Food is ready for pickup!</span>
                              </div>
                              <button
                                onClick={handleNextCheckpoint}
                                className="w-full bg-[#D94A38] hover:bg-[#c33f2e] text-white text-xs font-bold py-2.5 rounded-xl transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-2"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                Mark Collected & Proceed
                              </button>
                            </div>
                          ) : (
                            <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200/90 flex items-center justify-between text-xs animate-fadeIn">
                              <div className="flex items-center gap-2 text-amber-900 font-bold">
                                <Clock className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
                                <span>Item not prepared (Cooking in progress)</span>
                              </div>
                              <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-300 shrink-0">
                                Awaiting Vendor
                              </span>
                            </div>
                          )
                        ) : (
                          <div className="mt-4 space-y-3 border-t border-stone-100 pt-3">
                            {/* At Doorstep Milestone Button / Status */}
                            {isAtDoor ? (
                              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs animate-fadeIn">
                                <div className="flex items-center gap-2 text-emerald-900 font-bold">
                                  <Home className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <span>You are at Customer Doorstep</span>
                                </div>
                                <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300 shrink-0">
                                  Customer Notified
                                </span>
                              </div>
                            ) : (
                              <button
                                onClick={handleMarkAtDoor}
                                disabled={isMarkingAtDoor}
                                className="w-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                              >
                                {isMarkingAtDoor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                                I'm at Customer Doorstep (Notify Customer)
                              </button>
                            )}

                            <div>
                              <label className="text-[11px] font-bold text-stone-700 block mb-1">
                                Ask Customer for 4-Digit Delivery OTP
                              </label>
                              <input
                                type="text"
                                maxLength={6}
                                placeholder="Enter OTP"
                                value={enteredOtp}
                                onChange={(e) => setEnteredOtp(e.target.value)}
                                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-center tracking-widest font-mono font-bold text-base focus:border-[#D94A38] focus:outline-none bg-stone-50/50"
                              />
                            </div>
                            {otpError && (
                              <p className="text-[10px] text-red-600 font-bold">{otpError}</p>
                            )}
                            <button
                              onClick={handleCompleteDelivery}
                              disabled={isCompleting}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                            >
                              {isCompleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                              Verify OTP & Complete Delivery
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                const isPickupPending = cp.type === 'pickup';
                const isReadyPending = cp.isReady || cp.status === 'READY';

                return (
                  <div key={cp.id} className="bg-white border border-[#EFEBE4] rounded-2xl p-4 flex gap-4 opacity-75">
                    <div className="w-8 h-8 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center font-bold text-sm shrink-0">{cp.id}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-2">
                        <div>
                          <h4 className="text-stone-900 font-bold text-sm">{cp.title}</h4>
                          <span className="text-xs text-stone-500 block">{cp.desc}</span>
                          {cp.dist && <span className="text-[11px] text-stone-400 block mt-0.5">{cp.dist}</span>}
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg shrink-0 border ${isPickupPending && isReadyPending
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-stone-100 text-stone-600 border-stone-200'
                          }`}>
                          {isPickupPending && isReadyPending ? 'Food Ready' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiderRoute;
