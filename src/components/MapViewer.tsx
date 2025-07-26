"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Search, Layers, Filter, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { loadGoogleMapsApi } from "@/api/googleMapsLoader"

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
  onLocationSelect?: (location: { lat: number; lng: number; address?: string }) => void
  interactive?: boolean
  center?: { lat: number; lng: number }
  zoom?: number
}

declare global {
  interface Window {
    google: any
  }
}

export function MapViewer({ 
  locations, 
  className, 
  onLocationSelect,
  interactive = false,
  center = { lat: 37.7749, lng: -122.4194 },
  zoom = 5
}: MapViewerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const [searchValue, setSearchValue] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initializeMap = async () => {
      try {
        await loadGoogleMapsApi()
        
        const { Map } = await window.google.maps.importLibrary("maps")
        const { AdvancedMarkerElement } = await window.google.maps.importLibrary("marker")

        if (!mapRef.current) return

        const map = new Map(mapRef.current, {
          center,
          zoom,
          mapId: "4578ddca5379c217baab8a20",
          disableDefaultUI: true,
        })

        mapInstanceRef.current = map

        if (interactive) {
          map.addListener("click", async (event: any) => {
            const lat = event.latLng.lat()
            const lng = event.latLng.lng()
            
            const geocoder = new window.google.maps.Geocoder()
            try {
              const result = await geocoder.geocode({ location: { lat, lng } })
              const address = result.results[0]?.formatted_address || ""
              onLocationSelect?.({ lat, lng, address })
            } catch (error) {
              console.error("Geocoding failed:", error)
              onLocationSelect?.({ lat, lng })
            }
          })
        }

        locations.forEach((location) => {
          const pinColor = getPinColor(location.type)
          const pin = createCustomPin(pinColor)

          new AdvancedMarkerElement({
            map,
            position: { lat: location.lat, lng: location.lng },
            title: location.name,
            content: pin,
          })
        })

        setIsLoading(false)
      } catch (error) {
        console.error("Failed to initialize map:", error)
        setIsLoading(false)
      }
    }

    initializeMap()
  }, [locations, center, zoom, interactive, onLocationSelect])

  const getPinColor = (type: string) => {
    switch (type) {
      case "visited": return "#d4af37"
      case "planned": return "#4c6b54" 
      case "favorite": return "#b22222"
      default: return "#d4af37"
    }
  }

  const createCustomPin = (color: string) => {
    const pin = document.createElement("div")
    pin.className = "w-6 h-6 rounded-full border-2 border-white shadow-lg transform transition-transform hover:scale-110"
    pin.style.backgroundColor = color
    pin.style.cursor = "pointer"
    return pin
  }

  const handleSearch = async () => {
    if (!searchValue.trim() || !mapInstanceRef.current) return

    try {
      await loadGoogleMapsApi()
      const geocoder = new window.google.maps.Geocoder()
      
      geocoder.geocode({ address: searchValue }, (results: any, status: any) => {
        if (status === "OK" && results[0]) {
          const location = results[0].geometry.location
          mapInstanceRef.current.setCenter(location)
          mapInstanceRef.current.setZoom(12)
        }
      })
    } catch (error) {
      console.error("Search failed:", error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  return (
    <div className={cn("relative w-full h-full min-h-[500px] rounded-2xl overflow-hidden", className)}>
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between">
        <div className="relative">
          <Input
            placeholder="Search locations..."
            className="pl-9 bg-parchment/90 backdrop-blur-sm border-gold/30 w-64"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-deepbrown/50" />
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            className="bg-parchment/90 backdrop-blur-sm border-gold/30"
            onClick={handleSearch}
          >
            <Search className="h-4 w-4" />
            <span className="sr-only">Search</span>
          </Button>
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

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-parchment/80 z-20">
          <div className="text-center">
            <MapPin className="h-8 w-8 text-gold mx-auto mb-2 animate-pulse" />
            <p className="text-deepbrown/70">Loading map...</p>
          </div>
        </div>
      )}

      {interactive && !isLoading && (
        <div className="absolute bottom-20 left-4 bg-parchment/90 backdrop-blur-sm border border-gold/30 rounded-lg p-3 z-10">
          <p className="text-sm text-deepbrown/70">Click on the map to set location</p>
        </div>
      )}

      <div ref={mapRef} className="w-full h-full" />

      <div className="absolute bottom-8 right-8 w-24 h-24 opacity-80 pointer-events-none">
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          >
            <svg width="60" height="60" viewBox="0 0 60 60" className="text-deepbrown/70">
              <path
                d="M30 0 L34 26 L60 30 L34 34 L30 60 L26 34 L0 30 L26 26 Z"
                fill="currentColor"
                fillOpacity="0.2"
                stroke="currentColor"
                strokeWidth="0.5"
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

      {locations.length > 0 && (
        <div className="absolute top-20 left-4 bg-parchment/90 backdrop-blur-sm border border-gold/30 rounded-lg p-3 z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#d4af37] border border-white"></div>
              <span className="text-xs text-deepbrown/70">Visited</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#4c6b54] border border-white"></div>
              <span className="text-xs text-deepbrown/70">Planned</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#b22222] border border-white"></div>
              <span className="text-xs text-deepbrown/70">Favorite</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
