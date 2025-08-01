'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Layers,
  Route,
  Navigation,
  Satellite,
  Map as MapIcon,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getPlaceDetailsFromPlaceId, getAutocompleteSuggestions } from '@/services/geocoding';
import { MapService } from '@/services/mapService';
import type {
  Trip,
  TripWithDetails,
  AutocompletePrediction,
  MapLocation,
  TripRoute,
} from '@/lib/types';

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
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState<AutocompletePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [mapType, setMapType] = useState<string>('roadmap');
  const [showTraffic, setShowTraffic] = useState(false);
  const [showTransit, setShowTransit] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isUpdatingMarkers, setIsUpdatingMarkers] = useState(false);

  useEffect(() => {
    const initializeMap = async () => {
      try {
        if (!mapRef.current) return;

        setIsLoading(true);
        const mapService = new MapService();
        mapServiceRef.current = mapService;

        await mapService.initializeMap(
          mapRef.current,
          {
            center,
            zoom,
            mapId: '4578ddca5379c217baab8a20',
            disableDefaultUI: !showControls,
            mapTypeControl: showControls,
            streetViewControl: showControls,
            fullscreenControl: showControls,
            zoomControl: showControls,
            gestureHandling: 'greedy',
          },
          interactive,
          onLocationSelect
        );
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize map:', error);
        setIsLoading(false);
      }
    };

    initializeMap();

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      mapServiceRef.current = null;
    };
  }, [center, interactive, onLocationSelect, showControls, zoom]);

  useEffect(() => {
    if (!isLoading && mapServiceRef.current) {
      mapServiceRef.current.setMapType(mapType);
    }
  }, [mapType, isLoading]);

  useEffect(() => {
    if (!isLoading && mapServiceRef.current) {
      mapServiceRef.current.toggleTraffic(showTraffic);
    }
  }, [showTraffic, isLoading]);

  useEffect(() => {
    if (!isLoading && mapServiceRef.current) {
      mapServiceRef.current.toggleTransit(showTransit);
    }
  }, [showTransit, isLoading]);

  const debouncedUpdateMarkers = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      updateMarkersInternal();
    }, 100);
  }, [locations, trips, selectedTripId, currentPosition, enableClustering, onLocationClick]);

  useEffect(() => {
    if (!mapServiceRef.current || isLoading) return;
    debouncedUpdateMarkers();
  }, [debouncedUpdateMarkers, isLoading]);

  const updateMarkersInternal = async () => {
    if (!mapServiceRef.current || isLoading || isUpdatingMarkers) return;

    setIsUpdatingMarkers(true);

    try {
      const mapService = mapServiceRef.current;
      mapService.clearMarkers();
      mapService.clearPolylines();
      mapService.closeInfoWindow();

      if (enableClustering) {
        await mapService.initMarkerClusterer();
      }

      const tripLocations = new Map<string, MapLocation[]>();
      const standaloneLocations: MapLocation[] = [];

      locations.forEach((location) => {
        if (location.tripId && location.trip) {
          if (!tripLocations.has(location.tripId)) {
            tripLocations.set(location.tripId, []);
          }
          tripLocations.get(location.tripId)!.push(location);
        } else {
          standaloneLocations.push(location);
        }
      });

      const allMarkers: google.maps.marker.AdvancedMarkerElement[] = [];

      for (const [tripId, tripLocs] of tripLocations) {
        const trip = trips.find((t) => t.id === tripId);
        if (!trip) continue;

        const isSelected = selectedTripId === tripId;
        const tripColor = mapService.getTripColor(trip.status);
        const opacity = selectedTripId && !isSelected ? 0.4 : 1.0;

        const sortedLocs = tripLocs.sort((a, b) => {
          if (a.entry && b.entry) {
            return new Date(a.entry.timestamp).getTime() - new Date(b.entry.timestamp).getTime();
          }
          return 0;
        });

        if (sortedLocs.length > 1) {
          const path = sortedLocs.map((loc) => ({ lat: loc.lat, lng: loc.lng }));
          const polyline = await mapService.createPolyline(
            path,
            {
              strokeColor: tripColor,
              strokeOpacity: opacity * 0.8,
              strokeWeight: isSelected ? 4 : 2,
              geodesic: true,
            },
            `trip-route-${tripId}`
          );

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
            pin,
            `trip-${tripId}-${location.id}`
          );

          if (marker) {
            pin.addEventListener('click', (e: Event) => {
              e.stopPropagation();
              mapService.closeInfoWindow();
              onLocationClick?.(location);

              mapService.animateToLocation({ lat: location.lat, lng: location.lng }, 14);
            });

            pin.addEventListener('mouseenter', () => {
              const content = `
                <div class="p-3 max-w-xs">
                  <h3 class="font-bold text-sm mb-1">${location.name}</h3>
                  <p class="text-xs text-gray-600">${trip.name}</p>
                  ${location.entry ? `<p class="text-xs text-gray-500 mt-1">${new Date(location.entry.timestamp).toLocaleDateString()}</p>` : ''}
                </div>
              `;
              mapService.showInfoWindow(content, {
                lat: location.lat,
                lng: location.lng,
              });
            });

            allMarkers.push(marker);
          }
        }
      }

      for (const location of standaloneLocations) {
        const pinColor =
          location.type === 'visited'
            ? '#d4af37'
            : location.type === 'planned'
              ? '#4c6b54'
              : '#b22222';
        const pin = mapService.createStandalonePin(pinColor, location.type as any);

        const marker = await mapService.createMarker(
          { lat: location.lat, lng: location.lng },
          pin,
          `standalone-${location.id}`
        );

        if (marker) {
          pin.addEventListener('click', (e: Event) => {
            e.stopPropagation();
            mapService.closeInfoWindow();
            onLocationClick?.(location);

            mapService.animateToLocation({ lat: location.lat, lng: location.lng }, 14);
          });

          pin.addEventListener('mouseenter', () => {
            const content = `
              <div class="p-3 max-w-xs">
                <h3 class="font-bold text-sm mb-1">${location.name}</h3>
                <p class="text-xs text-gray-600 capitalize">${location.type} Location</p>
                ${location.entry ? `<p class="text-xs text-gray-500 mt-1">${new Date(location.entry.timestamp).toLocaleDateString()}</p>` : ''}
              </div>
            `;
            mapService.showInfoWindow(content, {
              lat: location.lat,
              lng: location.lng,
            });
          });

          allMarkers.push(marker);
        }
      }

      if (currentPosition) {
        const pin = mapService.createCurrentLocationPin();
        const marker = await mapService.createMarker(currentPosition, pin, 'current-location');
        if (marker) {
          pin.addEventListener('click', () => {
            const content = `
              <div class="p-3">
                <h3 class="font-bold text-sm">Your Current Location</h3>
                <p class="text-xs text-gray-600">Lat: ${currentPosition.lat.toFixed(6)}</p>
                <p class="text-xs text-gray-600">Lng: ${currentPosition.lng.toFixed(6)}</p>
              </div>
            `;
            mapService.showInfoWindow(content, currentPosition);
          });
          allMarkers.push(marker);
        }
      }

      if (enableClustering && allMarkers.length > 10) {
        await mapService.initMarkerClusterer();
      } else {
        allMarkers.forEach((marker) => {
          if (mapService.getMapInstance()) {
            marker.map = mapService.getMapInstance();
          }
        });
      }

      const allLocations = locations.map((loc) => ({ lat: loc.lat, lng: loc.lng }));
      if (currentPosition) allLocations.push(currentPosition);

      if (allLocations.length > 0) {
        if (selectedTripId) {
          const selectedTripLocs = locations
            .filter((loc) => loc.tripId === selectedTripId)
            .map((loc) => ({ lat: loc.lat, lng: loc.lng }));

          if (selectedTripLocs.length > 0) {
            mapService.fitBounds(selectedTripLocs, 100);
          }
        } else if (allLocations.length === 1) {
          mapService.setCenter(allLocations[0]);
          mapService.setZoom(12, true);
        } else {
          const optimalZoom = mapService.getOptimalZoom(allLocations);
          mapService.fitBounds(allLocations, 80);

          setTimeout(() => {
            const currentZoom = mapService.getMapInstance()?.getZoom();
            if (currentZoom && (currentZoom < 3 || currentZoom > 15)) {
              mapService.setZoom(Math.max(3, Math.min(15, optimalZoom)), true);
            }
          }, 500);
        }
      } else if (locations.length === 0) {
        mapService.setCenter({ lat: 20, lng: 0 });
        mapService.setZoom(3, true);
      }
    } catch (error) {
      console.error('Error updating markers:', error);
    } finally {
      setIsUpdatingMarkers(false);
    }
  };

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
        undefined,
        mapServiceRef.current
          ? {
              lat: mapServiceRef.current.getCenter()?.lat || 0,
              lng: mapServiceRef.current.getCenter()?.lng || 0,
              radius: 50000,
            }
          : undefined
      );

      setSearchResults(results);
      setShowSearchResults(results.length > 0);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchInput = useCallback(
    (value: string) => {
      setSearchValue(value);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        performSearch(value);
      }, 300);
    },
    [performSearch]
  );

  const handleSearchResultSelect = useCallback(
    async (result: AutocompletePrediction) => {
      try {
        const placeDetails = await getPlaceDetailsFromPlaceId(result.placeId);

        if (!placeDetails.coordinates) {
          throw new Error('No coordinates found for this place');
        }

        const { lat, lng } = placeDetails.coordinates;

        if (mapServiceRef.current) {
          mapServiceRef.current.animateToLocation({ lat, lng }, 15);
        }

        setSearchValue(placeDetails.name);
        setShowSearchResults(false);

        if (interactive && onLocationSelect) {
          onLocationSelect({
            lat,
            lng,
            address: placeDetails.address,
          });
        }
      } catch (error) {
        console.error('Failed to navigate to search result:', error);
      }
    },
    [interactive, onLocationSelect]
  );

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setCurrentPosition({ lat, lng });

        if (mapServiceRef.current) {
          mapServiceRef.current.animateToLocation({ lat, lng }, 14);
        }
      },
      (error) => {
        console.error('Geolocation failed:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  const clearSearch = useCallback(() => {
    setSearchValue('');
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

    const content = `
      <div class="p-4 max-w-xs">
        <h3 class="font-bold text-lg mb-2 text-gray-800">${trip.name}</h3>
        <p class="text-gray-600 mb-3 text-sm">${trip.description || 'No description available'}</p>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="bg-gray-100 rounded p-2">
            <span class="font-medium">Status:</span>
            <span class="capitalize ml-1">${trip.status}</span>
          </div>
          <div class="bg-gray-100 rounded p-2">
            <span class="font-medium">Entries:</span>
            <span class="ml-1">${trip.totalEntries || 0}</span>
          </div>
          <div class="bg-gray-100 rounded p-2 col-span-2">
            <span class="font-medium">Countries:</span>
            <span class="ml-1">${trip.countriesVisited?.length || 0}</span>
          </div>
        </div>
      </div>
    `;

    mapServiceRef.current.showInfoWindow(content, position);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleManualSearch();
    }
    if (e.key === 'Escape') {
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

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className={cn(
        'relative w-full h-full min-h-[500px] rounded-2xl overflow-hidden bg-gray-50',
        className
      )}
    >
      {showSearch && (
        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between">
          <div className="relative flex gap-2">
            <div className="relative search-input-container" onClick={handleSearchContainerClick}>
              <Popover open={showSearchResults} onOpenChange={setShowSearchResults}>
                <PopoverTrigger asChild>
                  <div>
                    <Input
                      ref={searchInputRef}
                      placeholder="Search locations..."
                      className="pl-10 pr-10 bg-white/95 backdrop-blur-sm border-2 border-gray-200 shadow-lg w-80 h-12 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl transition-all duration-200"
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
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                </div>
              )}
              {searchValue && !isSearching && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearSearch();
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
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
                className="bg-white/95 backdrop-blur-sm border-2 border-gray-200 shadow-lg hover:bg-gray-50 h-12 w-12 transition-all duration-200"
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
                className="bg-white/95 backdrop-blur-sm border-2 border-gray-200 shadow-lg hover:bg-gray-50 h-12 w-12 transition-all duration-200"
                onClick={getCurrentLocation}
              >
                <Navigation className="h-5 w-5" />
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="bg-white/95 backdrop-blur-sm border-2 border-gray-200 shadow-lg hover:bg-gray-50 h-12 w-12 transition-all duration-200"
                  >
                    <Layers className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 bg-white/98 backdrop-blur-sm shadow-2xl border-2 border-gray-200 rounded-xl p-4">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Map Type
                      </label>
                      <ToggleGroup
                        type="single"
                        value={mapType}
                        onValueChange={setMapType}
                        className="grid grid-cols-2 gap-1"
                      >
                        <ToggleGroupItem value="roadmap" size="sm" className="text-xs">
                          <MapIcon className="h-4 w-4 mr-1" />
                          Road
                        </ToggleGroupItem>
                        <ToggleGroupItem value="satellite" size="sm" className="text-xs">
                          <Satellite className="h-4 w-4 mr-1" />
                          Satellite
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 block">Layers</label>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant={showTraffic ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setShowTraffic(!showTraffic)}
                          className="justify-start text-xs"
                        >
                          🚦 Traffic
                        </Button>
                        <Button
                          variant={showTransit ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setShowTransit(!showTransit)}
                          className="justify-start text-xs"
                        >
                          🚇 Transit
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
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm z-20">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600 font-medium">Loading your map...</p>
            <p className="text-gray-400 text-sm mt-1">Preparing markers and routes</p>
          </div>
        </div>
      )}

      {isUpdatingMarkers && !isLoading && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-blue-500/90 text-white px-4 py-2 rounded-full text-sm font-medium z-20 backdrop-blur-sm">
          <Loader2 className="h-4 w-4 inline mr-2 animate-spin" />
          Updating markers...
        </div>
      )}

      {interactive && !isLoading && (
        <div className="absolute bottom-20 left-4 bg-white/95 backdrop-blur-sm border-2 border-gray-200 rounded-lg p-3 z-10 shadow-lg">
          <p className="text-sm text-gray-700 font-medium">📍 Click on the map to set location</p>
        </div>
      )}

      <div ref={mapRef} className="w-full h-full" />

      {(locations.length > 0 || trips.length > 0) && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute top-20 left-4 bg-white/95 backdrop-blur-sm border-2 border-gray-200 rounded-xl p-4 z-10 shadow-lg max-w-xs"
        >
          <div className="space-y-3">
            <div className="text-sm font-bold text-gray-800 mb-3 pb-2 border-b border-gray-200">
              Map Legend
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-[#d4af37] border-2 border-white shadow-sm"></div>
                <span className="text-xs text-gray-700">Completed/Visited</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-[#4c6b54] border-2 border-white shadow-sm"></div>
                <span className="text-xs text-gray-700">Active/Planned</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-[#b22222] border-2 border-white shadow-sm"></div>
                <span className="text-xs text-gray-700">Draft/Favorite</span>
              </div>
            </div>

            {trips.length > 0 && (
              <>
                <hr className="border-gray-200 my-3" />
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Route className="w-4 h-4 text-gray-600" />
                    <span className="text-xs text-gray-700">Trip Routes</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm">🚀</span>
                    <span className="text-xs text-gray-700">Trip Start</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm">🏁</span>
                    <span className="text-xs text-gray-700">Trip End</span>
                  </div>
                </div>
              </>
            )}

            {currentPosition && (
              <>
                <hr className="border-gray-200 my-3" />
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-sm animate-pulse"></div>
                  <span className="text-xs text-gray-700">Your Location</span>
                </div>
              </>
            )}

            <hr className="border-gray-200 my-3" />
            <div className="text-xs text-gray-500 italic">
              💡 {interactive ? 'Click locations for details' : 'Hover & click for info'}
            </div>
          </div>
        </motion.div>
      )}

      {selectedTripId && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 right-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-3 z-10 shadow-lg backdrop-blur-sm"
        >
          <div className="text-sm font-bold">
            🎯 Viewing: {trips.find((t) => t.id === selectedTripId)?.name}
          </div>
        </motion.div>
      )}

      <div className="absolute bottom-8 right-8 w-20 h-20 opacity-70 pointer-events-none">
        <motion.div
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          className="w-full h-full"
        >
          <svg width="80" height="80" viewBox="0 0 80 80" className="text-gray-600">
            <defs>
              <radialGradient id="compassGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.1" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.3" />
              </radialGradient>
            </defs>
            <circle
              cx="40"
              cy="40"
              r="35"
              fill="url(#compassGradient)"
              stroke="currentColor"
              strokeWidth="1"
              opacity="0.5"
            />
            <path
              d="M40 5 L44 35 L75 40 L44 45 L40 75 L36 45 L5 40 L36 35 Z"
              fill="currentColor"
              fillOpacity="0.2"
              stroke="currentColor"
              strokeWidth="0.5"
            />
            <path
              d="M40 15 L42 38 L65 40 L42 42 L40 65 L38 42 L15 40 L38 38 Z"
              fill="currentColor"
              fillOpacity="0.3"
            />
            <circle cx="40" cy="40" r="4" fill="currentColor" />
            <text
              x="40"
              y="12"
              textAnchor="middle"
              fontSize="10"
              fill="currentColor"
              fontWeight="bold"
            >
              N
            </text>
          </svg>
        </motion.div>
      </div>
    </div>
  );
}
