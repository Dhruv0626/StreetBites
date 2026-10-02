import React, { useEffect, useRef, useState } from 'react';

import {
  TOMTOM_API_KEY,
  isTomTomApiKeyConfigured,
  MAP_CONFIG_DEFAULTS,
} from '../../config/tomtom';
import { type TomTomMapProps, type MapMarker } from '../../types/map';

/**
 * Reusable TomTom Map Component for StreetBites
 * 
 * FRONTEND MAP UI RESPONSIBILITY:
 * - Dynamically loads official TomTom SDK (CDN script & stylesheet) to guarantee zero build errors.
 * - Renders the authentic, complete TomTom Map with all native map features, area names, places, and labels intact.
 * - Supports custom markers, popups, and clean navigation controls.
 */
export const TomTomMap: React.FC<TomTomMapProps> = ({
  center = MAP_CONFIG_DEFAULTS.center,
  zoom = MAP_CONFIG_DEFAULTS.zoom,
  pitch = 0,
  bearing = 0,
  markers = [],
  routeCoordinates,
  className = 'w-full h-[450px] rounded-2xl overflow-hidden shadow-sm border border-[#EFEBE4] relative',
  onMapClick,
  onMapLoaded,
  onZoomChange,
  showControls = true,
  showMarkers = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any | null>(null);
  const isInitializedRef = useRef<boolean>(false);
  const markerMapRef = useRef<Map<string, any>>(new Map());

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState<boolean>(false);

  const apiKeyValid = isTomTomApiKeyConfigured();

  // ── 1. Dynamically Load Official TomTom SDK Script & Stylesheet ──────────────
  useEffect(() => {
    // Check if TomTom SDK is already available on window
    if ((window as any).tt && (window as any).tt.map) {
      setSdkReady(true);
      return;
    }

    // Inject CSS stylesheet
    const cssId = 'tomtom-maps-css-cdn';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = 'https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps.css';
      document.head.appendChild(link);
    }

    // Inject JS SDK Script (Maps SDK)
    const scriptId = 'tomtom-maps-js-cdn';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps-web.min.js';
      script.async = true;
      script.onload = () => {
        // After maps-web loads, also load services-web for routing & geocoding services
        const servicesScriptId = 'tomtom-services-js-cdn';
        if (!document.getElementById(servicesScriptId)) {
          const sScript = document.createElement('script');
          sScript.id = servicesScriptId;
          sScript.src = 'https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/services/services-web.min.js';
          sScript.async = true;
          document.body.appendChild(sScript);
        }
        setSdkReady(true);
      };
      script.onerror = () => {
        setErrorMessage('Failed to load TomTom Maps SDK script. Please check your network connection.');
        setIsLoading(false);
      };
      document.body.appendChild(script);
    } else {
      const existingScript = document.getElementById(scriptId) as HTMLScriptElement;
      if (existingScript) {
        existingScript.addEventListener('load', () => setSdkReady(true));
      }
    }
  }, []);

  // ── 2. Map Canvas Initialization & StrictMode Protection ─────────────────────
  useEffect(() => {
    if (!apiKeyValid || !sdkReady) {
      if (!apiKeyValid) setIsLoading(false);
      return;
    }

    const ttSDK = (window as any).tt;
    if (!ttSDK || !ttSDK.map) return;

    // Prevent duplicate map creation in React StrictMode / Development re-renders
    if (isInitializedRef.current || !mapContainerRef.current) {
      return;
    }

    isInitializedRef.current = true;

    try {
      setIsLoading(true);
      setErrorMessage(null);

      // Initialize TomTom Map instance centered at specified coordinates (default: Ahmedabad)
      const map = ttSDK.map({
        key: TOMTOM_API_KEY,
        container: mapContainerRef.current,
        center: center,
        zoom: zoom,
        pitch: pitch,
        bearing: bearing,
        language: MAP_CONFIG_DEFAULTS.language,
      });

      mapInstanceRef.current = map;

      // Add clean navigation controls
      if (showControls && ttSDK.NavigationControl) {
        map.addControl(
          new ttSDK.NavigationControl({
            showCompass: false,
            showPitch: false,
          }),
          'top-right'
        );
      }

      // Handle map load completion
      map.on('load', () => {
        setIsLoading(false);
        if (onMapLoaded) {
          onMapLoaded(map);
        }
      });

      // Handle user clicks on map canvas
      map.on('click', (e: any) => {
        if (onMapClick && e.lngLat) {
          onMapClick([e.lngLat.lng, e.lngLat.lat]);
        }
      });

      // Handle zoom changes to notify parent component for dynamic Level of Detail (only on zoomend to prevent jitter)
      map.on('zoomend', () => {
        if (onZoomChange) {
          onZoomChange(map.getZoom());
        }
      });

      // Handle load errors
      map.on('error', (e: any) => {
        console.error('TomTom Map Error:', e);
        if (e && e.error && e.error.status === 403) {
          setErrorMessage('Invalid TomTom API Key. Please check VITE_TOMTOM_API_KEY in your .env file.');
        } else {
          setErrorMessage('Failed to load TomTom Map tiles. Please check your internet connection.');
        }
        setIsLoading(false);
      });
    } catch (err: any) {
      console.error('TomTom Initialization Error:', err);
      setErrorMessage(err?.message || 'Error initializing TomTom Map component.');
      setIsLoading(false);
    }

    // Clean up map instance on component unmount
    return () => {
      if (mapInstanceRef.current) {
        // Remove existing markers
        markerMapRef.current.forEach((marker) => marker.remove());
        markerMapRef.current.clear();

        // Destroy map instance
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        isInitializedRef.current = false;
      }
    };
  }, [sdkReady, apiKeyValid]);

  // ── 3. Dynamic Center / Zoom / Pitch / Bearing Updates ────────────────────────
  const lastPropCenterRef = useRef<[number, number]>([center[0], center[1]]);
  const lastPropZoomRef = useRef<number>(zoom);
  const lastPropPitchRef = useRef<number>(pitch);
  const lastPropBearingRef = useRef<number>(bearing);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !center) return;

    const centerChanged =
      !lastPropCenterRef.current ||
      Math.abs(lastPropCenterRef.current[0] - center[0]) > 0.00005 ||
      Math.abs(lastPropCenterRef.current[1] - center[1]) > 0.00005;

    const zoomChanged =
      lastPropZoomRef.current === undefined ||
      Math.abs(lastPropZoomRef.current - zoom) > 0.1;

    const pitchChanged =
      lastPropPitchRef.current === undefined ||
      Math.abs((lastPropPitchRef.current || 0) - (pitch || 0)) > 1;

    const bearingChanged =
      lastPropBearingRef.current === undefined ||
      Math.abs((lastPropBearingRef.current || 0) - (bearing || 0)) > 2;

    if (centerChanged || zoomChanged || pitchChanged || bearingChanged) {
      lastPropCenterRef.current = [center[0], center[1]];
      lastPropZoomRef.current = zoom;
      lastPropPitchRef.current = pitch;
      lastPropBearingRef.current = bearing;

      try {
        map.easeTo({
          center: center,
          zoom: zoom,
          pitch: pitch !== undefined ? pitch : 0,
          bearing: bearing !== undefined ? bearing : 0,
          duration: 500,
        });
      } catch (err) {
        console.warn('TomTom easeTo error:', err);
      }
    }
  }, [center?.[0], center?.[1], zoom, pitch, bearing]);

  // ── 4. Marker Synchronization & Smooth Animation Updates ─────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    const ttSDK = (window as any).tt;
    if (!map || !apiKeyValid || !ttSDK) return;

    if (!showMarkers || !markers || markers.length === 0) {
      markerMapRef.current.forEach((marker) => marker.remove());
      markerMapRef.current.clear();
      return;
    }

    const currentMarkerIds = new Set<string>();

    // Add or update markers on the map
    markers.forEach((markerData) => {
      currentMarkerIds.add(markerData.id);

      const existingMarker = markerMapRef.current.get(markerData.id);

      if (existingMarker) {
        existingMarker.setLngLat(markerData.position);
        const markerEl = existingMarker.getElement();
        if (markerEl) {
          markerEl.className = getMarkerElementClass(markerData.type);
          applyMarkerElementDimensions(markerEl, markerData.type);
          markerEl.innerHTML = getMarkerIconHtml(markerData.type, markerData.title, markerData.id, markerData.heading);
        }
        if (markerData.type === 'rider' && typeof markerData.heading === 'number') {
          const arrowEl = existingMarker.getElement()?.querySelector('.navigator-arrow-graphic') as HTMLElement;
          if (arrowEl) {
            arrowEl.style.transform = `rotate(${markerData.heading}deg)`;
          }
        }
      } else {
        const markerEl = document.createElement('div');
        markerEl.className = getMarkerElementClass(markerData.type);
        applyMarkerElementDimensions(markerEl, markerData.type);
        markerEl.innerHTML = getMarkerIconHtml(markerData.type, markerData.title, markerData.id, markerData.heading);

        const isBottomAnchored = markerData.type === 'cluster' || markerData.type === 'stall' || markerData.type === 'customer';
        const markerInstance = new ttSDK.Marker({
          element: markerEl,
          anchor: isBottomAnchored ? 'bottom' : 'center',
        }).setLngLat(markerData.position);

        const popupHtml = markerData.popupHtml || createDefaultPopupHtml(markerData);
        if (popupHtml && ttSDK.Popup) {
          const popup = new ttSDK.Popup({
            offset: isBottomAnchored ? [0, -44] : [0, -24],
            closeButton: true,
            closeOnClick: false,
            className: 'streetbites-tomtom-popup',
          }).setHTML(popupHtml);

          markerInstance.setPopup(popup);
        }

        markerEl.addEventListener('click', () => {
          if (markerData.onClick) {
            markerData.onClick(markerData.id);
          }
        });

        markerInstance.addTo(map);
        markerMapRef.current.set(markerData.id, markerInstance);
      }
    });

    // Remove markers that are no longer in the props list
    markerMapRef.current.forEach((marker, id) => {
      if (!currentMarkerIds.has(id)) {
        marker.remove();
        markerMapRef.current.delete(id);
      }
    });
  }, [markers, apiKeyValid, sdkReady, showMarkers]);

  // ── 5. Route Polyline Synchronization & Dynamic Bounds Fitting ────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    const ttSDK = (window as any).tt;
    if (!map || !apiKeyValid || !sdkReady || !ttSDK) return;

    const sourceId = 'streetbites-route-source';
    const casingLayerId = 'streetbites-route-casing';
    const lineLayerId = 'streetbites-route-line';

    const clearRouteLayers = () => {
      try {
        if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
        if (map.getLayer(casingLayerId)) map.removeLayer(casingLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {
        // Ignored if layer didn't exist
      }
    };

    if (!routeCoordinates || routeCoordinates.length < 2) {
      clearRouteLayers();
      return;
    }

    const geojsonData: any = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: routeCoordinates,
      },
      properties: {},
    };

    const drawRoute = () => {
      try {
        if (map.getSource(sourceId)) {
          map.getSource(sourceId).setData(geojsonData);
        } else {
          map.addSource(sourceId, {
            type: 'geojson',
            data: geojsonData,
          });

          // Route outer casing / glow
          map.addLayer({
            id: casingLayerId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': '#FFFFFF',
              'line-width': 7,
              'line-opacity': 0.9,
            },
            layout: {
              'line-cap': 'round',
              'line-join': 'round',
            },
          });

          // Route inner line (StreetBites Brand Red)
          map.addLayer({
            id: lineLayerId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': '#E54B3C',
              'line-width': 4.5,
              'line-opacity': 0.95,
            },
            layout: {
              'line-cap': 'round',
              'line-join': 'round',
            },
          });
        }

        // Auto-fit map bounds to encompass the route
        if (ttSDK.LngLatBounds && routeCoordinates.length > 0) {
          const bounds = new ttSDK.LngLatBounds();
          routeCoordinates.forEach((pt) => bounds.extend(pt));
          map.fitBounds(bounds, { padding: 50, maxZoom: 16, duration: 600 });
        }
      } catch (err) {
        console.warn('TomTom route draw error:', err);
      }
    };

    const isReady = (typeof map.isStyleLoaded === 'function' && map.isStyleLoaded()) || (typeof map.loaded === 'function' && map.loaded());
    if (isReady) {
      drawRoute();
    } else {
      map.once('load', drawRoute);
    }
  }, [routeCoordinates, apiKeyValid, sdkReady]);

  // ── Render Fallback Banner if TomTom API Key is missing ──────────────────────
  if (!apiKeyValid) {
    return (
      <div className={`${className} bg-stone-100 flex items-center justify-center p-6 text-center border-2 border-dashed border-amber-300`}>
        <div className="max-w-md bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3 text-xl font-bold">
            🗺️
          </div>
          <h3 className="font-bold text-stone-900 text-base mb-1">
            TomTom Maps API Key Required
          </h3>
          <p className="text-xs text-stone-600 mb-4 relaxed">
            Please add your TomTom API key to <code className="bg-stone-100 px-1.5 py-0.5 rounded text-amber-800 font-mono">.env</code> as <code className="bg-stone-100 px-1.5 py-0.5 rounded text-amber-800 font-mono">VITE_TOMTOM_API_KEY</code>.
          </p>
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-[11px] font-mono text-stone-700 text-left overflow-x-auto">
            VITE_TOMTOM_API_KEY=your_tomtom_api_key
          </div>
          <p className="text-[10px] text-stone-500 mt-3">
            Get a free API key at <a href="https://developer.tomtom.com/" target="_blank" rel="noreferrer" className="text-[#D94A38] font-bold underline">developer.tomtom.com</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Dynamic Keyframes & Map Custom Styles */}
      <style>{`
        @keyframes clusterPulseRipple {
          0% {
            transform: scale(0.6);
            opacity: 0.9;
          }
          70% {
            transform: scale(2.6);
            opacity: 0;
          }
          100% {
            transform: scale(2.8);
            opacity: 0;
          }
        }
        @keyframes clusterTagBounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }
        .streetbites-cluster-pin:hover .cluster-pin-graphic {
          transform: translateY(-8px) scale(1.12);
        }
        .streetbites-cluster-pin:hover .cluster-name-tag {
          transform: translateY(-8px) scale(1.06);
          background: rgba(217, 74, 56, 0.96) !important;
          border-color: rgba(255, 255, 255, 0.6) !important;
        }
        .streetbites-tomtom-popup .mapboxgl-popup-content,
        .streetbites-tomtom-popup .tt-popup-content {
          border-radius: 18px !important;
          padding: 12px 14px !important;
          box-shadow: 0 14px 34px rgba(0,0,0,0.18), 0 4px 10px rgba(0,0,0,0.08) !important;
          border: 1px solid #EAE4DA !important;
          background: #FFFFFF !important;
        }
        .streetbites-tomtom-popup .mapboxgl-popup-tip,
        .streetbites-tomtom-popup .tt-popup-tip {
          border-top-color: #FFFFFF !important;
        }
      `}</style>

      {/* TomTom Map Container Div */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-stone-50/80 backdrop-blur-xs flex items-center justify-center z-10">
          <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-full shadow-md border border-stone-200">
            <div className="w-4 h-4 border-2 border-[#D94A38] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-stone-700">Loading Map...</span>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {errorMessage && (
        <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-20">
          <div className="bg-white p-5 rounded-2xl max-w-sm text-center shadow-lg border border-red-200">
            <div className="text-red-500 font-bold text-lg mb-1">Map Error</div>
            <p className="text-xs text-stone-600 mb-3">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-1.5 bg-[#D94A38] text-white text-xs font-bold rounded-xl hover:bg-[#c33f2e] transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── HELPER FUNCTIONS FOR ATTRACTIVE & MEANINGFUL MARKER STYLING ─────────────────

function applyMarkerElementDimensions(el: HTMLElement, type?: string) {
  el.style.position = 'relative';
  el.style.willChange = 'transform';
  el.style.transition = 'none'; // Critical: ensures pan/zoom GPU matrix updates are instantaneous without subpixel drift
  el.style.overflow = 'visible';
  el.style.pointerEvents = 'auto';

  if (type === 'cluster') {
    el.style.width = '44px';
    el.style.height = '54px';
  } else if (type === 'stall' || type === 'customer') {
    el.style.width = '36px';
    el.style.height = '44px';
  } else if (type === 'rider') {
    el.style.width = '42px';
    el.style.height = '42px';
  } else {
    el.style.width = '28px';
    el.style.height = '28px';
  }
}

function getMarkerElementClass(type?: string): string {
  if (type === 'cluster') {
    return 'streetbites-cluster-marker-root cursor-pointer z-30 select-none';
  }
  if (type === 'stall') {
    return 'streetbites-stall-marker-root cursor-pointer z-25 select-none';
  }
  if (type === 'customer') {
    return 'streetbites-customer-marker-root cursor-pointer z-28 select-none';
  }
  if (type === 'rider') {
    return 'streetbites-rider-marker-root cursor-pointer z-35 select-none';
  }

  return 'cursor-pointer flex items-center justify-center shadow-md border-2 border-white w-7 h-7 rounded-full bg-[#1C1917] text-white z-10';
}

function getMarkerIconHtml(type?: string, title?: string, id?: string, heading: number = 0): string {
  const safeId = (id || 'pin').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeTitle = escapeHtml(title || 'Point');

  // Extract checkpoint letter (e.g. A, B, C) if available in id or title
  let checkpointLetter = '';
  if (id) {
    const match = id.match(/stop-([a-zA-Z0-9]+)/i);
    if (match) {
      checkpointLetter = match[1].toUpperCase();
    } else if (id.length <= 2 && /^[a-zA-Z0-9]+$/.test(id)) {
      checkpointLetter = id.toUpperCase();
    }
  }

  // Attractive, Rich & Meaningful Cluster / Khau Galli Food Hub Pin
  if (type === 'cluster') {
    return `
      <div class="streetbites-cluster-pin" style="position: relative; width: 44px; height: 54px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; cursor: pointer; pointer-events: auto;">
        
        <!-- Floating Mini Name Label Pill (Offset from top, doesn't interfere with bottom anchor point) -->
        <div class="cluster-name-tag" style="position: absolute; bottom: 58px; left: 50%; transform: translateX(-50%); white-space: nowrap; background: rgba(28, 25, 23, 0.94); backdrop-filter: blur(8px); color: #FFF; font-size: 11px; font-weight: 800; font-family: 'Plus Jakarta Sans', sans-serif; padding: 4px 10px; border-radius: 9999px; border: 1.5px solid rgba(255,255,255,0.3); box-shadow: 0 6px 16px rgba(0,0,0,0.35); pointer-events: none; display: flex; align-items: center; gap: 6px; z-index: 30;">
          <span style="width: 7px; height: 7px; border-radius: 50%; background: #22C55E; display: inline-block; box-shadow: 0 0 8px #22C55E; flex-shrink: 0;"></span>
          <span style="max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${safeTitle}</span>
        </div>

        <!-- 3D Elevated Teardrop Pin Graphic with Authentic Khau Galli Food Hub Emblem -->
        <div class="cluster-pin-graphic" style="position: relative; width: 44px; height: 54px; filter: drop-shadow(0 10px 18px rgba(217, 74, 56, 0.55)) drop-shadow(0 2px 5px rgba(0,0,0,0.25)); pointer-events: auto;">
          <svg width="44" height="54" viewBox="0 0 44 54" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block;">
            <defs>
              <linearGradient id="clusterGrad-${safeId}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#FF5722" />
                <stop offset="55%" stop-color="#D94A38" />
                <stop offset="100%" stop-color="#9C1C0D" />
              </linearGradient>
              <linearGradient id="goldAccent-${safeId}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#FFF176" />
                <stop offset="100%" stop-color="#FFB300" />
              </linearGradient>
              <radialGradient id="innerGlow-${safeId}" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.45" />
                <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
              </radialGradient>
            </defs>

            <path d="M22 0C9.85 0 0 9.85 0 22C0 35.8 18.6 51.6 21.2 53.7C21.66 54.1 22.34 54.1 22.8 53.7C25.4 51.6 44 35.8 44 22C44 9.85 34.15 0 22 0Z" fill="url(#clusterGrad-${safeId})" stroke="#FFFFFF" stroke-width="2.6" />
            <ellipse cx="22" cy="14" rx="15" ry="8" fill="url(#innerGlow-${safeId})" />
            <circle cx="22" cy="20" r="14.5" fill="#1C1917" fill-opacity="0.22" stroke="#FFFFFF" stroke-width="1.2" />

            <path d="M12 15.5L14.5 10H29.5L32 15.5H12Z" fill="url(#goldAccent-${safeId})" stroke="#FFFFFF" stroke-width="0.8" stroke-linejoin="round"/>
            <path d="M17 10L16 15.5M22 10V15.5M27 10L28 15.5" stroke="#D94A38" stroke-width="0.9" stroke-linecap="round"/>
            <path d="M12 15.5C13.2 16.6 14.8 16.6 16 15.5C17.2 16.6 18.8 16.6 20 15.5C21.2 16.6 22.8 16.6 24 15.5C25.2 16.6 26.8 16.6 28 15.5C29.2 16.6 30.8 16.6 32 15.5" stroke="#FFFFFF" stroke-width="1" stroke-linecap="round" fill="none"/>
            <path d="M14 17.5V26.5C14 27.3 14.7 28 15.5 28H28.5C29.3 28 30 27.3 30 26.5V17.5" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round" fill="rgba(255,255,255,0.15)"/>
            <rect x="17" y="20.5" width="10" height="4.5" rx="1" fill="#FFFFFF" fill-opacity="0.85" />
            <path d="M18.5 8C18.5 8 19.5 6.5 18.8 5.5" stroke="#FFF176" stroke-width="1.2" stroke-linecap="round"/>
            <path d="M22 7.5C22 7.5 23.5 6 22.5 4.5" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round"/>
            <path d="M25.5 8C25.5 8 26.5 6.5 25.8 5.5" stroke="#FFF176" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
        </div>

        <div class="cluster-ground-ripple" style="position: absolute; bottom: 0px; left: 50%; transform: translateX(-50%); width: 26px; height: 9px; border-radius: 50%; background: radial-gradient(ellipse at center, rgba(217, 74, 56, 0.75) 0%, rgba(217, 74, 56, 0) 75%); animation: clusterPulseRipple 2.2s ease-out infinite; pointer-events: none; z-index: 5;"></div>
      </div>
    `;
  }

  // Dedicated Food Stall Pin with Canopy Logo & Mini Floating Stall Name & Stop Badge
  if (type === 'stall') {
    return `
      <div class="streetbites-stall-pin" style="position: relative; width: 36px; height: 44px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; cursor: pointer; pointer-events: auto;">
        
        <div class="stall-name-tag" style="position: absolute; bottom: 48px; left: 50%; transform: translateX(-50%); white-space: nowrap; background: rgba(28, 25, 23, 0.95); backdrop-filter: blur(6px); color: #FFF; font-size: 10px; font-weight: 700; font-family: 'Plus Jakarta Sans', sans-serif; padding: 3px 8px; border-radius: 9999px; border: 1px solid rgba(255,255,255,0.25); box-shadow: 0 4px 12px rgba(0,0,0,0.3); pointer-events: none; display: flex; align-items: center; gap: 5px; z-index: 25;">
          ${checkpointLetter ? `<span style="background: #D94A38; color: #FFF; font-size: 9px; font-weight: 800; border-radius: 4px; padding: 0px 4px; min-width: 14px; text-align: center;">${checkpointLetter}</span>` : `<span style="width: 6px; height: 6px; border-radius: 50%; background: #22C55E; display: inline-block; box-shadow: 0 0 6px #22C55E; flex-shrink: 0;"></span>`}
          <span style="max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${safeTitle}</span>
        </div>

        <div class="stall-pin-graphic" style="position: relative; width: 36px; height: 44px; filter: drop-shadow(0 6px 12px rgba(217, 74, 56, 0.45)); pointer-events: auto;">
          <svg width="36" height="44" viewBox="0 0 44 54" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block;">
            <defs>
              <linearGradient id="stallGrad-${safeId}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#FF7043" />
                <stop offset="100%" stop-color="#D94A38" />
              </linearGradient>
            </defs>
            <path d="M22 0C9.85 0 0 9.85 0 22C0 35.8 18.6 51.6 21.2 53.7C21.66 54.1 22.34 54.1 22.8 53.7C25.4 51.6 44 35.8 44 22C44 9.85 34.15 0 22 0Z" fill="url(#stallGrad-${safeId})" stroke="#FFFFFF" stroke-width="2.6" />
            <circle cx="22" cy="20" r="13" fill="#FFFFFF" fill-opacity="0.25" />
            
            ${checkpointLetter ? `
              <circle cx="22" cy="20" r="11" fill="#FFFFFF" />
              <text x="22" y="24.5" font-family="'Plus Jakarta Sans', -apple-system, sans-serif" font-weight="900" font-size="13" fill="#D94A38" text-anchor="middle">${checkpointLetter}</text>
            ` : `
              <path d="M13 14H31L29 23H15L13 14Z" fill="#FFFFFF" />
              <path d="M15 23V27H29V23" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" />
              <rect x="19" y="20" width="6" height="5" fill="#D94A38" rx="0.5" />
            `}
          </svg>
        </div>
      </div>
    `;
  }

  // Dedicated Customer Delivery Drop Location Pin with Emerald Theme
  if (type === 'customer') {
    return `
      <div class="streetbites-customer-pin" style="position: relative; width: 36px; height: 44px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; cursor: pointer; pointer-events: auto;">
        
        <div class="customer-name-tag" style="position: absolute; bottom: 48px; left: 50%; transform: translateX(-50%); white-space: nowrap; background: rgba(6, 78, 59, 0.95); backdrop-filter: blur(6px); color: #FFF; font-size: 10px; font-weight: 700; font-family: 'Plus Jakarta Sans', sans-serif; padding: 3px 8px; border-radius: 9999px; border: 1px solid rgba(255,255,255,0.3); box-shadow: 0 4px 12px rgba(0,0,0,0.3); pointer-events: none; display: flex; align-items: center; gap: 5px; z-index: 28;">
          ${checkpointLetter ? `<span style="background: #059669; color: #FFF; font-size: 9px; font-weight: 800; border-radius: 4px; padding: 0px 4px; min-width: 14px; text-align: center;">${checkpointLetter}</span>` : `<span style="width: 6px; height: 6px; border-radius: 50%; background: #34D399; display: inline-block; box-shadow: 0 0 6px #34D399; flex-shrink: 0;"></span>`}
          <span style="max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${safeTitle}</span>
        </div>

        <div class="customer-pin-graphic" style="position: relative; width: 36px; height: 44px; filter: drop-shadow(0 6px 12px rgba(5, 150, 105, 0.45)); pointer-events: auto;">
          <svg width="36" height="44" viewBox="0 0 44 54" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block;">
            <defs>
              <linearGradient id="customerGrad-${safeId}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#34D399" />
                <stop offset="60%" stop-color="#059669" />
                <stop offset="100%" stop-color="#064E3B" />
              </linearGradient>
            </defs>
            <path d="M22 0C9.85 0 0 9.85 0 22C0 35.8 18.6 51.6 21.2 53.7C21.66 54.1 22.34 54.1 22.8 53.7C25.4 51.6 44 35.8 44 22C44 9.85 34.15 0 22 0Z" fill="url(#customerGrad-${safeId})" stroke="#FFFFFF" stroke-width="2.6" />
            <circle cx="22" cy="20" r="13" fill="#FFFFFF" fill-opacity="0.22" />
            
            ${checkpointLetter ? `
              <circle cx="22" cy="20" r="11" fill="#FFFFFF" />
              <text x="22" y="24.5" font-family="'Plus Jakarta Sans', -apple-system, sans-serif" font-weight="900" font-size="13" fill="#059669" text-anchor="middle">${checkpointLetter}</text>
            ` : `
              <!-- Destination Pin Icon -->
              <path d="M22 12C18.13 12 15 15.13 15 19C15 24.25 22 30 22 30C22 30 29 24.25 29 19C29 15.13 25.87 12 22 12ZM22 21.5C20.62 21.5 19.5 20.38 19.5 19C19.5 17.62 20.62 16.5 22 16.5C23.38 16.5 24.5 17.62 24.5 19C24.5 20.38 23.38 21.5 22 21.5Z" fill="#FFFFFF" />
            `}
          </svg>
        </div>

        <div class="customer-ground-ripple" style="position: absolute; bottom: 0px; left: 50%; transform: translateX(-50%); width: 22px; height: 7px; border-radius: 50%; background: radial-gradient(ellipse at center, rgba(5, 150, 105, 0.75) 0%, rgba(5, 150, 105, 0) 75%); animation: clusterPulseRipple 2s ease-out infinite; pointer-events: none; z-index: 5;"></div>
      </div>
    `;
  }

  // Dedicated Live Rider Navigation Direction Arrow Puck
  if (type === 'rider') {
    const deg = typeof heading === 'number' && !isNaN(heading) ? heading : 0;
    return `
      <div class="streetbites-rider-nav-puck" style="position: relative; width: 42px; height: 42px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer;">
        
        <!-- 3D Glowing Navigation Direction Arrow Puck with Dynamic Heading Rotation -->
        <div class="navigator-arrow-graphic" style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; transform-origin: center center; filter: drop-shadow(0 4px 14px rgba(2, 132, 199, 0.65)); transform: rotate(${deg}deg); transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);">
          <svg width="42" height="42" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block;">
            <defs>
              <linearGradient id="navPuckGrad-${safeId}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#38BDF8" />
                <stop offset="50%" stop-color="#0284C7" />
                <stop offset="100%" stop-color="#1E40AF" />
              </linearGradient>
              <radialGradient id="navPuckGlow-${safeId}" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.4" />
                <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
              </radialGradient>
            </defs>

            <!-- Outer Shield Ring -->
            <circle cx="22" cy="22" r="20" fill="url(#navPuckGrad-${safeId})" stroke="#FFFFFF" stroke-width="2.8" />
            <circle cx="22" cy="22" r="16" fill="url(#navPuckGlow-${safeId})" />
            
            <!-- Crisp 3D Navigator Direction Arrow (Pointing in Route Bearing) -->
            <path d="M22 8L32 32L22 26L12 32L22 8Z" fill="#FFFFFF" stroke="#0284C7" stroke-width="1.2" stroke-linejoin="round" />
            <path d="M22 8V26L32 32L22 8Z" fill="#E0F2FE" />
          </svg>
        </div>

        <!-- Ground Concentric Radar Wave -->
        <div class="rider-radar-ripple" style="position: absolute; width: 42px; height: 42px; border-radius: 50%; background: radial-gradient(circle, rgba(56, 189, 248, 0.6) 0%, rgba(2, 132, 199, 0) 70%); animation: clusterPulseRipple 1.8s ease-out infinite; pointer-events: none; z-index: 5;"></div>
      </div>
    `;
  }

  return `<div style="width: 28px; height: 28px; border-radius: 50%; background: #1C1917; color: #FFF; display: flex; items-center; justify-content: center; font-size: 10px; font-weight: 800; border: 2px solid #FFF; box-shadow: 0 4px 8px rgba(0,0,0,0.3);">${safeId.toUpperCase().slice(0, 2) || '•'}</div>`;
}

function createDefaultPopupHtml(marker: MapMarker): string {
  if (marker.type === 'cluster') {
    return `
      <div style="font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; padding: 6px 4px; min-width: 230px; max-width: 270px;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
          <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; padding: 3px 8px; border-radius: 9999px; background: #FCE8E6; color: #D94A38; border: 1px solid rgba(217,74,56,0.25);">
            🔥 Khau Galli Hub
          </span>
          <span style="font-size: 10px; font-weight: 700; color: #047857; background: #D1FAE5; padding: 2px 7px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;">
            <span style="width: 5px; height: 5px; border-radius: 50%; background: #059669;"></span>
            Active
          </span>
        </div>
        <div style="font-weight: 800; font-size: 14px; color: #1C1917; margin-bottom: 4px; line-height: 1.3;">
          ${escapeHtml(marker.title)}
        </div>
        ${marker.description
        ? `<div style="font-size: 11px; color: #57534E; line-height: 1.45; margin-bottom: 8px;">${escapeHtml(
          marker.description
        )}</div>`
        : ''
      }
        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 10px; font-family: monospace; color: #78716C; background: #FAF7F2; border: 1px solid #EAE4DA; padding: 4px 8px; border-radius: 8px;">
          <span>📍 ${(Number(marker.position?.[1]) || 0).toFixed(4)}° N, ${(Number(marker.position?.[0]) || 0).toFixed(4)}° E</span>
          <span style="font-weight: 700; color: #D94A38;">Ahmedabad</span>
        </div>
      </div>
    `;
  }

  if (marker.type === 'stall') {
    const isLive = marker.isLive !== false;
    return `
      <div style="font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; padding: 6px 4px; min-width: 220px; max-width: 260px;">
        ${marker.imageUrl ? `
          <div style="width: 100%; height: 85px; border-radius: 12px; overflow: hidden; margin-bottom: 8px; border: 1px solid #EFEBE4;">
            <img src="${escapeHtml(marker.imageUrl)}" alt="${escapeHtml(marker.title)}" style="width: 100%; height: 100%; object-fit: cover;" />
          </div>
        ` : ''}
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 4px;">
          <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; padding: 2px 7px; border-radius: 9999px; background: #FCE8E6; color: #D94A38;">
            🏪 ${escapeHtml(marker.category || 'Food Stall')}
          </span>
          <span style="font-size: 10px; font-weight: 700; color: ${isLive ? '#047857' : '#6B7280'}; background: ${isLive ? '#D1FAE5' : '#F3F4F6'}; padding: 2px 6px; border-radius: 6px; display: inline-flex; align-items: center; gap: 3px;">
            <span style="width: 5px; height: 5px; border-radius: 50%; background: ${isLive ? '#059669' : '#9CA3AF'};"></span>
            ${isLive ? 'Open Now' : 'Closed'}
          </span>
        </div>
        <div style="font-weight: 800; font-size: 13px; color: #1C1917; margin-bottom: 2px; line-height: 1.3;">
          ${escapeHtml(marker.title)}
        </div>
        ${marker.clusterName ? `
          <div style="font-size: 11px; color: #78716C; margin-bottom: 6px;">
            📍 ${escapeHtml(marker.clusterName)}
          </div>
        ` : ''}
        <div style="margin-top: 6px;">
          <a href="/stall/${escapeHtml(marker.stallId || marker.id)}" style="display: block; width: 100%; text-align: center; background: #D94A38; color: #FFF; font-size: 11px; font-weight: 700; padding: 6px 12px; border-radius: 10px; text-decoration: none; box-sizing: border-box;">
            View Menu & Order →
          </a>
        </div>
      </div>
    `;
  }

  const badgeClass =
    marker.type === 'customer'
      ? 'background: #D1FAE5; color: #047857;'
      : 'background: #FEF3C7; color: #B45309;';

  const badgeText =
    marker.type === 'customer'
      ? '📍 Delivery Destination'
      : marker.type === 'rider'
        ? '🛵 Delivery Partner'
        : 'Location';

  return `
    <div style="font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; padding: 4px; max-width: 220px;">
      <div style="display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; margin-bottom: 6px; ${badgeClass}">
        ${badgeText}
      </div>
      <div style="font-weight: 700; font-size: 13px; color: #1c1917; margin-bottom: 2px;">
        ${escapeHtml(marker.title)}
      </div>
      ${marker.description
      ? `<div style="font-size: 11px; color: #6b7280; line-height: 1.4;">${escapeHtml(
        marker.description
      )}</div>`
      : ''
    }
    </div>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default TomTomMap;
