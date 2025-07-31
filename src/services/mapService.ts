import { loadGoogleMapsApi } from '@/api/googleMapsLoader';
import { MarkerClusterer } from "@googlemaps/markerclusterer";

// Define types for Google Maps libraries to avoid type errors
type GoogleMapsLibrary = {
  Map: typeof google.maps.Map;
  AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement;
  Polyline: typeof google.maps.Polyline;
  DirectionsService: typeof google.maps.DirectionsService;
  DirectionsRenderer: typeof google.maps.DirectionsRenderer;
  TrafficLayer: typeof google.maps.TrafficLayer;
  TransitLayer: typeof google.maps.TransitLayer;
  StreetViewService: typeof google.maps.StreetViewService;
  InfoWindow: typeof google.maps.InfoWindow;
  LatLngBounds: typeof google.maps.LatLngBounds;
};

export class MapService {
  private mapInstance: google.maps.Map | null = null;
  private markers = new Map<string, google.maps.marker.AdvancedMarkerElement>();
  private polylines = new Map<string, google.maps.Polyline>();
  private directionsRenderers = new Map<string, google.maps.DirectionsRenderer>();
  private trafficLayer: google.maps.TrafficLayer | null = null;
  private transitLayer: google.maps.TransitLayer | null = null;
  private streetViewService: google.maps.StreetViewService | null = null;
  private directionsService: google.maps.DirectionsService | null = null;
  private markerClusterer: MarkerClusterer | null = null;
  private currentInfoWindow: google.maps.InfoWindow | null = null;
  private allMarkers: google.maps.marker.AdvancedMarkerElement[] = [];

  async initializeMap(
    container: HTMLElement,
    options: google.maps.MapOptions,
    interactive: boolean,
    onLocationSelect?: (location: { lat: number; lng: number; address?: string }) => void
  ) {
    await loadGoogleMapsApi();
    const { Map } = (await window.google.maps.importLibrary("maps")) as unknown as GoogleMapsLibrary;
    
    // Enhanced map options for better performance and visuals
    const enhancedOptions: google.maps.MapOptions = {
      ...options,
      gestureHandling: 'greedy', // Better touch/scroll handling
      restriction: {
        latLngBounds: {
          north: 85,
          south: -85,
          west: -180,
          east: 180,
        },
        strictBounds: true,
      },
      minZoom: 2,
      maxZoom: 20,
    };
    
    this.mapInstance = new Map(container, enhancedOptions);
    this.directionsService = new google.maps.DirectionsService();
    this.streetViewService = new google.maps.StreetViewService();
    this.trafficLayer = new google.maps.TrafficLayer();
    this.transitLayer = new google.maps.TransitLayer();

    if (interactive && onLocationSelect) {
      this.mapInstance.addListener("click", (event: google.maps.MapMouseEvent) => {
        if (!event.latLng) return;
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        onLocationSelect({ lat, lng });
      });
    }

    // Add smooth zoom control
    this.mapInstance.addListener("zoom_changed", () => {
      this.updateMarkerSizes();
    });

    return this.mapInstance;
  }

  private updateMarkerSizes() {
    if (!this.mapInstance) return;
    const zoom = this.mapInstance.getZoom() || 10;
    
    // Adjust marker sizes based on zoom level
    this.allMarkers.forEach(marker => {
      const content = marker.content as HTMLElement;
      if (content) {
        const scale = Math.max(0.5, Math.min(1.5, zoom / 10));
        content.style.transform = `scale(${scale})`;
      }
    });
  }

  clearMarkers() {
    // Clear clusterer first
    if (this.markerClusterer) {
      this.markerClusterer.clearMarkers();
    }
    
    // Remove all markers from map
    this.markers.forEach(marker => {
      if (marker.map) marker.map = null;
    });
    this.markers.clear();
    this.allMarkers = [];
  }

  clearPolylines() {
    this.polylines.forEach(polyline => polyline.setMap(null));
    this.polylines.clear();
  }

  clearDirections() {
    this.directionsRenderers.forEach(renderer => renderer.setMap(null));
    this.directionsRenderers.clear();
  }

