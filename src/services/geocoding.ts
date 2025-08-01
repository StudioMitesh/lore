import { loadGoogleMapsApi } from '@/api/googleMapsLoader';
import type { AutocompletePrediction, PlaceDetails } from '@/lib/types';

export const getPlaceDetails = async (lat: number, lng: number): Promise<PlaceDetails> => {
  await loadGoogleMapsApi();
  const geocoder = new window.google.maps.Geocoder();

  const results = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
    geocoder.geocode(
      { location: { lat, lng } },
      (res: google.maps.GeocoderResult[] | null, status: string) => {
        if (status === 'OK' && res) resolve(res);
        else reject(new Error(`Geocoding failed: ${status}`));
      }
    );
  });

  return extractBestPlaceDetails(results, { lat, lng });
};

export const getPlaceDetailsFromPlaceId = async (placeId: string): Promise<PlaceDetails> => {
  await loadGoogleMapsApi();

  if (!placeId) {
    throw new Error('Invalid placeId: empty string');
  }

  try {
    const { Place } = (await window.google.maps.importLibrary(
      'places'
    )) as google.maps.PlacesLibrary;

    const place = new Place({
      id: placeId,
    });

    const fields = [
      'displayName',
      'formattedAddress',
      'location',
      'types',
      'businessStatus',
      'rating',
      'photos',
      'addressComponents',
    ];

    await place.fetchFields({ fields });

    const addressComponents = place.addressComponents || [];
    const getComponent = (type: string) =>
      addressComponents.find((c) => c.types.includes(type))?.longText;

    return {
      placeId: place.id || '',
      name: place.displayName || place.formattedAddress?.split(',')[0] || 'Unknown',
      address: place.formattedAddress || '',
      city: getComponent('locality') || getComponent('administrative_area_level_1') || '',
      country: getComponent('country') || '',
      coordinates: {
        lat: place.location?.lat() || 0,
        lng: place.location?.lng() || 0,
      },
      types: place.types || [],
      establishmentName: place.displayName,
      businessStatus: place.businessStatus,
      rating: place.rating,
      photos: place.photos?.map((photo) => photo.getURI({ maxWidth: 400, maxHeight: 400 })) || [],
    };
  } catch (error) {
    console.error('Failed to fetch place details:', error);
    throw new Error('Failed to fetch place details');
  }
};

export const searchPlaces = async (
  query: string,
  bias?: { lat: number; lng: number; radius?: number }
): Promise<AutocompletePrediction[]> => {
  if (!query.trim()) return [];

  await loadGoogleMapsApi();

  try {
    const placesLib = (await window.google.maps.importLibrary(
      'places'
    )) as google.maps.PlacesLibrary;
    const autocompleteSuggestion = placesLib.AutocompleteSuggestion;

    const token = new window.google.maps.places.AutocompleteSessionToken();

    const request = {
      input: query,
      sessionToken: token,
      includedPrimaryTypes: ['establishment', 'geocode'],
      ...(bias && {
        locationBias: {
          center: new window.google.maps.LatLng(bias.lat, bias.lng),
          radius: bias.radius ?? 50000,
        },
      }),
    };

    const { suggestions } = await autocompleteSuggestion.fetchAutocompleteSuggestions(request);

    return (suggestions || []).map(
      (suggestion): AutocompletePrediction => ({
        description: suggestion.placePrediction?.text?.text || '',
        placeId: suggestion.placePrediction?.placeId || '',
        structuredFormatting: {
          mainText: suggestion.placePrediction?.mainText?.text || '',
          secondaryText: suggestion.placePrediction?.secondaryText?.text || '',
        },
        types: suggestion.placePrediction?.types || [],
      })
    );
  } catch (error) {
    console.error('searchPlaces failed:', error);
    return [];
  }
};

