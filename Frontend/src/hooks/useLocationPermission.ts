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
    const perm = localStorage.getItem(STORAGE_PERMISSION_KEY);
    const enabled = localStorage.getItem(STORAGE_ENABLED_KEY);

    // If user explicitly disabled it, always respect their choice
    if (enabled === 'false' || perm === 'denied') return 'denied';
    if (enabled === 'true' && perm === 'granted') return 'granted';
    return 'denied'; // Default to disabled
  });

  const [coords, setCoords] = useState<LocationCoords | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Sync with browser navigator permissions ONLY if user has enabled location in the app
  useEffect(() => {
    const currentEnabled = localStorage.getItem(STORAGE_ENABLED_KEY);
    if (currentEnabled === 'false') {
      setPermission('denied');
      return;
    }

    if (typeof window !== 'undefined' && navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' })
        .then((result) => {
          const enabledNow = localStorage.getItem(STORAGE_ENABLED_KEY);
          if (enabledNow === 'false') {
            setPermission('denied');
            return;
          }

          if (result.state === 'granted' && enabledNow === 'true') {
            setPermission('granted');
            localStorage.setItem(STORAGE_PERMISSION_KEY, 'granted');
          } else if (result.state === 'denied') {
            setPermission('denied');
            localStorage.setItem(STORAGE_PERMISSION_KEY, 'denied');
            localStorage.setItem(STORAGE_ENABLED_KEY, 'false');
          }

          result.onchange = () => {
            const userPref = localStorage.getItem(STORAGE_ENABLED_KEY);
            if (userPref === 'false') {
              setPermission('denied');
              return;
            }
            const updated: PermissionStatus = result.state === 'granted' ? 'granted' : 'denied';
            setPermission(updated);
            localStorage.setItem(STORAGE_PERMISSION_KEY, updated);
            localStorage.setItem(STORAGE_ENABLED_KEY, updated === 'granted' ? 'true' : 'false');
          };
        })
        .catch(() => {});
    }
  }, []);

  const requestLocation = useCallback((): Promise<LocationCoords | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setPermission('denied');
        localStorage.setItem(STORAGE_PERMISSION_KEY, 'denied');
        localStorage.setItem(STORAGE_ENABLED_KEY, 'false');
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
          console.warn('Geolocation denied or error:', error);
          setPermission('denied');
          localStorage.setItem(STORAGE_PERMISSION_KEY, 'denied');
          localStorage.setItem(STORAGE_ENABLED_KEY, 'false');
          setIsLocating(false);
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
