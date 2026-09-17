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
  markers = [],
  className = 'w-full h-[450px] rounded-2xl overflow-hidden shadow-sm border border-[#EFEBE4] relative',
  onMapClick,
  onMapLoaded,
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

    // Inject JS SDK Script
    const scriptId = 'tomtom-maps-js-cdn';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps-web.min.js';
      script.async = true;
      script.onload = () => {
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

  // ── 3. Dynamic Center / Zoom Updates ─────────────────────────────────────────
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.flyTo({
        center: center,
        zoom: zoom,
        duration: 800,
      });
    }
  }, [center, zoom]);

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
      } else {
        const markerEl = document.createElement('div');
        markerEl.className = getMarkerElementClass(markerData.type);
        markerEl.innerHTML = getMarkerIconHtml(markerData.type, markerData.title, markerData.id);

        const isCluster = markerData.type === 'cluster';
        const markerInstance = new ttSDK.Marker({
          element: markerEl,
          anchor: isCluster ? 'bottom' : 'center',
        }).setLngLat(markerData.position);

        const popupHtml = markerData.popupHtml || createDefaultPopupHtml(markerData);
        if (popupHtml && ttSDK.Popup) {
          const popup = new ttSDK.Popup({
            offset: isCluster ? [0, -48] : 16,
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

function getMarkerElementClass(type?: string): string {
  if (type === 'cluster') {
    return 'streetbites-cluster-marker-root cursor-pointer z-30 select-none';
  }

  const base = 'cursor-pointer transition-transform duration-200 hover:scale-110 flex items-center justify-center shadow-md border-2 border-white';
  switch (type) {
    case 'stall':
      return `${base} w-8 h-8 rounded-full bg-gradient-to-tr from-[#D94A38] to-[#FF6B4A] text-white z-20`;
    case 'customer':
      return `${base} w-8 h-8 rounded-full bg-gradient-to-tr from-[#059669] to-[#10B981] text-white z-20`;
    case 'rider':
      return `${base} w-9 h-9 rounded-full bg-gradient-to-tr from-[#D97706] to-[#F59E0B] text-white animate-pulse z-25`;
    default:
      return `${base} w-7 h-7 rounded-full bg-[#1C1917] text-white z-10`;
  }
}

function getMarkerIconHtml(type?: string, title?: string, id?: string): string {
  const safeId = (id || 'pin').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeTitle = escapeHtml(title || 'Food Cluster');

  // Attractive, Rich & Meaningful Cluster / Khau Galli Food Hub Pin
  if (type === 'cluster') {
    return `
      <div class="streetbites-cluster-pin" style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; transform-origin: bottom center; transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);">
        
        <!-- Floating Mini Name Label Pill -->
        <div class="cluster-name-tag" style="position: absolute; bottom: 58px; white-space: nowrap; background: rgba(28, 25, 23, 0.94); backdrop-filter: blur(8px); color: #FFF; font-size: 11px; font-weight: 800; font-family: 'Plus Jakarta Sans', sans-serif; padding: 4px 10px; border-radius: 9999px; border: 1.5px solid rgba(255,255,255,0.3); box-shadow: 0 6px 16px rgba(0,0,0,0.35); pointer-events: none; display: flex; align-items: center; gap: 6px; z-index: 30; transition: all 0.2s ease;">
          <span style="width: 7px; height: 7px; border-radius: 50%; background: #22C55E; display: inline-block; box-shadow: 0 0 8px #22C55E; flex-shrink: 0;"></span>
          <span style="max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${safeTitle}</span>
        </div>

        <!-- 3D Elevated Teardrop Pin Graphic with Authentic Khau Galli Food Hub Emblem -->
        <div class="cluster-pin-graphic" style="position: relative; width: 44px; height: 54px; filter: drop-shadow(0 10px 18px rgba(217, 74, 56, 0.55)) drop-shadow(0 2px 5px rgba(0,0,0,0.25)); transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);">
          <svg width="44" height="54" viewBox="0 0 44 54" fill="none" xmlns="http://www.w3.org/2000/svg">
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

            <!-- Teardrop Pin Outer Base Shell -->
            <path d="M22 0C9.85 0 0 9.85 0 22C0 35.8 18.6 51.6 21.2 53.7C21.66 54.1 22.34 54.1 22.8 53.7C25.4 51.6 44 35.8 44 22C44 9.85 34.15 0 22 0Z" fill="url(#clusterGrad-${safeId})" stroke="#FFFFFF" stroke-width="2.6" />

            <!-- Ambient Shimmer Glow -->
            <ellipse cx="22" cy="14" rx="15" ry="8" fill="url(#innerGlow-${safeId})" />

            <!-- Inner Contrast Shield Circle -->
            <circle cx="22" cy="20" r="14.5" fill="#1C1917" fill-opacity="0.22" stroke="#FFFFFF" stroke-width="1.2" />

            <!-- Khau Galli Food Street Emblem (Striped Canopy Awning + Steam Flames + Hot Stall Counter) -->
            <!-- Canopy Roof -->
            <path d="M12 15.5L14.5 10H29.5L32 15.5H12Z" fill="url(#goldAccent-${safeId})" stroke="#FFFFFF" stroke-width="0.8" stroke-linejoin="round"/>
            <!-- Canopy Stripes -->
            <path d="M17 10L16 15.5M22 10V15.5M27 10L28 15.5" stroke="#D94A38" stroke-width="0.9" stroke-linecap="round"/>
            <!-- Canopy Scallop Edges -->
            <path d="M12 15.5C13.2 16.6 14.8 16.6 16 15.5C17.2 16.6 18.8 16.6 20 15.5C21.2 16.6 22.8 16.6 24 15.5C25.2 16.6 26.8 16.6 28 15.5C29.2 16.6 30.8 16.6 32 15.5" stroke="#FFFFFF" stroke-width="1" stroke-linecap="round" fill="none"/>
            <!-- Stall Counter Box -->
            <path d="M14 17.5V26.5C14 27.3 14.7 28 15.5 28H28.5C29.3 28 30 27.3 30 26.5V17.5" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round" fill="rgba(255,255,255,0.15)"/>
            <!-- Counter Opening / Serving Window -->
            <rect x="17" y="20.5" width="10" height="4.5" rx="1" fill="#FFFFFF" fill-opacity="0.85" />
            <!-- Sizzling Steam Aromas -->
            <path d="M18.5 8C18.5 8 19.5 6.5 18.8 5.5" stroke="#FFF176" stroke-width="1.2" stroke-linecap="round"/>
            <path d="M22 7.5C22 7.5 23.5 6 22.5 4.5" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round"/>
            <path d="M25.5 8C25.5 8 26.5 6.5 25.8 5.5" stroke="#FFF176" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
        </div>

        <!-- Ground Pulsing Radar Wave Beacon -->
        <div class="cluster-ground-ripple" style="position: absolute; bottom: -3px; width: 26px; height: 9px; border-radius: 50%; background: radial-gradient(ellipse at center, rgba(217, 74, 56, 0.75) 0%, rgba(217, 74, 56, 0) 75%); animation: clusterPulseRipple 2.2s ease-out infinite; pointer-events: none; z-index: 5;"></div>
      </div>
    `;
  }

  switch (type) {
    case 'stall':
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M10 12v-2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2"/></svg>`;
    case 'customer':
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
    case 'rider':
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`;
    default:
      return `<span style="font-size: 10px; font-weight: 800;">${safeId.toUpperCase().slice(0, 2) || '•'}</span>`;
  }
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

  const badgeClass =
    marker.type === 'stall'
      ? 'background: #FCE8E6; color: #D94A38;'
      : marker.type === 'customer'
        ? 'background: #D1FAE5; color: #047857;'
        : 'background: #FEF3C7; color: #B45309;';

  const badgeText =
    marker.type === 'stall'
      ? '🏪 Food Stall'
      : marker.type === 'customer'
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
