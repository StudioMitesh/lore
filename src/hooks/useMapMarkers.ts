import { useState, useRef, useCallback, useEffect } from 'react';
import type { MapLocation, TripWithDetails, Trip } from '@/lib/types';
import type { MapService } from '../services/mapService';

export function useMapMarkers(
  mapServiceRef: React.MutableRefObject<MapService | null>,
  locations: MapLocation[],
  trips: TripWithDetails[],
  selectedTripId: string | undefined,
  currentPosition: { lat: number; lng: number } | null,
  enableClustering: boolean,
  onLocationClick?: (location: MapLocation) => void,
  isLoading?: boolean
) {
  const [isUpdatingMarkers, setIsUpdatingMarkers] = useState(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showTripInfoWindow = useCallback((trip: Trip, position: { lat: number; lng: number }) => {
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
  }, [mapServiceRef]);

  const updateMarkers = useCallback(async () => {
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
  }, [
    mapServiceRef,
    locations,
    trips,
    selectedTripId,
    currentPosition,
    enableClustering,
    onLocationClick,
    isLoading,
    isUpdatingMarkers,
    showTripInfoWindow
  ]);

  const debouncedUpdateMarkers = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      updateMarkers();
    }, 100);
  }, [updateMarkers]);

  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  return {
    isUpdatingMarkers,
    debouncedUpdateMarkers,
  };
}