  async createMarker(position: google.maps.LatLngLiteral, content: HTMLElement, id?: string) {
    if (!this.mapInstance) return null;
    
    const { AdvancedMarkerElement } = (await window.google.maps.importLibrary("marker")) as unknown as GoogleMapsLibrary;
    const marker = new AdvancedMarkerElement({
      map: null, // Don't add to map immediately - we'll handle this via clustering
      position,
      content
    });
    
    if (id) {
      this.markers.set(id, marker);
    }
    
    this.allMarkers.push(marker);
    return marker;
  }

  async createPolyline(path: google.maps.LatLngLiteral[], options: google.maps.PolylineOptions, id?: string) {
    if (!this.mapInstance) return null;
    
    const { Polyline } = (await window.google.maps.importLibrary("maps")) as unknown as GoogleMapsLibrary;
    
    // Enhanced polyline options for better visuals
    const enhancedOptions: google.maps.PolylineOptions = {
      path,
      map: this.mapInstance,
      geodesic: true,
      strokeWeight: 3,
      strokeOpacity: 0.8,
      ...options,
      icons: options.strokeOpacity && options.strokeOpacity < 0.5 ? [] : [
        {
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 3,
            strokeColor: options.strokeColor || '#d4af37',
            fillColor: options.strokeColor || '#d4af37',
            fillOpacity: 1,
          },
          offset: '50%',
          repeat: '100px',
        },
      ],
    };
    
    const polyline = new Polyline(enhancedOptions);
    
    if (id) {
      this.polylines.set(id, polyline);
    }
    
