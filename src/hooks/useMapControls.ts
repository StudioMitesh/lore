import { useState, useEffect } from 'react';
import type { MapService } from '../services/mapService';

export function useMapControls(
  mapServiceRef: React.MutableRefObject<MapService | null>,
  isLoading: boolean
) {
  const [mapType, setMapType] = useState<string>('roadmap');
  const [showTraffic, setShowTraffic] = useState(false);
  const [showTransit, setShowTransit] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!isLoading && mapServiceRef.current) {
      mapServiceRef.current.setMapType(mapType);
    }
  }, [mapType, isLoading, mapServiceRef]);

  useEffect(() => {
    if (!isLoading && mapServiceRef.current) {
      mapServiceRef.current.toggleTraffic(showTraffic);
    }
  }, [showTraffic, isLoading, mapServiceRef]);

  useEffect(() => {
    if (!isLoading && mapServiceRef.current) {
      mapServiceRef.current.toggleTransit(showTransit);
    }
  }, [showTransit, isLoading, mapServiceRef]);

  const getCurrentLocation = () => {
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
  };

  return {
    mapType,
    showTraffic,
    showTransit,
    currentPosition,
    setMapType,
    setShowTraffic,
    setShowTransit,
    setCurrentPosition,
    getCurrentLocation,
  };
}