export const getAutocompleteSuggestions = async (
  input: string,
  sessionToken?: google.maps.places.AutocompleteSessionToken,
  bias?: { lat: number; lng: number; radius?: number }
): Promise<AutocompletePrediction[]> => {
  if (!input.trim()) return [];

  await loadGoogleMapsApi();

  try {
    const placesLib = (await window.google.maps.importLibrary(
      'places'
    )) as google.maps.PlacesLibrary;
    const autocompleteSuggestion = placesLib.AutocompleteSuggestion;

    const token = sessionToken || new window.google.maps.places.AutocompleteSessionToken();

    const request = {
      input,
      sessionToken: token,
      includedPrimaryTypes: ['establishment', 'geocode'],
      ...(bias && {
        locationBias: {
          center: new window.google.maps.LatLng(bias.lat, bias.lng),
          radius: bias.radius ?? 50000,
        },
      }),
    };

    const { suggestions } = await autocompleteSuggestion.fetchAutocompleteSuggestions(request);

    return (suggestions || []).map(
      (suggestion): AutocompletePrediction => ({
        description: suggestion.placePrediction?.text?.text || '',
        placeId: suggestion.placePrediction?.placeId || '',
        structuredFormatting: {
          mainText: suggestion.placePrediction?.mainText?.text || '',
          secondaryText: suggestion.placePrediction?.secondaryText?.text || '',
        },
        types: suggestion.placePrediction?.types || [],
      })
    );
  } catch (error) {
    console.error('AutocompleteSuggestion failed:', error);
    return [];
  }
};

export const getNearbyPlaces = async (
  lat: number,
  lng: number,
  radius: number = 5000,
  type?: string
): Promise<PlaceDetails[]> => {
  await loadGoogleMapsApi();

  try {
    const { Place, SearchNearbyRankPreference } = (await window.google.maps.importLibrary(
      'places'
    )) as google.maps.PlacesLibrary;

    const request = {
      fields: [
        'id',
        'displayName',
        'formattedAddress',
        'location',
        'types',
        'businessStatus',
        'rating',
      ],
      locationRestriction: {
        center: { lat, lng },
        radius: radius,
      },
      ...(type && { includedTypes: [type] }),
      maxResultCount: 20,
      rankPreference: SearchNearbyRankPreference.POPULARITY,
    };

    const { places } = await Place.searchNearby(request);

    return (places || []).map(
      (place): PlaceDetails => ({
        placeId: place.id || '',
        name: place.displayName || 'Unknown',
        address: place.formattedAddress || '',
        city: extractCityFromAddress(place.formattedAddress || ''),
        country: extractCountryFromAddress(place.formattedAddress || ''),
        coordinates: {
          lat: place.location?.lat() || lat,
          lng: place.location?.lng() || lng,
        },
        types: place.types || [],
        establishmentName: place.displayName,
        businessStatus: place.businessStatus,
        rating: place.rating,
        photos: [],
      })
    );
  } catch (error) {
    console.error('New Places API nearby search failed:', error);
    return Promise.reject(new Error('Failed to fetch nearby places'));
  }
};

function extractBestPlaceDetails(
  results: google.maps.GeocoderResult[],
  coordinates: { lat: number; lng: number }
): PlaceDetails {
  const result = results[0];
  const addressComponents = result.address_components ?? [];

  const getComponent = (type: string) =>
    addressComponents.find((comp) => comp.types.includes(type))?.long_name;

  return {
    name: result.formatted_address?.split(',')[0] || 'Unknown location',
    address: result.formatted_address ?? '',
    city: getComponent('locality') || getComponent('administrative_area_level_1') || '',
    country: getComponent('country') || '',
    coordinates,
    placeId: result.place_id,
    types: result.types,
    establishmentName: result.types.includes('establishment')
      ? result.formatted_address?.split(',')[0]
      : undefined,
  };
}

function extractCityFromAddress(address: string): string {
  const parts = address.split(',');
  if (parts.length >= 2) {
    return parts[parts.length - 2].trim();
  }
  return '';
}

function extractCountryFromAddress(address: string): string {
  const parts = address.split(',');
  if (parts.length >= 1) {
    return parts[parts.length - 1].trim();
  }
  return '';
}

export const isValidCoordinates = (lat: number, lng: number): boolean =>
  lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

export const calculateDistance = (
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number => {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(point2.lat - point1.lat);
  const dLng = toRad(point2.lng - point1.lng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(point1.lat)) * Math.cos(toRad(point2.lat)) * Math.sin(dLng / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};
