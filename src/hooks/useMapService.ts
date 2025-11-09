import { useState, useCallback } from 'react';
import { MapService } from '../services/mapService';

export function useMapService() {
  const [mapServiceRef] = useState<React.MutableRefObject<MapService | null>>({ current: null });
  const [isLoading, setIsLoading] = useState(true);

  const initializeMap = useCallback(async (
    container: HTMLElement,
    options: google.maps.MapOptions,
    interactive: boolean,
    onLocationSelect?: (location: { lat: number; lng: number; address?: string }) => void
  ) => {
    if (mapServiceRef.current?.getMapInstance()) {
      console.warn('Map service already initialized');
      setIsLoading(false);
      return mapServiceRef.current;
    }

    try {
      setIsLoading(true);
      
      if (!mapServiceRef.current) {
        mapServiceRef.current = new MapService();
      }

      await mapServiceRef.current.initializeMap(
        container,
        options,
        interactive,
        onLocationSelect
      );
      setIsLoading(false);
      return mapServiceRef.current;
    } catch (error: any) {
      console.error('Failed to initialize map:', error);
      setIsLoading(false);
      
      if (error?.message?.includes('quota') || error?.message?.includes('OVER_QUOTA')) {
        throw new Error('Google Maps API quota exceeded. Please check your billing and quota limits.');
      }
      
      throw error;
    }
  }, [mapServiceRef]);

  const cleanup = useCallback(() => {
    if (mapServiceRef.current) {
      mapServiceRef.current.destroy();
      mapServiceRef.current = null;
    }
  }, [mapServiceRef]);

  return {
    mapServiceRef,
    isLoading,
    initializeMap,
    cleanup,
    setIsLoading
  };
}