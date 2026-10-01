/**
 * TomTom Maps Configuration
 * 
 * Centralized configuration for TomTom SDK initialization and default map constants.
 * Keeps map settings and API keys decoupled from React UI components.
 */

// Retrieve API key safely from Vite environment variables with fallback
export const TOMTOM_API_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TOMTOM_API_KEY) ||
  'pKaNxsGAgRWmxEehTjy8EIxVWGsfSIc3';

/**
 * Validates if a TomTom API Key is configured.
 */
export const isTomTomApiKeyConfigured = (): boolean => {
  return (
    Boolean(TOMTOM_API_KEY) &&
    TOMTOM_API_KEY.trim().length > 0
  );
};

/**
 * Default Geographical Coordinates (Ahmedabad, Gujarat, India)
 * Note: TomTom SDK uses [longitude, latitude] coordinate array order.
 */
export const AHMEDABAD_CENTER: [number, number] = [72.5714, 23.0225]; // [Lng, Lat]

/**
 * Default Map Display Settings
 */
export const MAP_CONFIG_DEFAULTS = {
  center: AHMEDABAD_CENTER,
  zoom: 13,
  minZoom: 3,
  maxZoom: 18,
  pitch: 0,
  bearing: 0,
  language: 'en-GB',
} as const;
