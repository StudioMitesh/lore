import { Loader } from "@googlemaps/js-api-loader"

let loaderInstance: Loader | null = null
let apiKey: string | null = null
let librariesLoaded = false
let isLoading = false

const getGoogleMapsApiKey = async (): Promise<string> => {
  if (apiKey) return apiKey
  
  try {
    const response = await fetch('/.netlify/functions/google-maps-key')
    if (!response.ok) {
      throw new Error(`Failed to fetch Google Maps API key: ${response.status}`)
    }
    const data = await response.json()
    if (data.error) {
      throw new Error(data.error)
    }
    apiKey = data.apiKey
    return apiKey || ""
  } catch (error) {
    console.error('Error fetching Google Maps API key:', error)
    throw error
  }
}

export const getGoogleMapsLoader = async (): Promise<Loader> => {
  if (typeof window === "undefined") {
    throw new Error("Not in browser")
  }

  if (loaderInstance) return loaderInstance

  const key = await getGoogleMapsApiKey()
  
  loaderInstance = new Loader({
    apiKey: key,
    version: "weekly",
    libraries: ["places", "geocoding", "marker", "geometry"],
    // Add additional parameters for better performance
    language: "en",
    region: "US"
  })

  return loaderInstance
}

export const loadGoogleMapsLibraries = async () => {
  if (librariesLoaded || isLoading) return
  if (typeof window === "undefined") return
  
  isLoading = true
  
  try {
    const loader = await getGoogleMapsLoader()
    
    // Load all required libraries in parallel
    await Promise.all([
      loader.importLibrary('maps'),
      loader.importLibrary('marker'),
      loader.importLibrary('places'),
      loader.importLibrary('geocoding'),
      loader.importLibrary('geometry')
    ])
    
    // Verify that the new Places API is available
    if (!window.google?.maps?.places?.Place) {
      console.warn('New Places API not available, falling back to legacy API')
    } else {
      console.log('New Places API successfully loaded')
    }
    
    librariesLoaded = true
  } catch (error) {
    console.error('Failed to load Google Maps libraries:', error)
    throw error
  } finally {
    isLoading = false
  }
}

export const loadGoogleMapsApi = async (): Promise<typeof google.maps> => {
  if (typeof window === "undefined") {
    throw new Error("Not in browser")
  }

  // Check if Google Maps is already loaded
  if (window.google?.maps && librariesLoaded) {
    return window.google.maps
  }

  // Wait for libraries to load if currently loading
  if (isLoading) {
    await new Promise(resolve => {
      const checkLoaded = () => {
        if (librariesLoaded) {
          resolve(void 0)
        } else {
          setTimeout(checkLoaded, 100)
        }
      }
      checkLoaded()
    })
    return window.google.maps
  }

  await loadGoogleMapsLibraries()
  return window.google.maps
}

// Utility function to check if the new Places API is available
export const isNewPlacesApiAvailable = (): boolean => {
  return !!(window.google?.maps?.places?.Place && 
           window.google?.maps?.places?.AutocompleteSuggestion)
}

// Function to get available libraries
export const getLoadedLibraries = (): string[] => {
  if (!window.google?.maps) return []
  
  const libraries: string[] = []
  
  if (window.google.maps.Map) libraries.push('maps')
  if (window.google.maps.marker?.AdvancedMarkerElement) libraries.push('marker')
  if (window.google.maps.places) libraries.push('places')
  if (window.google.maps.Geocoder) libraries.push('geocoding')
  if (window.google.maps.geometry) libraries.push('geometry')
  
  return libraries
}

// Function to force reload libraries (useful for debugging)
export const reloadGoogleMapsLibraries = async (): Promise<void> => {
  librariesLoaded = false
  isLoading = false
  loaderInstance = null
  
  // Clear the global google object to force fresh load
  if (window.google) {
    delete (window as any).google
  }
  
  await loadGoogleMapsLibraries()
}