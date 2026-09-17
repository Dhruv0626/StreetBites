/**
 * ============================================================================
 * Ambient Type Declarations for TomTom Web Maps SDK
 * Package: @tomtom-international/web-sdk-maps
 * ============================================================================
 * 
 * WHY THIS FILE EXISTS:
 * When using the TomTom Web Maps JavaScript SDK in a TypeScript + Vite project,
 * TypeScript needs to know what classes, methods, and options exist in the SDK.
 * This declaration file (.d.ts) provides full autocomplete, type-checking,
 * and eliminates TypeScript "Cannot find module" compilation errors.
 */

/**
 * Allows importing the TomTom SDK stylesheet directly in TypeScript/JavaScript files
 * Example: import '@tomtom-international/web-sdk-maps/dist/maps.css';
 */
declare module '@tomtom-international/web-sdk-maps/dist/maps.css' {
  const content: any;
  export default content;
}

/**
 * Main TomTom Maps SDK Module Declarations
 */
declare module '@tomtom-international/web-sdk-maps' {

  /**
   * Represents a rectangular geographical bounding box on the map.
   * Used to fit multiple markers or routes inside the visible screen view.
   */
  export interface LngLatBounds {
    /** Extends the bounds to include the given [longitude, latitude] coordinate */
    extend(lngLat: [number, number]): LngLatBounds;
  }

  /**
   * Options passed when creating a new TomTom Map instance: tt.map(options)
   */
  export interface MapOptions {
    key: string;
    container: HTMLElement | string;
    center?: [number, number];
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    pitch?: number;
    bearing?: number;
    language?: string;
    style?: string | object;
  }

  /**
   * Configuration options for creating a Map Marker: new tt.Marker(options)
   */
  export interface MarkerOptions {
    element?: HTMLElement;
    color?: string;
    anchor?: string;
    draggable?: boolean;
  }

  /**
   * Configuration options for creating an Info Popup: new tt.Popup(options)
   */
  export interface PopupOptions {
    offset?: number | [number, number] | object;
    closeButton?: boolean;
    closeOnClick?: boolean;
    className?: string;
  }

  /**
   * TomTom Popup Class
   * Displays an informational bubble attached to a marker or coordinate.
   */
  export class Popup {
    constructor(options?: PopupOptions);
    setLngLat(lngLat: [number, number]): this;
    setHTML(html: string): this;
    setText(text: string): this;
    addTo(map: Map): this;
    remove(): this;
    isOpen(): boolean;
  }

  /**
   * TomTom Marker Class
   * Places an interactive pin or custom HTML icon at a specific coordinate.
   */
  export class Marker {
    constructor(options?: MarkerOptions);
    setLngLat(lngLat: [number, number]): this;
    getLngLat(): { lng: number; lat: number };
    setPopup(popup: Popup): this;
    addTo(map: Map): this;
    remove(): this;
    getElement(): HTMLElement;
  }

  /**
   * Built-in TomTom Navigation Controls (+ / - Zoom buttons, pitch toggle)
   */
  export class NavigationControl {
    constructor(options?: { showCompass?: boolean; showPitch?: boolean });
  }

  /**
   * Built-in Fullscreen button control
   */
  export class FullscreenControl {
    constructor(options?: object);
  }

  /**
   * Built-in "Locate Me" Geolocation GPS control
   */
  export class GeolocationControl {
    constructor(options?: object);
  }

  /**
   * Core TomTom Map Instance Class
   * Represents the interactive map canvas and provides methods to manipulate it.
   */
  export class Map {
    constructor(options: MapOptions);
    on(event: string, callback: (e: any) => void): void;
    off(event: string, callback: (e: any) => void): void;
    remove(): void;
    setCenter(center: [number, number]): this;
    getCenter(): { lng: number; lat: number };
    setZoom(zoom: number): this;
    getZoom(): number;
    flyTo(options: { center?: [number, number]; zoom?: number; duration?: number }): void;
    addControl(control: any, position?: string): void;
    resize(): void;
    addLayer(layer: any): void;
    removeLayer(id: string): void;
    addSource(id: string, source: any): void;
    removeSource(id: string): void;
    getSource(id: string): any;
    getStyle(): any;
    setLayoutProperty(layerId: string, name: string, value: any): void;
  }

  /**
   * Factory function to initialize a new TomTom Map
   * Example: const map = tt.map({ key: '...', container: 'map-div' });
   */
  function map(options: MapOptions): Map;

  /**
   * Default exported SDK object (window.tt / import tt from '@tomtom-international/web-sdk-maps')
   */
  export default tt;
  const tt: {
    map: (options: MapOptions) => Map;
    Marker: typeof Marker;
    Popup: typeof Popup;
    NavigationControl: typeof NavigationControl;
    FullscreenControl: typeof FullscreenControl;
    GeolocationControl: typeof GeolocationControl;
    LngLatBounds: new () => LngLatBounds;
  };
}
