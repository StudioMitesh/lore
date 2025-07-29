"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Search, Layers, Filter, MapPin, Route } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { loadGoogleMapsApi } from "@/api/googleMapsLoader"
import { type MapLocation, type Trip, type TripWithDetails, type Entry } from "@/lib/types"

interface Location extends MapLocation {
  trip?: Trip
  entry?: Entry
}

interface MapViewerProps {
  locations: Location[]
  trips?: TripWithDetails[]
  selectedTripId?: string
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
  trips = [],
  selectedTripId,
  className, 
  onLocationSelect,
  interactive = false,
  center = { lat: 20, lng: 0 },
  zoom = 2
}: MapViewerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
  const polylinesRef = useRef<Map<string, any>>(new Map())
  const [searchValue, setSearchValue] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initializeMap = async () => {
      try {
        await loadGoogleMapsApi()
        
        const { Map } = await window.google.maps.importLibrary("maps")
        if (!mapRef.current) return

        const map = new Map(mapRef.current, {
          center,
          zoom,
          mapId: "4578ddca5379c217baab8a20",
          disableDefaultUI: true,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }]
            },
            {
              featureType: "transit",
              elementType: "labels",
              stylers: [{ visibility: "off" }]
            }
          ]
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

        setIsLoading(false)
      } catch (error) {
        console.error("Failed to initialize map:", error)
        setIsLoading(false)
      }
    }

    initializeMap()
  }, [center, zoom, interactive, onLocationSelect])

  useEffect(() => {
    if (!mapInstanceRef.current || isLoading) return

    // Clear existing markers and polylines
    markersRef.current.forEach(marker => marker.map = null)
    markersRef.current.clear()
    polylinesRef.current.forEach(polyline => polyline.setMap(null))
    polylinesRef.current.clear()

    const { AdvancedMarkerElement } = window.google.maps.importLibrary("marker")

    // Group locations by trip
    const tripLocations = new Map<string, Location[]>()
    const standaloneLocations: Location[] = []

    locations.forEach(location => {
      if (location.tripId && location.trip) {
        if (!tripLocations.has(location.tripId)) {
          tripLocations.set(location.tripId, [])
        }
        tripLocations.get(location.tripId)!.push(location)
      } else {
        standaloneLocations.push(location)
      }
    })

    // Create trip polylines and markers
    tripLocations.forEach((tripLocs, tripId) => {
      const trip = trips.find(t => t.id === tripId)
      if (!trip) return

      const isSelected = selectedTripId === tripId
      const tripColor = getTripColor(trip.status)
      const opacity = selectedTripId && !isSelected ? 0.3 : 1.0

      // Sort locations by timestamp if available
      const sortedLocs = tripLocs.sort((a, b) => {
        if (a.entry && b.entry) {
          return new Date(a.entry.timestamp).getTime() - new Date(b.entry.timestamp).getTime()
        }
        return 0
      })

      // Create polyline connecting trip locations
      if (sortedLocs.length > 1) {
        const path = sortedLocs.map(loc => ({
          lat: loc.lat,
          lng: loc.lng
        }))

        const polyline = new window.google.maps.Polyline({
          path: path,
          geodesic: true,
          strokeColor: tripColor,
          strokeOpacity: opacity * 0.8,
          strokeWeight: isSelected ? 4 : 2,
          map: mapInstanceRef.current
        })

        polylinesRef.current.set(tripId, polyline)

        // Add click listener to polyline
        polyline.addListener('click', () => {
          showTripInfoWindow(trip, path[0])
        })
      }

      // Create markers for each location in the trip
      sortedLocs.forEach((location, index) => {
        const isFirst = index === 0
        const isLast = index === sortedLocs.length - 1
        
        const pin = createTripPin(tripColor, opacity, isFirst, isLast, index + 1)
        
        const marker = new AdvancedMarkerElement({
          map: mapInstanceRef.current,
          position: { lat: location.lat, lng: location.lng },
          title: `${trip.name} - ${location.name}`,
          content: pin,
        })

        // Add click listener for detailed info
        pin.addEventListener('click', () => {
          showLocationInfoWindow(location, marker.position)
        })

        markersRef.current.set(`trip-${tripId}-${location.id}`, marker)
      })
    })

    // Create standalone location markers
    standaloneLocations.forEach((location) => {
      const pinColor = getPinColor(location.type)
      const pin = createStandalonePin(pinColor)

      const marker = new AdvancedMarkerElement({
        map: mapInstanceRef.current,
        position: { lat: location.lat, lng: location.lng },
        title: location.name,
        content: pin,
      })

      pin.addEventListener('click', () => {
        showLocationInfoWindow(location, marker.position)
      })

      markersRef.current.set(`standalone-${location.id}`, marker)
    })

    // Auto-fit bounds if there are locations
    if (locations.length > 0) {
      const bounds = new window.google.maps.LatLngBounds()
      locations.forEach(location => {
        bounds.extend({ lat: location.lat, lng: location.lng })
      })
      
      if (locations.length === 1) {
        mapInstanceRef.current.setCenter(bounds.getCenter())
        mapInstanceRef.current.setZoom(12)
      } else {
        mapInstanceRef.current.fitBounds(bounds, { padding: 50 })
      }
    }

  }, [locations, trips, selectedTripId, isLoading])

  const getTripColor = (status: string) => {
    switch (status) {
      case "completed": return "#d4af37" // Gold
      case "active": return "#4c6b54"    // Forest green
      case "planned": return "#b22222"   // Dark red
      case "draft": return "#8B7355"     // Brown
      default: return "#d4af37"
    }
  }

  const getPinColor = (type: string) => {
    switch (type) {
      case "visited": return "#d4af37"
      case "planned": return "#4c6b54" 
      case "favorite": return "#b22222"
      default: return "#d4af37"
    }
  }

  const createTripPin = (color: string, opacity: number, isFirst: boolean, isLast: boolean, number: number) => {
    const pin = document.createElement("div")
    pin.className = "relative flex items-center justify-center transform transition-all hover:scale-110 cursor-pointer"
    
    const size = isFirst || isLast ? "w-8 h-8" : "w-6 h-6"
    const borderSize = isFirst || isLast ? "border-3" : "border-2"
    
    pin.innerHTML = `
      <div class="${size} ${borderSize} border-white rounded-full shadow-lg flex items-center justify-center text-white text-xs font-bold"
           style="background-color: ${color}; opacity: ${opacity}">
        ${isFirst ? '▶' : isLast ? '🏁' : number}
      </div>
      ${isFirst ? '<div class="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white px-2 py-1 rounded text-xs whitespace-nowrap">Start</div>' : ''}
      ${isLast ? '<div class="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white px-2 py-1 rounded text-xs whitespace-nowrap">End</div>' : ''}
    `
    
    return pin
  }

  const createStandalonePin = (color: string) => {
    const pin = document.createElement("div")
    pin.className = "w-6 h-6 rounded-full border-2 border-white shadow-lg transform transition-transform hover:scale-110 cursor-pointer"
    pin.style.backgroundColor = color
    return pin
  }

  const showTripInfoWindow = (trip: Trip, position: any) => {
    const infoWindow = new window.google.maps.InfoWindow({
      content: `
        <div class="p-3 max-w-xs">
          <h3 class="font-bold text-lg mb-2">${trip.name}</h3>
          <p class="text-gray-600 mb-2">${trip.description || 'No description'}</p>
          <div class="flex items-center gap-2 text-sm text-gray-500">
            <span class="capitalize">${trip.status}</span>
            <span>•</span>
            <span>${trip.totalEntries} entries</span>
            <span>•</span>
            <span>${trip.countriesVisited.length} countries</span>
          </div>
        </div>
      `,
      position: position
    })
    
    infoWindow.open(mapInstanceRef.current)
  }

  const showLocationInfoWindow = (location: Location, position: any) => {
    const content = `
      <div class="p-3 max-w-xs">
        <h3 class="font-bold text-lg mb-2">${location.name}</h3>
        ${location.trip ? `<p class="text-blue-600 mb-1">Part of: ${location.trip.name}</p>` : ''}
        ${location.entry ? `<p class="text-gray-600 mb-2">${location.entry.title}</p>` : ''}
        <div class="text-sm text-gray-500">
          <span class="capitalize">${location.type}</span>
          ${location.entry ? ` • ${new Date(location.entry.timestamp).toLocaleDateString()}` : ''}
        </div>
      </div>
    `
    
    const infoWindow = new window.google.maps.InfoWindow({
      content: content,
      position: position
    })
    
    infoWindow.open(mapInstanceRef.current)
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

      {(locations.length > 0 || trips.length > 0) && (
        <div className="absolute top-20 left-4 bg-parchment/90 backdrop-blur-sm border border-gold/30 rounded-lg p-3 z-10">
          <div className="space-y-2">
            <div className="text-xs font-medium text-deepbrown mb-2">Legend</div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#d4af37] border border-white"></div>
              <span className="text-xs text-deepbrown/70">Completed/Visited</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#4c6b54] border border-white"></div>
              <span className="text-xs text-deepbrown/70">Active/Planned</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#b22222] border border-white"></div>
              <span className="text-xs text-deepbrown/70">Draft/Favorite</span>
            </div>
            {trips.length > 0 && (
              <>
                <hr className="border-gold/20 my-2" />
                <div className="flex items-center gap-2">
                  <Route className="w-3 h-3 text-deepbrown/70" />
                  <span className="text-xs text-deepbrown/70">Trip Routes</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold">▶</span>
                  <span className="text-xs text-deepbrown/70">Trip Start</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs">🏁</span>
                  <span className="text-xs text-deepbrown/70">Trip End</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {selectedTripId && (
        <div className="absolute top-4 right-4 bg-gold/90 backdrop-blur-sm border border-gold/30 rounded-lg p-2 z-10">
          <div className="text-xs text-deepbrown font-medium">
            Trip Selected: {trips.find(t => t.id === selectedTripId)?.name}
          </div>
        </div>
      )}
    </div>
  )
}