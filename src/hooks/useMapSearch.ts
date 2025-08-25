import { useState, useRef, useCallback, useEffect } from 'react';
import { getPlaceDetailsFromPlaceId, getAutocompleteSuggestions } from '@/services/geocoding';
import type { AutocompletePrediction } from '@/lib/types';
import type { MapService } from '../services/mapService';

export function useMapSearch(
  mapServiceRef: React.MutableRefObject<MapService | null>,
  interactive: boolean,
  onLocationSelect?: (location: { lat: number; lng: number; address?: string }) => void
) {
  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState<AutocompletePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);

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
  }, [mapServiceRef]);

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
    [interactive, onLocationSelect, mapServiceRef]
  );

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

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return {
    searchValue,
    searchResults,
    isSearching,
    showSearchResults,
    searchInputRef,
    isInputFocused,
    setSearchValue,
    setShowSearchResults,
    setIsInputFocused,
    handleSearchInput,
    handleSearchResultSelect,
    clearSearch,
    handleManualSearch,
  };
}