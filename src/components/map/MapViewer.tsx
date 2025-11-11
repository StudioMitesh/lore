'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useMapService } from '@/hooks/useMapService';
import { useMapSearch } from '@/hooks/useMapSearch';
import { useMapControls } from '@/hooks/useMapControls';
import { useMapMarkers } from '@/hooks/useMapMarkers';
import SearchComponent from './components/SearchComponent';
import ControlsComponent from './components/ControlsComponent';
import LegendComponent from './components/LegendComponent';
import SelectedTripComponent from './components/SelectedTripComponent';
import CompassComponent from './components/CompassComponent';
import LoadingOverlay from './components/LoadingOverlay';
import type { MapViewerProps } from '@/lib/types';

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
  const isInitializedRef = useRef(false);
  const initializationAttemptRef = useRef(false);

  const { mapServiceRef, isLoading, initializeMap, cleanup } = useMapService();
  const search = useMapSearch(mapServiceRef, interactive, onLocationSelect);
  const controls = useMapControls(mapServiceRef, isLoading);
  const { isUpdatingMarkers, debouncedUpdateMarkers } = useMapMarkers(
    mapServiceRef,
    locations,
    trips,
    selectedTripId,
    controls.currentPosition,
    enableClustering,
    onLocationClick,
    isLoading
  );

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    const initMap = async () => {
      if (initializationAttemptRef.current || isInitializedRef.current) {
        return;
      }

      if (!mapRef.current || !isMounted) return;

      if (mapServiceRef.current?.getMapInstance()) {
        isInitializedRef.current = true;
        return;
      }

      initializationAttemptRef.current = true;

      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!isMounted || !mapRef.current) {
          initializationAttemptRef.current = false;
          return;
        }

        await initializeMap(
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
        
        if (isMounted) {
          isInitializedRef.current = true;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        console.error('Map initialization error:', error);
        initializationAttemptRef.current = false;
        
        if (error?.message?.includes('OverQuotaMapError') || 
            error?.message?.includes('OVER_QUOTA') ||
            error?.message?.includes('quota exceeded')) {
          console.error('Google Maps API quota exceeded. Please check your API key billing and quota limits in Google Cloud Console.');
        }
      }
    };

    timeoutId = setTimeout(() => {
      initMap();
    }, 50);

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (isInitializedRef.current) {
        cleanup();
        isInitializedRef.current = false;
        initializationAttemptRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    if (!mapServiceRef.current || isLoading) return;
    debouncedUpdateMarkers();
  }, [debouncedUpdateMarkers, isLoading, mapServiceRef]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      search.handleManualSearch();
    }
    if (e.key === 'Escape') {
      search.clearSearch();
    }
  };

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
            <SearchComponent
              searchValue={search.searchValue}
              searchResults={search.searchResults}
              isSearching={search.isSearching}
              showSearchResults={search.showSearchResults}
              searchInputRef={search.searchInputRef}
              isInputFocused={search.isInputFocused}
              onSearchInput={search.handleSearchInput}
              onSearchResultSelect={search.handleSearchResultSelect}
              onClearSearch={search.clearSearch}
              onManualSearch={search.handleManualSearch}
              onSetShowSearchResults={search.setShowSearchResults}
              onSetIsInputFocused={search.setIsInputFocused}
              onKeyPress={handleKeyPress}
            />
          </div>

          {showControls && (
            <ControlsComponent
              mapType={controls.mapType}
              showTraffic={controls.showTraffic}
              showTransit={controls.showTransit}
              searchValue={search.searchValue}
              isSearching={search.isSearching}
              onMapTypeChange={controls.setMapType}
              onTrafficToggle={() => controls.setShowTraffic(!controls.showTraffic)}
              onTransitToggle={() => controls.setShowTransit(!controls.showTransit)}
              onManualSearch={search.handleManualSearch}
              onGetCurrentLocation={controls.getCurrentLocation}
            />
          )}
        </div>
      )}

      <LoadingOverlay isLoading={isLoading} isUpdatingMarkers={isUpdatingMarkers} />

      {interactive && !isLoading && (
        <div className="absolute bottom-20 left-4 bg-white/95 backdrop-blur-sm border-2 border-gray-200 rounded-lg p-3 z-10 shadow-lg">
          <p className="text-sm text-gray-700 font-medium">📍 Click on the map to set location</p>
        </div>
      )}

      <div ref={mapRef} className="w-full h-full" />

      {(locations.length > 0 || trips.length > 0) && (
        <LegendComponent 
          locations={locations} 
          trips={trips} 
          currentPosition={controls.currentPosition} 
          interactive={interactive} 
        />
      )}

      <SelectedTripComponent trips={trips} selectedTripId={selectedTripId} />

      <CompassComponent />
    </div>
  );
}