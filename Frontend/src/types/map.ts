/**
 * TypeScript Type Definitions for StreetBites TomTom Map Component
 */

// Coordinate tuple order used by TomTom Maps SDK: [longitude, latitude]
export type LngLatTuple = [number, number];

export type MarkerType = 'cluster' | 'stall' | 'customer' | 'rider' | 'default';

export interface MapMarker {
  id: string;
  position: LngLatTuple;
  title: string;
  description?: string;
  type?: MarkerType;
  popupHtml?: string;
  imageUrl?: string;
  category?: string;
  rating?: number | string;
  isLive?: boolean;
  clusterName?: string;
  stallId?: string;
  heading?: number; // Compass heading in degrees (0-360) for directional navigation arrows
  onClick?: (markerId: string) => void;
}

export interface TomTomMapProps {
  center?: LngLatTuple;
  zoom?: number;
  pitch?: number;
  bearing?: number;
  markers?: MapMarker[];
  routeCoordinates?: LngLatTuple[];
  className?: string;
  onMapClick?: (position: LngLatTuple) => void;
  onMapLoaded?: (mapInstance: any) => void;
  onZoomChange?: (zoom: number) => void;
  showControls?: boolean;
  showMarkers?: boolean;
  isRouteLoading?: boolean;
}

