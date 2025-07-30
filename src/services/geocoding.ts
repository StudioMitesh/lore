import { loadGoogleMapsApi } from '@/api/googleMapsLoader';
import type { AutocompletePrediction, PlaceDetails } from '@/lib/types';

export const getPlaceDetails = async (lat: number, lng: number): Promise<PlaceDetails> => {
  await loadGoogleMapsApi();
  const geocoder = new window.google.maps.Geocoder();

  const results = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
    geocoder.geocode({ location: { lat, lng } }, (res, status) => {
      if (status === 'OK' && res) resolve(res);
      else reject(new Error(`Geocoding failed: ${status}`));
    });
  });

  return extractBestPlaceDetails(results, { lat, lng });
};

export const getPlaceDetailsFromPlaceId = async (placeId: string): Promise<PlaceDetails> => {
  await loadGoogleMapsApi();
  const service = new window.google.maps.places.PlacesService(document.createElement('div'));

  const result = await new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
    service.getDetails(
      {
        placeId,
        fields: [
          'name',
          'formatted_address',
          'geometry',
          'place_id',
          'types',
          'business_status',
          'rating',
          'photos',
          'address_components'
        ]
      },
      (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          resolve(place);
        } else {
          reject(new Error(`Place details failed: ${status}`));
        }
      }
    );
  });

  return formatPlaceResult(result);
};

export const searchPlaces = async (
    query: string,
    bias?: { lat: number; lng: number; radius?: number }
): Promise<AutocompletePrediction[]> => {
    await loadGoogleMapsApi();

    const sessionToken = new window.google.maps.places.AutocompleteSessionToken();
    const request: google.maps.places.AutocompleteRequest = {
        input: query,
        sessionToken,
        types: ['establishment', 'geocode'],
        fields: ['name', 'formatted_address', 'place_id', 'types']
    };

    if (bias) {
        request.location = new window.google.maps.LatLng(bias.lat, bias.lng);
        request.radius = bias.radius ?? 50000;
    }

    try {
        const { AutocompleteService } = await window.google.maps.importLibrary("places") as any;
        const service = new AutocompleteService();
        
        const predictions = await new Promise<google.maps.places.AutocompletePrediction[]>((resolve, reject) => {
            service.getPlacePredictions(request, (res, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && res) resolve(res);
                else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) resolve([]);
                else reject(new Error(`Autocomplete failed: ${status}`));
            });
        });

        return predictions.map((pred): AutocompletePrediction => ({
        description: pred.description,
        placeId: pred.place_id,
        structuredFormatting: {
            mainText: pred.structured_formatting?.main_text || '',
            secondaryText: pred.structured_formatting?.secondary_text || ''
        },
        types: pred.types || []
        }));
    } catch (error) {
        console.error("Error using new AutocompleteService:", error);
        throw error;
    }
};

export const getNearbyPlaces = async (
  lat: number,
  lng: number,
  radius: number = 5000,
  type?: string
): Promise<PlaceDetails[]> => {
  await loadGoogleMapsApi();
  const service = new window.google.maps.places.PlacesService(document.createElement('div'));

  const request: google.maps.places.PlaceSearchRequest = {
    location: new window.google.maps.LatLng(lat, lng),
    radius,
    type
  };

  const results = await new Promise<google.maps.places.PlaceResult[]>((resolve, reject) => {
    service.nearbySearch(request, (res, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && res) resolve(res);
      else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) resolve([]);
      else reject(new Error(`Nearby search failed: ${status}`));
    });
  });

  return results.map(formatPlaceResult);
};

// --- UTILITIES ---

function extractBestPlaceDetails(
  results: google.maps.GeocoderResult[],
  coordinates: { lat: number; lng: number }
): PlaceDetails {
  const result = results[0];
  const addressComponents = result.address_components ?? [];

  const getComponent = (type: string) =>
    addressComponents.find(comp => comp.types.includes(type))?.long_name;

  return {
    name: result.formatted_address?.split(',')[0] || 'Unknown location',
    address: result.formatted_address ?? '',
    city: getComponent('locality') || getComponent('administrative_area_level_1') || '',
    country: getComponent('country') || '',
    coordinates,
    placeId: result.place_id,
    types: result.types,
    establishmentName: result.types.includes('establishment') ? result.formatted_address?.split(',')[0] : undefined
  };
}

function formatPlaceResult(place: google.maps.places.PlaceResult): PlaceDetails {
  const components = place.address_components || [];

  const getComponent = (type: string) =>
    components.find(c => c.types.includes(type))?.long_name;

  return {
    placeId: place.place_id,
    name: place.name || place.formatted_address?.split(',')[0] || 'Unknown',
    address: place.formatted_address || '',
    city: getComponent('locality') || getComponent('administrative_area_level_1') || '',
    country: getComponent('country') || '',
    coordinates: {
      lat: place.geometry?.location?.lat() || 0,
      lng: place.geometry?.location?.lng() || 0
    },
    types: place.types || [],
    establishmentName: place.name,
    businessStatus: place.business_status,
    rating: place.rating,
    photos: place.photos?.map(photo => photo.getUrl({ maxWidth: 400, maxHeight: 400 })) || []
  };
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
    Math.cos(toRad(point1.lat)) *
      Math.cos(toRad(point2.lat)) *
      Math.sin(dLng / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};
