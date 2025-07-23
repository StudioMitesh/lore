"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Search, Layers, Filter } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Location {
  id: string
  name: string
  lat: number
  lng: number
  type: "visited" | "planned" | "favorite"
}

interface MapViewerProps {
  locations: Location[]
  className?: string
}

export function MapViewer({ locations, className }: MapViewerProps) {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const initializeMap = async () => {
      await loadGoogleMapsScript()

      const { Map } = await window.google.maps.importLibrary("maps") as google.maps.MapsLibrary
      const { AdvancedMarkerElement } = await window.google.maps.importLibrary("marker") as google.maps.MarkerLibrary

      if (!mapRef.current) return

      const map = new Map(mapRef.current, {
        center: { lat: 37.7749, lng: -122.4194 },
        zoom: 5,
        disableDefaultUI: true,
      })

      locations.forEach((location) => {
        const pinColor =
          location.type === "visited"
            ? "#d4af37"
            : location.type === "planned"
            ? "#4c6b54"
            : "#b22222"

        const pin = document.createElement("div")
        pin.className = "w-4 h-4 rounded-full border border-white shadow"
        pin.style.backgroundColor = pinColor

        new AdvancedMarkerElement({
          map,
          position: { lat: location.lat, lng: location.lng },
          title: location.name,
          content: pin,
        })
      })
    }

    initializeMap()
  }, [locations])

  return (
    <div className={cn("relative w-full h-full min-h-[500px] rounded-2xl overflow-hidden", className)}>
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between">
        <div className="relative">
          <Input
            placeholder="Search locations..."
            className="pl-9 bg-parchment/90 backdrop-blur-sm border-gold/30 w-64"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-deepbrown/50" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="bg-parchment/90 backdrop-blur-sm border-gold/30">
            <Layers className="h-4 w-4" />
            <span className="sr-only">Map Layers</span>
          </Button>
          <Button variant="outline" size="icon" className="bg-parchment/90 backdrop-blur-sm border-gold/30">
            <Filter className="h-4 w-4" />
            <span className="sr-only">Filter</span>
          </Button>
        </div>
      </div>

      <div ref={mapRef} className="w-full h-full" />

      <div className="absolute bottom-8 right-8 w-24 h-24 compass-bg opacity-80">
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          >
            <svg width="60" height="60" viewBox="0 0 60 60" className="text-deepbrown/70">
              <path
                d="M30 0 L34 26 L60 30 L34 34 L30 60 L26 34 L0 30 L26 26 Z"
                fill="currentColor"
                fillOpacity="0.2"
              />
              <path
                d="M30 10 L32 28 L50 30 L32 32 L30 50 L28 32 L10 30 L28 28 Z"
                fill="currentColor"
                fillOpacity="0.3"
              />
              <circle cx="30" cy="30" r="3" fill="currentColor" />
            </svg>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

const loadGoogleMapsScript = () => {
  return new Promise<void>((resolve, reject) => {
    if (window.google?.maps) {
      resolve()
      return
    }

    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject("Google Maps script failed to load")
    document.head.appendChild(script)
  })
}