    return polyline;
  }

  async calculateRoute(routeRequest: google.maps.DirectionsRequest) {
    if (!this.directionsService) return null;
    
    return new Promise<google.maps.DirectionsResult | null>((resolve) => {
      this.directionsService!.route(routeRequest, (result, status) => {
        resolve(status === 'OK' ? result : null);
      });
    });
  }

  async renderDirections(routeId: string, directions: google.maps.DirectionsResult, options: {
    map: google.maps.Map;
    polylineOptions?: google.maps.PolylineOptions;
    suppressMarkers?: boolean;
  }) {
    if (!this.mapInstance) return;
    
    const { DirectionsRenderer } = (await window.google.maps.importLibrary("routes")) as unknown as GoogleMapsLibrary;
    const renderer = new DirectionsRenderer({
      ...options,
      directions,
      preserveViewport: true, // Don't auto-fit bounds
    });
    
    this.directionsRenderers.set(routeId, renderer);
    return renderer;
  }

  toggleTraffic(show: boolean) {
    if (!this.mapInstance || !this.trafficLayer) return;
    this.trafficLayer.setMap(show ? this.mapInstance : null);
  }

  toggleTransit(show: boolean) {
    if (!this.mapInstance || !this.transitLayer) return;
    this.transitLayer.setMap(show ? this.mapInstance : null);
  }

  setMapType(type: string) {
    if (!this.mapInstance) return;
    this.mapInstance.setMapTypeId(type);
  }

  async checkStreetViewAvailability(location: google.maps.LatLngLiteral) {
    if (!this.streetViewService) return false;
    
    return new Promise<boolean>((resolve) => {
      this.streetViewService!.getPanorama({
        location,
        radius: 50
      }, (_data, status) => {
        resolve(status === 'OK');
      });
    });
  }

  fitBounds(locations: google.maps.LatLngLiteral[], padding = 80) {
    if (!this.mapInstance || locations.length === 0) return;
    
    const { LatLngBounds } = google.maps;
    const bounds = new LatLngBounds();
    
    locations.forEach(location => bounds.extend(location));
    
    if (locations.length === 1) {
      // For single location, set center and reasonable zoom
      this.mapInstance.setCenter(locations[0]);
      this.mapInstance.setZoom(12);
    } else {
      // For multiple locations, fit bounds with padding
      this.mapInstance.fitBounds(bounds, { top: padding, right: padding, bottom: padding, left: padding });
      
      // Ensure minimum zoom level
      const listener = google.maps.event.addListener(this.mapInstance, 'bounds_changed', () => {
        const currentZoom = this.mapInstance!.getZoom();
        if (currentZoom && currentZoom > 15) {
          this.mapInstance!.setZoom(15);
        }
        google.maps.event.removeListener(listener);
      });
    }
  }

  setCenter(center: google.maps.LatLngLiteral) {
    if (!this.mapInstance) return;
    this.mapInstance.panTo(center); // Use panTo for smooth animation
  }

  getCenter() {
    if (!this.mapInstance) return null;
    const center = this.mapInstance.getCenter();
    return center ? { lat: center.lat(), lng: center.lng() } : null;
  }

  getMapInstance() {
    return this.mapInstance;
  }

  setZoom(zoom: number, animate = true) {
    if (!this.mapInstance) return;
    
    if (animate) {
      // Smooth zoom animation
      const currentZoom = this.mapInstance.getZoom() || 10;
      const steps = Math.abs(zoom - currentZoom);
      const stepSize = (zoom - currentZoom) / Math.max(steps, 1);
      
      let currentStep = 0;
      const animateZoom = () => {
        if (currentStep < steps) {
          const newZoom = currentZoom + (stepSize * currentStep);
          this.mapInstance!.setZoom(Math.round(newZoom));
          currentStep++;
          setTimeout(animateZoom, 50);
        } else {
          this.mapInstance!.setZoom(zoom);
        }
      };
      animateZoom();
    } else {
      this.mapInstance.setZoom(zoom);
    }
  }

  async initMarkerClusterer() {
    if (!this.mapInstance) return;
    
    if (this.markerClusterer) {
      this.markerClusterer.clearMarkers();
      this.markerClusterer.setMap(null);
    }
    
    await window.google.maps.importLibrary("marker");
    
    this.markerClusterer = new MarkerClusterer({
      map: this.mapInstance,
      markers: [],
      renderer: {
        render: ({ count }) => {
          const svg = `
            <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
              <circle cx="25" cy="25" r="20" fill="#d4af37" stroke="white" stroke-width="3" opacity="0.9"/>
              <text x="25" y="30" text-anchor="middle" fill="white" font-size="14" font-weight="bold">${count}</text>
            </svg>
          `;
          
          const clusterMarker = document.createElement('div');
          clusterMarker.innerHTML = svg;
          clusterMarker.className = 'cluster-marker transform transition-all hover:scale-110 cursor-pointer';
          
          return clusterMarker;
        }
      },
      algorithm: new MarkerClusterer.GridAlgorithm({ gridSize: 60 })
    });
  }

  async clusterMarkers(markers: google.maps.marker.AdvancedMarkerElement[]) {
    if (!this.mapInstance) return;
    
    if (!this.markerClusterer) {
      await this.initMarkerClusterer();
    }
    
    if (this.markerClusterer) {
      this.markerClusterer.clearMarkers();
      this.markerClusterer.addMarkers(markers);
    } else {
      // Fallback: add markers directly to map
      markers.forEach(marker => {
        marker.map = this.mapInstance;
      });
    }
  }

  getTripColor(status: string) {
    switch (status) {
      case "completed": return "#d4af37";
      case "active": return "#4c6b54";
      case "planned": return "#b22222";
      case "draft": return "#8B7355";
      default: return "#d4af37";
    }
  }

  createTripPin(color: string, opacity: number, isFirst: boolean, isLast: boolean, number: number) {
    const pin = document.createElement("div");
    pin.className = "trip-marker relative flex items-center justify-center transform transition-all duration-200 hover:scale-125 cursor-pointer hover:z-50 group";
    
    const size = isFirst || isLast ? 44 : 36;
    const fontSize = isFirst || isLast ? "14px" : "12px";
    const zIndex = isFirst || isLast ? 100 : 50;
    
    pin.style.zIndex = zIndex.toString();
    
    const iconContent = isFirst ? '🚀' : isLast ? '🏁' : number.toString();
    
    pin.innerHTML = `
      <div class="marker-pin" style="
        width: ${size}px;
        height: ${size}px;
        background: linear-gradient(135deg, ${color} 0%, ${this.darkenColor(color, 0.2)} 100%);
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${fontSize};
        opacity: ${opacity};
        position: relative;
        overflow: visible;
      ">
        ${iconContent}
        <div class="absolute inset-0 rounded-full animate-ping" style="
          background-color: ${color};
          opacity: 0.3;
          animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
      </div>
      <div class="tooltip absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50" style="
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        ${isFirst ? 'Trip Start' : isLast ? 'Trip End' : `Stop ${number}`}
      </div>
    `;
    
    return pin;
  }

  createStandalonePin(color: string, type: 'visited' | 'planned' | 'favorite' = 'visited') {
    const pin = document.createElement("div");
    pin.className = "standalone-marker relative flex items-center justify-center transform transition-all duration-200 hover:scale-125 cursor-pointer hover:z-50 group";
    
    const icons = {
      visited: '📍',
      planned: '🗺️',
      favorite: '❤️'
    };
    
    pin.innerHTML = `
      <div class="marker-pin" style="
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, ${color} 0%, ${this.darkenColor(color, 0.2)} 100%);
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 3px 8px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 14px;
        position: relative;
        overflow: visible;
      ">
        ${icons[type]}
        <div class="pulse-ring absolute inset-0 rounded-full" style="
          background-color: ${color};
          opacity: 0.3;
          animation: pulse-ring 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite;
        "></div>
      </div>
      <div class="tooltip absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
        ${type.charAt(0).toUpperCase() + type.slice(1)} Location
      </div>
    `;
    
    return pin;
  }

  createCurrentLocationPin() {
    const pin = document.createElement("div");
    pin.className = "current-location-marker relative flex items-center justify-center";
    
    pin.innerHTML = `
      <div style="
        width: 20px;
        height: 20px;
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(59,130,246,0.4);
        position: relative;
      ">
        <div class="absolute inset-0 rounded-full animate-ping" style="
          background-color: #3b82f6;
          opacity: 0.4;
        "></div>
      </div>
    `;
    
    return pin;
  }

  showInfoWindow(content: string, position: google.maps.LatLngLiteral) {
    if (!this.mapInstance) return null;
    
    // Close existing info window
    if (this.currentInfoWindow) {
      this.currentInfoWindow.close();
    }
    
    const { InfoWindow } = google.maps;
    this.currentInfoWindow = new InfoWindow({
      content,
      position,
      maxWidth: 300,
      pixelOffset: new google.maps.Size(0, -10),
    });
    
    this.currentInfoWindow.open(this.mapInstance);
    return this.currentInfoWindow;
  }

  closeInfoWindow() {
    if (this.currentInfoWindow) {
      this.currentInfoWindow.close();
      this.currentInfoWindow = null;
    }
  }

  // Helper method to darken colors
  private darkenColor(color: string, amount: number): string {
    const hex = color.replace('#', '');
    const r = Math.max(0, parseInt(hex.substring(0, 2), 16) - Math.round(255 * amount));
    const g = Math.max(0, parseInt(hex.substring(2, 4), 16) - Math.round(255 * amount));
    const b = Math.max(0, parseInt(hex.substring(4, 6), 16) - Math.round(255 * amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  // Animate to location with smooth transition
  animateToLocation(location: google.maps.LatLngLiteral, zoom = 12) {
    if (!this.mapInstance) return;
    
    this.mapInstance.panTo(location);
    setTimeout(() => {
      this.setZoom(zoom, true);
    }, 500);
  }

  // Get optimal zoom level based on marker spread
  getOptimalZoom(locations: google.maps.LatLngLiteral[]): number {
    if (locations.length <= 1) return 12;
    
    const bounds = new google.maps.LatLngBounds();
    locations.forEach(loc => bounds.extend(loc));
    
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    
    const latDiff = ne.lat() - sw.lat();
    const lngDiff = ne.lng() - sw.lng();
    const maxDiff = Math.max(latDiff, lngDiff);
    
    if (maxDiff > 100) return 3;
    if (maxDiff > 50) return 4;
    if (maxDiff > 20) return 5;
    if (maxDiff > 10) return 6;
    if (maxDiff > 5) return 7;
    if (maxDiff > 2) return 8;
    if (maxDiff > 1) return 9;
    if (maxDiff > 0.5) return 10;
    if (maxDiff > 0.1) return 11;
    return 12;
  }
}