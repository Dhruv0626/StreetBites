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
  onClick?: (markerId: string) => void;
}

export interface TomTomMapProps {
  center?: LngLatTuple;
  zoom?: number;
  markers?: MapMarker[];
  routeCoordinates?: LngLatTuple[];
  className?: string;
  onMapClick?: (position: LngLatTuple) => void;
  onMapLoaded?: (mapInstance: any) => void;
  showControls?: boolean;
  showMarkers?: boolean;
}

