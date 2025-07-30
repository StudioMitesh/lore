import { Loader } from "@googlemaps/js-api-loader"

let loaderInstance: Loader | null = null
let apiKey: string | null = null
let librariesLoaded = false

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
    libraries: ["places", "geocoding"]
  })

  return loaderInstance
}

export const loadGoogleMapsLibraries = async () => {
  if (librariesLoaded) return
  if (typeof window === "undefined") return
  
  try {
    const loader = await getGoogleMapsLoader()
    
    await Promise.all([
      loader.importLibrary('maps'),
      loader.importLibrary('marker'),
      loader.importLibrary('places'),
      loader.importLibrary('geocoding')
    ])
    
    librariesLoaded = true
  } catch (error) {
    console.error('Failed to load Google Maps libraries:', error)
    throw error
  }
}

export const loadGoogleMapsApi = async (): Promise<typeof google.maps> => {
  if (typeof window === "undefined") {
    throw new Error("Not in browser")
  }

  // Check if Google Maps is already loaded
  if (window.google?.maps) {
    return window.google.maps
  }

  await loadGoogleMapsLibraries()
  return window.google.maps
}