"use client"

import { motion } from "framer-motion"
import { X, MapPin, Calendar, Tag, Camera, BookOpen, Map, Archive, Heart, Route, Clock, Globe } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { type Entry, type Trip } from "@/lib/types"
import { format } from "date-fns"

interface LocationModalProps {
  isOpen: boolean
  onClose: () => void
  entry?: Entry
  trip?: Trip
  locationName: string
  coordinates: { lat: number; lng: number }
  type?: "visited" | "planned" | "favorite"
}

export function LocationModal({ 
  isOpen, 
  onClose, 
  entry, 
  trip, 
  locationName, 
  coordinates, 
  type = "visited" 
}: LocationModalProps) {

  const getTypeIcon = (entryType?: string) => {
    switch (entryType) {
      case "journal": return <BookOpen className="h-4 w-4" />
      case "photo": return <Camera className="h-4 w-4" />
      case "map": return <Map className="h-4 w-4" />
      case "artifact": return <Archive className="h-4 w-4" />
      default: return <MapPin className="h-4 w-4" />
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "completed": return "text-gold"
      case "active": return "text-forest"
      case "planned": return "text-red-800"
      case "draft": return "text-deepbrown"
      default: return "text-deepbrown"
    }
  }

  const getTypeColor = (locationType: string) => {
    switch (locationType) {
      case "visited": return "bg-gold/10 text-gold border-gold/30"
      case "planned": return "bg-forest/10 text-forest border-forest/30"
      case "favorite": return "bg-red-100 text-red-800 border-red-200"
      default: return "bg-gold/10 text-gold border-gold/30"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="parchment border border-gold/20 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                {getTypeIcon(entry?.type)}
              </div>
              <div>
                <DialogTitle className="font-display text-xl text-deepbrown flex items-center gap-2">
                  {entry?.title || locationName}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="h-4 w-4 text-deepbrown/50" />
                  <span className="text-sm text-deepbrown/70">{locationName}</span>
                  <Badge className={`text-xs ${getTypeColor(type)}`}>
                    {type}
                  </Badge>
                </div>
              </div>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="space-y-6">

          <div className="bg-parchment-light border border-gold/20 rounded-lg p-4">
            <h3 className="font-medium text-deepbrown mb-3 flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Location Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-deepbrown/60">Coordinates:</span>
                <p className="text-deepbrown font-mono">
                  {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                </p>
              </div>
              {entry?.country && (
                <div>
                  <span className="text-deepbrown/60">Country:</span>
                  <p className="text-deepbrown">{entry.country}</p>
                </div>
              )}
            </div>
          </div>


          {trip && (
            <div className="bg-parchment-light border border-gold/20 rounded-lg p-4">
              <h3 className="font-medium text-deepbrown mb-3 flex items-center gap-2">
                <Route className="h-4 w-4" />
                Trip Information
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-deepbrown font-medium">{trip.name}</span>
                  <Badge className={`text-xs capitalize ${getStatusColor(trip.status)}`}>
                    {trip.status}
                  </Badge>
                </div>
                {trip.description && (
                  <p className="text-sm text-deepbrown/70">{trip.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-deepbrown/60">
                  <span>{trip.totalEntries} entries</span>
                  <span>{trip.countriesVisited?.length || 0} countries</span>
                  {trip.startDate && (
                    <span>{format(new Date(trip.startDate), "MMM yyyy")}</span>
                  )}
                </div>
              </div>
            </div>
          )}


          {entry && (
            <>
              <div className="bg-parchment-light border border-gold/20 rounded-lg p-4">
                <h3 className="font-medium text-deepbrown mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Entry Details
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-deepbrown/50" />
                      <span className="text-deepbrown/60">Date:</span>
                      <span className="text-deepbrown font-medium">
                        {format(new Date(entry.timestamp), "MMMM d, yyyy")}
                      </span>
                    </div>
                    {entry.isFavorite && (
                      <div className="flex items-center gap-1">
                        <Heart className="h-4 w-4 text-red-500 fill-current" />
                        <span className="text-xs text-red-600">Favorite</span>
                      </div>
                    )}
                  </div>
                  
                  {entry.tags && entry.tags.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Tag className="h-4 w-4 text-deepbrown/50" />
                        <span className="text-sm text-deepbrown/60">Tags:</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {entry.tags.map((tag, index) => (
                          <Badge 
                            key={index} 
                            variant="secondary" 
                            className="text-xs bg-gold/10 text-deepbrown border border-gold/30"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>


              {entry.content && (
                <div className="bg-parchment-light border border-gold/20 rounded-lg p-4">
                  <h3 className="font-medium text-deepbrown mb-3">Story</h3>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-deepbrown/80 text-sm leading-relaxed whitespace-pre-wrap">
                      {entry.content}
                    </p>
                  </div>
                </div>
              )}


              {entry.mediaUrls && entry.mediaUrls.length > 0 && (
                <div className="bg-parchment-light border border-gold/20 rounded-lg p-4">
                  <h3 className="font-medium text-deepbrown mb-3 flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Photos ({entry.mediaUrls.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {entry.mediaUrls.slice(0, 6).map((url, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="relative group cursor-pointer"
                      >
                        <img
                          src={url}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-gold/20 group-hover:opacity-80 transition-opacity"
                        />
                        {index === 5 && entry.mediaUrls.length > 6 && (
                          <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              +{entry.mediaUrls.length - 6} more
                            </span>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <Separator className="border-gold/20" />


          <div className="flex justify-between items-center pt-2">
            <div className="text-xs text-deepbrown/50">
              {entry?.createdAt && (
                <span>Created {format(new Date(entry.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
              )}
            </div>
            <div className="flex gap-2">
              {entry && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-gold/30 bg-transparent text-deepbrown hover:bg-gold/10"
                >
                  View Full Entry
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={onClose}
                className="border-gold/30 bg-transparent text-deepbrown hover:bg-gold/10"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}