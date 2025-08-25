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
    try {
      setIsLoading(true);
      const mapService = new MapService();
      mapServiceRef.current = mapService;

      await mapService.initializeMap(
        container,
        options,
        interactive,
        onLocationSelect
      );
      setIsLoading(false);
      return mapService;
    } catch (error) {
      console.error('Failed to initialize map:', error);
      setIsLoading(false);
      throw error;
    }
  }, [mapServiceRef]);

  const cleanup = useCallback(() => {
    mapServiceRef.current = null;
  }, [mapServiceRef]);

  return {
    mapServiceRef,
    isLoading,
    initializeMap,
    cleanup,
    setIsLoading
  };
}