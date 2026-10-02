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

      const onSuccess = (position: GeolocationPosition) => {
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
      };

      navigator.geolocation.getCurrentPosition(
        onSuccess,
        (highAccErr) => {
          console.warn('High accuracy GPS timed out, trying fallback:', highAccErr);
          if (highAccErr.code === 1) {
            setPermission('denied');
            localStorage.setItem(STORAGE_PERMISSION_KEY, 'denied');
            setIsLocating(false);
            resolve(null);
            return;
          }

          navigator.geolocation.getCurrentPosition(
            onSuccess,
            (fallbackErr) => {
              console.warn('Fallback geolocation failed:', fallbackErr);
              setIsLocating(false);
              resolve(null);
            },
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
          );
        },
        { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 }
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
