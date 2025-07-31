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


  async initializeMap(
    container: HTMLElement,
    options: google.maps.MapOptions,
    interactive: boolean,
    onLocationSelect?: (location: { lat: number; lng: number; address?: string }) => void
  ) {
    await loadGoogleMapsApi();
    const { Map } = (await window.google.maps.importLibrary("maps")) as unknown as GoogleMapsLibrary;
    
    this.mapInstance = new Map(container, options);
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

    return this.mapInstance;
  }

  clearMarkers() {
    this.markers.forEach(marker => {
      if (marker.map) marker.map = null;
    });
    this.markers.clear();
  }

  clearPolylines() {
    this.polylines.forEach(polyline => polyline.setMap(null));
    this.polylines.clear();
  }

  clearDirections() {
    this.directionsRenderers.forEach(renderer => renderer.setMap(null));
    this.directionsRenderers.clear();
  }

  async createMarker(position: google.maps.LatLngLiteral, content: HTMLElement) {
    if (!this.mapInstance) return null;
    
    const { AdvancedMarkerElement } = (await window.google.maps.importLibrary("marker")) as unknown as GoogleMapsLibrary;
    const marker = new AdvancedMarkerElement({
      map: this.mapInstance,
      position,
      content
    });
    
    return marker;
  }

  async createPolyline(path: google.maps.LatLngLiteral[], options: google.maps.PolylineOptions) {
    if (!this.mapInstance) return null;
    
    const { Polyline } = (await window.google.maps.importLibrary("maps")) as unknown as GoogleMapsLibrary;
    const polyline = new Polyline({
      path,
      map: this.mapInstance,
      ...options
    });
    
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
      directions
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

  fitBounds(locations: google.maps.LatLngLiteral[], padding = 50) {
    if (!this.mapInstance || locations.length === 0) return;
    
    const { LatLngBounds } = google.maps;
    const bounds = new LatLngBounds();
    locations.forEach(location => bounds.extend(location));
    this.mapInstance.fitBounds(bounds, padding);
  }

  setCenter(center: google.maps.LatLngLiteral) {
    if (!this.mapInstance) return;
    this.mapInstance.setCenter(center);
  }

 getCenter() {
    if (!this.mapInstance) return null;
    const center = this.mapInstance.getCenter();
    return center ? { lat: center.lat(), lng: center.lng() } : null;
  }

  getMapInstance() {
    return this.mapInstance;
  }

  setZoom(zoom: number) {
    if (!this.mapInstance) return;
    this.mapInstance.setZoom(zoom);
  }

  async initMarkerClusterer() {
    if (!this.mapInstance || this.markerClusterer) return;
    await window.google.maps.importLibrary("marker"); 
    this.markerClusterer = new MarkerClusterer({
        map: this.mapInstance,
        markers: [],
      });
  }

  async clusterMarkers(markers: google.maps.marker.AdvancedMarkerElement[]) {
    if (!this.mapInstance) return;
      if (this.markerClusterer) {
        this.markerClusterer.setMap(null);
        this.markerClusterer = null;
      }
      this.markerClusterer = new MarkerClusterer({
      map: this.mapInstance,
      markers: markers,
    });
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
    pin.className = "relative flex items-center justify-center transform transition-all hover:scale-110 cursor-pointer hover:z-10";
    
    const size = isFirst || isLast ? "w-10 h-10" : "w-8 h-8";
    const borderSize = isFirst || isLast ? "border-3" : "border-2";
    const textSize = isFirst || isLast ? "text-sm" : "text-xs";
    
    pin.innerHTML = `
      <div class="${size} ${borderSize} border-white rounded-full shadow-lg flex items-center justify-center text-white ${textSize} font-bold hover:shadow-xl transition-all" 
           style="background-color: ${color}; opacity: ${opacity}">
        ${isFirst ? '▶' : isLast ? '🏁' : number}
      </div>
      ${isFirst ? '<div class="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">Trip Start</div>' : ''}
      ${isLast ? '<div class="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">Trip End</div>' : ''}
    `;
    return pin;
  }

  createStandalonePin(color: string) {
    const pin = document.createElement("div");
    pin.className = "w-8 h-8 rounded-full border-2 border-white shadow-lg transform transition-all hover:scale-110 cursor-pointer hover:shadow-xl hover:z-10 relative";
    pin.style.backgroundColor = color;
    pin.innerHTML = `
      <div class="w-full h-full rounded-full animate-pulse absolute inset-0" 
           style="background-color: ${color}; opacity: 0.3; transform: scale(1.5);"></div>
    `;
    return pin;
  }

  createCurrentLocationPin() {
    const pin = document.createElement("div");
    pin.className = "w-6 h-6 rounded-full border-2 border-blue-500 bg-blue-400 shadow-lg relative animate-pulse";
    pin.innerHTML = `
      <div class="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping"></div>
      <div class="absolute inset-1 rounded-full bg-blue-500"></div>
    `;
    return pin;
  }

  showInfoWindow(content: string, position: google.maps.LatLngLiteral) {
    if (!this.mapInstance) return null;
    
    const { InfoWindow } = google.maps;
    const infoWindow = new InfoWindow({
      content,
      position,
      maxWidth: 300
    });
    
    infoWindow.open(this.mapInstance);
    return infoWindow;
  }
}