"use client"

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Layers, MapPin, Route, Navigation, Satellite, Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getPlaceDetailsFromPlaceId, getAutocompleteSuggestions } from "@/services/geocoding";
import { MapService } from "@/services/mapService";
import type { Trip, TripWithDetails, AutocompletePrediction, MapLocation, TripRoute } from "@/lib/types";

interface MapViewerProps {
  locations: MapLocation[];
  trips?: TripWithDetails[];
  selectedTripId?: string;
  className?: string;
  onLocationSelect?: (location: { lat: number; lng: number; address?: string }) => void;
  onLocationClick?: (location: MapLocation) => void;
  interactive?: boolean;
  center?: { lat: number; lng: number };
  zoom?: number;
  showSearch?: boolean;
  showControls?: boolean;
  tripRoutes?: TripRoute[];
  selectedRouteId?: string;
  showRouteOptimization?: boolean;
  enableClustering?: boolean;
  showStreetView?: boolean;
  customMapStyle?: google.maps.MapTypeStyle[];
}

export function MapViewer({ 
  locations, 
  trips = [], 
  selectedTripId, 
  className, 
  onLocationSelect, 
  onLocationClick, 
  interactive = false, 
  center = { lat: 20, lng: 0 }, 
  zoom = 2,
  showSearch = true,
  showControls = true,
  enableClustering = false,
}: MapViewerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapServiceRef = useRef<MapService | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState<AutocompletePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [mapType, setMapType] = useState<string>("roadmap");
  const [showTraffic, setShowTraffic] = useState(false);
  const [showTransit, setShowTransit] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Initialize map
  useEffect(() => {
    const initializeMap = async () => {
      try {
        if (!mapRef.current) return;
        
        const mapService = new MapService();
        mapServiceRef.current = mapService;
        
        await mapService.initializeMap(
          mapRef.current,
          {
            center,
            zoom,
            mapId: "4578ddca5379c217baab8a20",
            disableDefaultUI: !showControls,
            mapTypeControl: showControls,
            streetViewControl: showControls,
            fullscreenControl: showControls,
            zoomControl: showControls,
          },
          interactive,
          onLocationSelect
        );

        if (enableClustering) {
          await mapService.initMarkerClusterer();
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Failed to initialize map:", error);
        setIsLoading(false);
      }
    };

    initializeMap();

    return () => {
      mapServiceRef.current = null;
    };
  }, [center, enableClustering, interactive, onLocationSelect, showControls, zoom]);

  // Update map type
  useEffect(() => {
    if (!isLoading && mapServiceRef.current) {
      mapServiceRef.current.setMapType(mapType);
    }
  }, [mapType, isLoading]);

  // Toggle traffic layer
  useEffect(() => {
    if (!isLoading && mapServiceRef.current) {
      mapServiceRef.current.toggleTraffic(showTraffic);
    }
  }, [showTraffic, isLoading]);

  // Toggle transit layer
  useEffect(() => {
    if (!isLoading && mapServiceRef.current) {
      mapServiceRef.current.toggleTransit(showTransit);
    }
  }, [showTransit, isLoading]);

  // Update markers when locations change
  useEffect(() => {
    if (!mapServiceRef.current || isLoading) return;
  
    const updateMarkers = async () => {
      const mapService = mapServiceRef.current!;
      mapService.clearMarkers();
      mapService.clearPolylines();
  
      // Prepare clustering if needed
      if (enableClustering) {
        await mapService.initMarkerClusterer();
      }
  
      const tripLocations = new Map<string, MapLocation[]>();
      const standaloneLocations: MapLocation[] = [];
  
      locations.forEach(location => {
        if (location.tripId && location.trip) {
          if (!tripLocations.has(location.tripId)) {
            tripLocations.set(location.tripId, []);
          }
          tripLocations.get(location.tripId)!.push(location);
        } else {
          standaloneLocations.push(location);
        }
      });
  
      const markers: google.maps.marker.AdvancedMarkerElement[] = [];
  
      for (const [tripId, tripLocs] of tripLocations) {
        const trip = trips.find(t => t.id === tripId);
        if (!trip) continue;
  
        const isSelected = selectedTripId === tripId;
        const tripColor = mapService.getTripColor(trip.status);
        const opacity = selectedTripId && !isSelected ? 0.3 : 1.0;
  
        const sortedLocs = tripLocs.sort((a, b) => {
          if (a.entry && b.entry) {
            return new Date(a.entry.timestamp).getTime() - new Date(b.entry.timestamp).getTime();
          }
          return 0;
        });
  
        if (sortedLocs.length > 1) {
          const path = sortedLocs.map(loc => ({ lat: loc.lat, lng: loc.lng }));
          const polyline = await mapService.createPolyline(path, {
            geodesic: true,
            strokeColor: tripColor,
            strokeOpacity: opacity * 0.8,
            strokeWeight: isSelected ? 4 : 2
          });
  
          if (polyline) {
            polyline.addListener('click', (event: any) => {
              showTripInfoWindow(trip, event.latLng);
            });
          }
        }
  
        for (const [index, location] of sortedLocs.entries()) {
          const isFirst = index === 0;
          const isLast = index === sortedLocs.length - 1;
          const pin = mapService.createTripPin(tripColor, opacity, isFirst, isLast, index + 1);
  
          const marker = await mapService.createMarker(
            { lat: location.lat, lng: location.lng },
            pin
          );
  
          if (marker) {
            pin.addEventListener('click', (e: Event) => {
              e.stopPropagation();
              onLocationClick?.(location);
            });
            markers.push(marker);
          }
        }
      }
  
      for (const location of standaloneLocations) {
        const pinColor = location.type === "visited" ? "#d4af37" :
                         location.type === "planned" ? "#4c6b54" : "#b22222";
        const pin = mapService.createStandalonePin(pinColor);
  
        const marker = await mapService.createMarker(
          { lat: location.lat, lng: location.lng },
          pin
        );
  
        if (marker) {
          pin.addEventListener('click', (e: Event) => {
            e.stopPropagation();
            onLocationClick?.(location);
          });
          markers.push(marker);
        }
      }
  
      if (currentPosition) {
        const pin = mapService.createCurrentLocationPin();
        const marker = await mapService.createMarker(currentPosition, pin);
        if (marker) markers.push(marker);
      }
  
      if (enableClustering && markers.length > 0) {
        await mapService.clusterMarkers(markers);
      } else {
        // if not clustering, manually set markers on map
        markers.forEach(marker => {
          marker.map = mapServiceRef.current!.getMapInstance();
        });
      }
  
      const allLocations = locations.map(loc => ({ lat: loc.lat, lng: loc.lng }));
      if (currentPosition) allLocations.push(currentPosition);
      mapService.fitBounds(allLocations);
    };
  
    updateMarkers();
  }, [locations, trips, selectedTripId, isLoading, onLocationClick, currentPosition, enableClustering]);  

  // Handle search functionality
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
  
    setIsSearching(true);
    
    try {
      const results = await getAutocompleteSuggestions(
        query,
        undefined, // No session token needed
        mapServiceRef.current ? {
          lat: mapServiceRef.current.getCenter()?.lat || 0,
          lng: mapServiceRef.current.getCenter()?.lng || 0,
          radius: 50000
        } : undefined
      );
      
      setSearchResults(results);
      setShowSearchResults(results.length > 0);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchInput = useCallback((value: string) => {
    setSearchValue(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  }, [performSearch]);

  const handleSearchResultSelect = useCallback(async (result: AutocompletePrediction) => {
    try {
      const placeDetails = await getPlaceDetailsFromPlaceId(result.placeId);
      
      if (!placeDetails.coordinates) {
        throw new Error('No coordinates found for this place');
      }
      
      const { lat, lng } = placeDetails.coordinates;
      
      if (mapServiceRef.current) {
        mapServiceRef.current.setCenter({ lat, lng });
        mapServiceRef.current.setZoom(15);
      }
      
      setSearchValue(placeDetails.name);
      setShowSearchResults(false);
      
      if (interactive && onLocationSelect) {
        onLocationSelect({ 
          lat, 
          lng, 
          address: placeDetails.address 
        });
      }
    } catch (error) {
      console.error("Failed to navigate to search result:", error);
    }
  }, [interactive, onLocationSelect]);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        setCurrentPosition({ lat, lng });
        
        if (mapServiceRef.current) {
          mapServiceRef.current.setCenter({ lat, lng });
          mapServiceRef.current.setZoom(12);
        }
      },
      (error) => {
        console.error("Geolocation failed:", error);
      }
    );
  }, []);

  const clearSearch = useCallback(() => {
    setSearchValue("");
    setSearchResults([]);
    setShowSearchResults(false);
  }, []);

  const handleManualSearch = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    performSearch(searchValue);
  }, [searchValue, performSearch]);

  const showTripInfoWindow = (trip: Trip, position: { lat: number; lng: number }) => {
    if (!mapServiceRef.current) return;
    
    mapServiceRef.current.showInfoWindow(`
      <div class="p-3 max-w-xs">
        <h3 class="font-bold text-lg mb-2">${trip.name}</h3>
        <p class="text-gray-600 mb-2">${trip.description || 'No description'}</p>
        <div class="flex items-center gap-2 text-sm text-gray-500">
          <span class="capitalize">${trip.status}</span>
          <span>•</span>
          <span>${trip.totalEntries || 0} entries</span>
          <span>•</span>
          <span>${trip.countriesVisited?.length || 0} countries</span>
        </div>
      </div>
    `, position);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleManualSearch();
    }
    if (e.key === "Escape") {
      clearSearch();
    }
  };

  const handleSearchContainerClick = () => {
    if (!isInputFocused && searchInputRef.current) {
      searchInputRef.current.focus();
      const valueLength = searchInputRef.current.value.length;
      searchInputRef.current.setSelectionRange(valueLength, valueLength);
    }
  };

  return (
    <div className={cn("relative w-full h-full min-h-[500px] rounded-2xl overflow-hidden", className)}>
      {/* Search and Controls */}
      {showSearch && (
        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between">
          <div className="relative flex gap-2">
            <div 
              className="relative search-input-container"
              onClick={handleSearchContainerClick}
            >
              <Popover open={showSearchResults} onOpenChange={setShowSearchResults}>
                <PopoverTrigger asChild>
                  <div>
                    <Input
                      ref={searchInputRef}
                      placeholder="Search locations..."
                      className="pl-10 pr-10 bg-white/95 backdrop-blur-sm border-2 border-gray-200 shadow-lg w-80 h-12 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl"
                      value={searchValue}
                      onChange={(e) => {
                        handleSearchInput(e.target.value);
                        if (e.target.value) {
                          setShowSearchResults(true);
                        }
                      }}
                      onKeyDown={handleKeyPress}
                      onFocus={() => {
                        setIsInputFocused(true);
                        if (searchValue && searchResults.length > 0) {
                          setShowSearchResults(true);
                        }
                      }}
                      onBlur={() => {
                        setIsInputFocused(false);
                        setTimeout(() => setShowSearchResults(false), 200);
                      }}
                    />
                  </div>
                </PopoverTrigger>
                <PopoverContent 
                  className="p-0 w-80 bg-white/98 backdrop-blur-sm shadow-2xl border-2 border-gray-200 rounded-xl mt-2" 
                  align="start"
                  onPointerDownOutside={(e) => {
                    if (!(e.target as HTMLElement).closest('.search-input-container')) {
                      setShowSearchResults(false);
                    }
                  }}
                  onOpenAutoFocus={(e) => e.preventDefault()}
                  onCloseAutoFocus={(e) => e.preventDefault()}
                >
                  <div className="max-h-80 overflow-y-auto">
                    {searchResults.length === 0 && searchValue && !isSearching ? (
                      <div className="p-4 text-center text-gray-500">
                        No results found for "{searchValue}"
                      </div>
                    ) : (
                      searchResults.map((result, index) => (
                        <div
                          key={`${result.placeId}-${index}`}
                          className="p-4 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            handleSearchResultSelect(result);
                            setShowSearchResults(false);
                          }}
                        >
                          <div className="font-semibold text-gray-800 text-base mb-1">
                            {result.structuredFormatting.mainText}
                          </div>
                          <div className="text-sm text-gray-600">
                            {result.structuredFormatting.secondaryText}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                </div>
              )}
              {searchValue && !isSearching && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearSearch();
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl font-bold w-6 h-6 flex items-center justify-center"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {showControls && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                className="bg-white/95 backdrop-blur-sm border-2 border-gray-200 shadow-lg hover:bg-gray-50 h-12 w-12"
                onClick={() => {
                    if (searchValue.trim()) {
                    handleManualSearch();
                    searchInputRef.current?.focus();
                    setTimeout(() => {
                        if (searchInputRef.current) {
                        const len = searchInputRef.current.value.length;
                        searchInputRef.current.setSelectionRange(len, len);
                        }
                    }, 0);
                    }
                }}
                disabled={!searchValue.trim() || isSearching}
                >
                <Search className="h-5 w-5" />
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                className="bg-white/95 backdrop-blur-sm border-2 border-gray-200 shadow-lg hover:bg-gray-50 h-12 w-12"
                onClick={getCurrentLocation}
              >
                <Navigation className="h-5 w-5" />
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="bg-white/95 backdrop-blur-sm border-2 border-gray-200 shadow-lg hover:bg-gray-50 h-12 w-12"
                  >
                    <Layers className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 bg-white/98 backdrop-blur-sm shadow-2xl border-2 border-gray-200">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Map Type</label>
                      <ToggleGroup type="single" value={mapType} onValueChange={setMapType} className="mt-1">
                        <ToggleGroupItem value="roadmap" size="sm">
                          <MapIcon className="h-4 w-4 mr-1" />
                          Road
                        </ToggleGroupItem>
                        <ToggleGroupItem value="satellite" size="sm">
                          <Satellite className="h-4 w-4 mr-1" />
                          Satellite
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Layers</label>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant={showTraffic ? "default" : "outline"}
                          size="sm"
                          onClick={() => setShowTraffic(!showTraffic)}
                        >
                          Traffic
                        </Button>
                        <Button
                          variant={showTransit ? "default" : "outline"}
                          size="sm"
                          onClick={() => setShowTransit(!showTransit)}
                        >
                          Transit
                        </Button>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-parchment/80 z-20">
          <div className="text-center">
            <MapPin className="h-8 w-8 text-gold mx-auto mb-2 animate-pulse" />
            <p className="text-deepbrown/70">Loading map...</p>
          </div>
        </div>
      )}

      {interactive && !isLoading && (
        <div className="absolute bottom-20 left-4 bg-parchment/90 backdrop-blur-sm border border-gold/30 rounded-lg p-3 z-10">
          <p className="text-sm text-deepbrown/70">Click on the map to set location</p>
        </div>
      )}

      <div ref={mapRef} className="w-full h-full" />

      {/* Compass Rose */}
      <div className="absolute bottom-8 right-8 w-24 h-24 opacity-80 pointer-events-none">
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          >
            <svg width="60" height="60" viewBox="0 0 60 60" className="text-deepbrown/70">
              <path
                d="M30 0 L34 26 L60 30 L34 34 L30 60 L26 34 L0 30 L26 26 Z"
                fill="currentColor"
                fillOpacity="0.2"
                stroke="currentColor"
                strokeWidth="0.5"
              />
              <path
                d="M30 10 L32 28 L50 30 L32 32 L30 50 L28 32 L10 30 L28 28 Z"
                fill="currentColor"
                fillOpacity="0.3"
              />
              <circle cx="30" cy="30" r="3" fill="currentColor" />
            </svg>
          </motion.div>
        </div>
      </div>

      {/* Legend */}
      {(locations.length > 0 || trips.length > 0) && (
        <div className="absolute top-20 left-4 bg-parchment/90 backdrop-blur-sm border border-gold/30 rounded-lg p-3 z-10">
          <div className="space-y-2">
            <div className="text-xs font-medium text-deepbrown mb-2">Legend</div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#d4af37] border border-white"></div>
              <span className="text-xs text-deepbrown/70">Completed/Visited</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#4c6b54] border border-white"></div>
              <span className="text-xs text-deepbrown/70">Active/Planned</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#b22222] border border-white"></div>
              <span className="text-xs text-deepbrown/70">Draft/Favorite</span>
            </div>
            {trips.length > 0 && (
              <>
                <hr className="border-gold/20 my-2" />
                <div className="flex items-center gap-2">
                  <Route className="w-3 h-3 text-deepbrown/70" />
                  <span className="text-xs text-deepbrown/70">Trip Routes</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold">▶</span>
                  <span className="text-xs text-deepbrown/70">Trip Start</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs">🏁</span>
                  <span className="text-xs text-deepbrown/70">Trip End</span>
                </div>
              </>
            )}
            <hr className="border-gold/20 my-2" />
            <div className="text-xs text-deepbrown/50">
              {interactive ? "Click locations for details" : "Click any location for details"}
            </div>
          </div>
        </div>
      )}

      {selectedTripId && (
        <div className="absolute top-4 right-4 bg-gold/90 backdrop-blur-sm border border-gold/30 rounded-lg p-2 z-10">
          <div className="text-xs text-deepbrown font-medium">
            Trip Selected: {trips.find(t => t.id === selectedTripId)?.name}
          </div>
        </div>
      )}
    </div>
  );
}