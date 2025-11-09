import { Loader } from '@googlemaps/js-api-loader';

let loaderInstance: Loader | null = null;
let librariesLoaded = false;
let isLoading = false;

const getGoogleMapsApiKey = (): string => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set in environment variables');
    throw new Error('Google Maps API key is not configured. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your .env.local file');
  }
  
  return apiKey;
};

export const getGoogleMapsLoader = async (): Promise<Loader> => {
  if (typeof window === 'undefined') {
    throw new Error('Not in browser');
  }

  if (loaderInstance) return loaderInstance;

  const key = getGoogleMapsApiKey();

  loaderInstance = new Loader({
    apiKey: key,
    version: 'weekly',
    libraries: ['places', 'geocoding', 'marker', 'geometry'],

    language: 'en',
    region: 'US',
  });

  return loaderInstance;
};

export const loadGoogleMapsLibraries = async () => {
  if (librariesLoaded) {
    return;
  }
  
  if (isLoading) {
    await new Promise((resolve) => {
      const checkLoaded = () => {
        if (librariesLoaded) {
          resolve(void 0);
        } else {
          setTimeout(checkLoaded, 100);
        }
      };
      checkLoaded();
    });
    return;
  }
  
  if (typeof window === 'undefined') return;

  isLoading = true;

  try {
    const loader = await getGoogleMapsLoader();

    await Promise.all([
      loader.importLibrary('maps'),
      loader.importLibrary('marker'),
      loader.importLibrary('places'),
      loader.importLibrary('geocoding'),
      loader.importLibrary('geometry'),
    ]);

    if (!window.google?.maps?.places?.Place) {
      console.warn('New Places API not available, falling back to legacy API');
    }

    librariesLoaded = true;
  } catch (error: any) {
    console.error('Failed to load Google Maps libraries:', error);
    isLoading = false;
    
    if (error?.message?.includes('OverQuotaMapError') || 
        error?.message?.includes('OVER_QUOTA') ||
        error?.code === 'OVER_QUOTA_MAP_ERROR') {
      throw new Error('Google Maps API quota exceeded. Please check your API key billing and quota limits in Google Cloud Console.');
    }
    
    throw error;
  } finally {
    isLoading = false;
  }
};

export const loadGoogleMapsApi = async (): Promise<typeof google.maps> => {
  if (typeof window === 'undefined') {
    throw new Error('Not in browser');
  }

  if (window.google?.maps && librariesLoaded) {
    return window.google.maps;
  }

  if (isLoading) {
    await new Promise((resolve) => {
      const checkLoaded = () => {
        if (librariesLoaded) {
          resolve(void 0);
        } else {
          setTimeout(checkLoaded, 100);
        }
      };
      checkLoaded();
    });
    return window.google.maps;
  }

  await loadGoogleMapsLibraries();
  return window.google.maps;
};

export const isNewPlacesApiAvailable = (): boolean => {
  return !!(
    window.google?.maps?.places?.Place && window.google?.maps?.places?.AutocompleteSuggestion
  );
};

export const getLoadedLibraries = (): string[] => {
  if (!window.google?.maps) return [];

  const libraries: string[] = [];

  if (window.google.maps.Map) libraries.push('maps');
  if (window.google.maps.marker?.AdvancedMarkerElement) libraries.push('marker');
  if (window.google.maps.places) libraries.push('places');
  if (window.google.maps.Geocoder) libraries.push('geocoding');
  if (window.google.maps.geometry) libraries.push('geometry');

  return libraries;
};

export const reloadGoogleMapsLibraries = async (): Promise<void> => {
  librariesLoaded = false;
  isLoading = false;
  loaderInstance = null;

  if (window.google) {
    delete (window as any).google;
  }

  await loadGoogleMapsLibraries();
};
