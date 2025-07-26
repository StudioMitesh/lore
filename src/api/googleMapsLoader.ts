let mapsApiLoaded: Promise<void> | null = null

export const loadGoogleMapsApi = (): Promise<void> => {
  if (typeof window === "undefined") return Promise.reject("Not in browser")

  if (window.google?.maps) return Promise.resolve()

  if (!mapsApiLoaded) {
    mapsApiLoaded = new Promise((resolve, reject) => {
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve())
        existingScript.addEventListener("error", () => reject("Failed to load Google Maps API"))
        return
      }

      const script = document.createElement("script")
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`
      script.async = true
      script.defer = true

      script.onload = () => resolve()
      script.onerror = () => reject("Failed to load Google Maps API")

      document.head.appendChild(script)
    })
  }

  return mapsApiLoaded
}
