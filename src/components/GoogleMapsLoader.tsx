import { useEffect } from "react"

export const GoogleMapsLoader = () => {
  useEffect(() => {
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) return

    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`
    script.async = true
    script.defer = true
    document.body.appendChild(script)

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  return null
}
