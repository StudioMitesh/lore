"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Search, Layers, MapPin, Route, Navigation, Satellite, Map as MapIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { loadGoogleMapsApi } from "@/api/googleMapsLoader"
import { getPlaceDetails, getPlaceDetailsFromPlaceId, searchPlaces } from "@/services/geocoding";
import { type Entry, type Trip, type TripWithDetails, type AutocompletePrediction } from "@/lib/types"

interface MapLocation {
  id: string
  name: string
  lat: number
  lng: number
  type: "visited" | "planned" | "favorite"
  uid?: string
  entry?: Entry
  trip?: Trip
  tripId?: string
}

interface MapViewerProps {
  locations: MapLocation[]
  trips?: TripWithDetails[]
  selectedTripId?: string
  className?: string
  onLocationSelect?: (location: { lat: number; lng: number; address?: string }) => void
  onLocationClick?: (location: MapLocation) => void
  interactive?: boolean
  center?: { lat: number; lng: number }
  zoom?: number
  showSearch?: boolean
  showControls?: boolean
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
  onLocationClick, 
  interactive = false, 
  center = { lat: 20, lng: 0 }, 
  zoom = 2,
  showSearch = true,
  showControls = true
}: MapViewerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
  const polylinesRef = useRef<Map<string, any>>(new Map())
  const autocompleteServiceRef = useRef<any>(null)
  
  const [searchValue, setSearchValue] = useState("")
  const [searchResults, setSearchResults] = useState<AutocompletePrediction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [mapType, setMapType] = useState<string>("roadmap")
  const [showTraffic, setShowTraffic] = useState(false)
  const [showTransit, setShowTransit] = useState(false)
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null)

  // Initialize map
  useEffect(() => {
    const initializeMap = async () => {
      try {
        await loadGoogleMapsApi()
        const { Map } = await window.google.maps.importLibrary("maps") as any
        
        if (!mapRef.current) return

        const mapOptions: any = {
          center,
          zoom,
          mapId: "4578ddca5379c217baab8a20",
          disableDefaultUI: !showControls,
          mapTypeControl: showControls,
          streetViewControl: showControls,
          fullscreenControl: showControls,
          zoomControl: showControls,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }]
            },
            {
              featureType: "transit",
              elementType: "labels", 
              stylers: [{ visibility: showTransit ? "on" : "off" }]
            }
          ]
        }

        const map = new Map(mapRef.current, mapOptions)
        mapInstanceRef.current = map

        // Add traffic layer toggle
        const trafficLayer = new window.google.maps.TrafficLayer()
        if (showTraffic) {
          trafficLayer.setMap(map)
        }

        // Add transit layer toggle  
        const transitLayer = new window.google.maps.TransitLayer()
        if (showTransit) {
          transitLayer.setMap(map)
        }

        // Interactive click handler
        if (interactive) {
            map.addListener("click", async (event: any) => {
              const lat = event.latLng.lat()
              const lng = event.latLng.lng()
              
              try {
                const placeDetails = await getPlaceDetails(lat, lng)
                onLocationSelect?.({ 
                  lat, 
                  lng, 
                  address: placeDetails.address 
                })
              } catch (error) {
                console.error("Geocoding failed:", error)
                onLocationSelect?.({ lat, lng })
              }
            })
          }

        // Initialize autocomplete service
        autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()

        setIsLoading(false)
      } catch (error) {
        console.error("Failed to initialize map:", error)
        setIsLoading(false)
      }
    }

    initializeMap()
  }, [center, zoom, interactive, onLocationSelect, showControls, showTraffic, showTransit])

  // Handle search functionality
  const handleSearch = async () => {
    if (!searchValue.trim() || !mapInstanceRef.current) return
  
    setIsSearching(true)
    try {
      const results = await searchPlaces(searchValue, center ? {
        lat: center.lat,
        lng: center.lng,
        radius: 50000
      } : undefined)
      
      if (results.length > 0) {
        setSearchResults(results)
        setShowSearchResults(true)
      }
    } catch (error) {
      console.error("Search failed:", error)
    } finally {
      setIsSearching(false)
    }
  }
  

  // Handle search result selection
  const handleSearchResultSelect = async (result: AutocompletePrediction) => {
    if (!mapInstanceRef.current) return
  
    try {
      const placeDetails = await getPlaceDetailsFromPlaceId(result.placeId)
      const { lat, lng } = placeDetails.coordinates
      
      mapInstanceRef.current.setCenter({ lat, lng })
      mapInstanceRef.current.setZoom(15)
      
      setSearchValue(placeDetails.name)
      setShowSearchResults(false)
      
      // Trigger location selection if in interactive mode
      if (interactive && onLocationSelect) {
        onLocationSelect({ 
          lat, 
          lng, 
          address: placeDetails.address 
        })
      }
    } catch (error) {
      console.error("Failed to navigate to search result:", error)
    }
  }
  


  // Get user's current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        
        setCurrentPosition({ lat, lng })
        
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter({ lat, lng })
          mapInstanceRef.current.setZoom(12)
        }
      },
      (error) => {
        console.error("Geolocation failed:", error)
      }
    )
  }

  // Update markers when locations change
  useEffect(() => {
    if (!mapInstanceRef.current || isLoading) return

    // Clear existing markers and polylines
    markersRef.current.forEach(marker => marker.setMap(null))
    markersRef.current.clear()
    polylinesRef.current.forEach(polyline => polyline.setMap(null))
    polylinesRef.current.clear()

    const createMarkers = async () => {
      const { AdvancedMarkerElement } = await window.google.maps.importLibrary("marker") as any

      // Group locations by trip
      const tripLocations = new Map<string, MapLocation[]>()
      const standaloneLocations: MapLocation[] = []

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
          const path = sortedLocs.map(loc => ({ lat: loc.lat, lng: loc.lng }))
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
          polyline.addListener('click', (event: any) => {
            showTripInfoWindow(trip, event.latLng)
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

          // Add click listener for location modal
          pin.addEventListener('click', (e: Event) => {
            e.stopPropagation()
            onLocationClick?.(location)
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

        pin.addEventListener('click', (e: Event) => {
          e.stopPropagation()
          onLocationClick?.(location)
        })

        markersRef.current.set(`standalone-${location.id}`, marker)
      })

      // Add current position marker if available
      if (currentPosition) {
        const currentPin = createCurrentLocationPin()
        const currentMarker = new AdvancedMarkerElement({
          map: mapInstanceRef.current,
          position: currentPosition,
          title: "Your Current Location",
          content: currentPin,
        })
        markersRef.current.set('current-location', currentMarker)
      }

      // Auto-fit bounds if there are locations
      if (locations.length > 0) {
        const bounds = new window.google.maps.LatLngBounds()
        locations.forEach(location => {
          bounds.extend({ lat: location.lat, lng: location.lng })
        })

        if (currentPosition) {
          bounds.extend(currentPosition)
        }

        if (locations.length === 1 && !currentPosition) {
          mapInstanceRef.current.setCenter(bounds.getCenter())
          mapInstanceRef.current.setZoom(12)
        } else {
          mapInstanceRef.current.fitBounds(bounds, { padding: 50 })
        }
      }
    }

    createMarkers()
  }, [locations, trips, selectedTripId, isLoading, onLocationClick, currentPosition])

  // Helper functions for styling
  const getTripColor = (status: string) => {
    switch (status) {
      case "completed": return "#d4af37" // Gold
      case "active": return "#4c6b54" // Forest green
      case "planned": return "#b22222" // Dark red
      case "draft": return "#8B7355" // Brown
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
    pin.className = "relative flex items-center justify-center transform transition-all hover:scale-110 cursor-pointer hover:z-10"
    
    const size = isFirst || isLast ? "w-10 h-10" : "w-8 h-8"
    const borderSize = isFirst || isLast ? "border-3" : "border-2"
    const textSize = isFirst || isLast ? "text-sm" : "text-xs"
    
    pin.innerHTML = `
      <div class="${size} ${borderSize} border-white rounded-full shadow-lg flex items-center justify-center text-white ${textSize} font-bold hover:shadow-xl transition-all" 
           style="background-color: ${color}; opacity: ${opacity}">
        ${isFirst ? '▶' : isLast ? '🏁' : number}
      </div>
      ${isFirst ? '<div class="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">Trip Start</div>' : ''}
      ${isLast ? '<div class="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">Trip End</div>' : ''}
    `
    return pin
  }

  const createStandalonePin = (color: string) => {
    const pin = document.createElement("div")
    pin.className = "w-8 h-8 rounded-full border-2 border-white shadow-lg transform transition-all hover:scale-110 cursor-pointer hover:shadow-xl hover:z-10 relative"
    pin.style.backgroundColor = color
    
    // Add pulsing animation for standalone pins
    pin.innerHTML = `
      <div class="w-full h-full rounded-full animate-pulse absolute inset-0" 
           style="background-color: ${color}; opacity: 0.3; transform: scale(1.5);"></div>
    `
    return pin
  }

  const createCurrentLocationPin = () => {
    const pin = document.createElement("div")
    pin.className = "w-6 h-6 rounded-full border-2 border-blue-500 bg-blue-400 shadow-lg relative animate-pulse"
    
    pin.innerHTML = `
      <div class="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping"></div>
      <div class="absolute inset-1 rounded-full bg-blue-500"></div>
    `
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
            <span>${trip.totalEntries || 0} entries</span>
            <span>•</span>
            <span>${trip.countriesVisited?.length || 0} countries</span>
          </div>
        </div>
      `,
      position: position
    })
    infoWindow.open(mapInstanceRef.current)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  return (
    <div className={cn("relative w-full h-full min-h-[500px] rounded-2xl overflow-hidden", className)}>
      {/* Search and Controls */}
      {showSearch && (
        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between">
          <div className="relative flex gap-2">
            <Popover open={showSearchResults} onOpenChange={setShowSearchResults}>
              <PopoverTrigger asChild>
                <div className="relative">
                  <Input
                    placeholder="Search locations..."
                    className="pl-9 bg-parchment/90 backdrop-blur-sm border-gold/30 w-64"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    onFocus={() => setShowSearchResults(searchResults.length > 0)}
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-deepbrown/50" />
                </div>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-80" align="start">
                <div className="max-h-60 overflow-y-auto">
                  {searchResults.map((result, index) => (
                    <div
                      key={result.placeId}
                      className="p-3 hover:bg-parchment/50 cursor-pointer border-b border-gold/10 last:border-b-0"
                      onClick={() => handleSearchResultSelect(result)}
                    >
                      <div className="font-medium">{result.structuredFormatting.mainText}</div>
                      <div className="text-sm text-muted-foreground">
                        {result.structuredFormatting.secondaryText}
                      </div>
                      <div className="flex gap-1 mt-1">
                        {result.types.slice(0, 2).map(type => (
                          <Badge key={type} variant="secondary" className="text-xs">
                            {type.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {showControls && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                className="bg-parchment/90 backdrop-blur-sm border-gold/30"
                onClick={handleSearch}
              >
                <Search className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                className="bg-parchment/90 backdrop-blur-sm border-gold/30"
                onClick={getCurrentLocation}
              >
                <Navigation className="h-4 w-4" />
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="bg-parchment/90 backdrop-blur-sm border-gold/30"
                  >
                    <Layers className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Map Type</label>
                      <ToggleGroup type="single" value={mapType} onValueChange={setMapType} className="mt-1">
                        <ToggleGroupItem value="roadmap" size="sm">
                          <MapIcon className="h-4 w-4 mr-1" />
                          Road
                        </ToggleGroupItem>
                        <ToggleGroupItem value="satellite" size="sm">
                          <Satellite className="h-4 w-4 mr-1" />
                          Satellite
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Layers</label>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant={showTraffic ? "default" : "outline"}
                          size="sm"
                          onClick={() => setShowTraffic(!showTraffic)}
                        >
                          Traffic
                        </Button>
                        <Button
                          variant={showTransit ? "default" : "outline"}
                          size="sm"
                          onClick={() => setShowTransit(!showTransit)}
                        >
                          Transit
                        </Button>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      )}

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

      {/* Compass Rose */}
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

      {/* Legend */}
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
            <hr className="border-gold/20 my-2" />
            <div className="text-xs text-deepbrown/50">
              {interactive ? "Click locations for details" : "Click any location for details"}
            </div>
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