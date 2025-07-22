"use client"
import { motion } from "framer-motion"
import { Search, Layers, Filter } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MapPinComponent } from "@/components/ui/map-pin"

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
  // google maps api insert here

  const typeColors = {
    visited: "#d4af37", // gold
    planned: "#4c6b54", // forest
    favorite: "#b22222", // red
  }

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

      {/* map placeholder */}
      <div className="w-full h-full bg-parchment-dark map-texture">
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

        {locations.map((location, index) => (
          <MapPinComponent
            key={location.id}
            label={location.name}
            showLabel
            color={typeColors[location.type]}
            className="absolute"
            style={{
              left: `${((location.lng + 180) / 360) * 100}%`,
              top: `${((90 - location.lat) / 180) * 100}%`,
            }}
            delay={index * 0.1}
          />
        ))}
      </div>
    </div>
  )
}
