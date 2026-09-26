import { useState, useEffect, useCallback } from 'react';

export type PermissionStatus = 'granted' | 'denied';

export interface LocationCoords {
  lat: number;
  lng: number;
}

const STORAGE_PERMISSION_KEY = 'streetbites_location_permission';
const STORAGE_ENABLED_KEY = 'streetbites_location_enabled';

export function useLocationPermission() {
  const [permission, setPermission] = useState<PermissionStatus | null>(() => {
    const enabled = localStorage.getItem(STORAGE_ENABLED_KEY);
    // User's manual setting is strictly respected and persists across page reloads
    if (enabled === 'true') return 'granted';
    if (enabled === 'false') return 'denied';
    const perm = localStorage.getItem(STORAGE_PERMISSION_KEY);
    if (perm === 'granted') return 'granted';
    return 'denied'; // Default to disabled
  });

  const [coords, setCoords] = useState<LocationCoords | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Sync state with storage and handle browser permissions query safely without resetting user's manual switch
  useEffect(() => {
    const isEnabled = localStorage.getItem(STORAGE_ENABLED_KEY) === 'true';
    if (isEnabled) {
      setPermission('granted');
    } else {
      setPermission('denied');
    }

    // Listen to storage events so when user toggles in Settings, it updates across all components
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_ENABLED_KEY) {
        setPermission(e.newValue === 'true' ? 'granted' : 'denied');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const requestLocation = useCallback((): Promise<LocationCoords | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCoords: LocationCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCoords(newCoords);
          setPermission('granted');
          localStorage.setItem(STORAGE_PERMISSION_KEY, 'granted');
          localStorage.setItem(STORAGE_ENABLED_KEY, 'true');
          setIsLocating(false);
          resolve(newCoords);
        },
        (error) => {
          console.warn('Geolocation error:', error);
          setIsLocating(false);
          // Never reset user's manual in-app enabled setting on error/reload
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    });
  }, []);

  return {
    permission,
    coords,
    isLocating,
    requestLocation,
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',
  };
}

export default useLocationPermission;
