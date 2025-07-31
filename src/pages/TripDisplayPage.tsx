"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { format } from "date-fns"
import { 
  Calendar, 
  MapPin, 
  Users, 
  Edit3, 
  Heart, 
  Share2, 
  ArrowLeft, 
  Loader2, 
  Plane, 
  Camera, 
  BookOpen,
  Map,
  Archive,
  Plus,
  User
} from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import { Navbar } from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AnimatedButton } from "@/components/ui/animated-button"
import { EntryCard } from "@/components/ui/entry-card"
import { useAuth } from '@/context/useAuth'
import { tripService } from "@/services/tripService"
import { entryService } from "@/services/entryService"
import { type TripWithDetails, type Entry } from "@/lib/types"
import { toast } from "sonner"

export default function TripDisplayPage() {
  const navigate = useNavigate()
  const params = useParams()
  const { user } = useAuth()
  const tripId = params?.id as string
  
  const [trip, setTrip] = React.useState<TripWithDetails | null>(null)
  const [tripEntries, setTripEntries] = React.useState<Entry[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isTogglingFavorite, setIsTogglingFavorite] = React.useState(false)

  const loadTripData = React.useCallback(async () => {
    if (!tripId) return

    try {
      setIsLoading(true)
      const [tripData, entries] = await Promise.all([
        tripService.getTripWithDetails(tripId),
        tripService.getTripEntries(tripId)
      ])
      
      if (!tripData) {
        toast.error("Trip not found")
        navigate('/dashboard')
        return
      }

      setTrip(tripData)
      setTripEntries(entries)
    } catch (error) {
      console.error('Error loading trip:', error)
      toast.error("Failed to load trip")
      navigate('/dashboard')
    } finally {
      setIsLoading(false)
    }
  }, [tripId, navigate])

  React.useEffect(() => {
    loadTripData()
  }, [loadTripData])

  const handleFavoriteToggle = async () => {
    if (!trip || isTogglingFavorite) return

    setIsTogglingFavorite(true)
    try {
      await tripService.toggleTripFavorite(trip.id)
      setTrip(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null)
      toast.success(trip.isFavorite ? "Removed from favorites" : "Added to favorites")
    } catch (error) {
      console.error('Error toggling favorite:', error)
      toast.error("Failed to update favorites")
    } finally {
      setIsTogglingFavorite(false)
    }
  }

  const handleEntryFavoriteToggle = async (entryId: string) => {
    try {
      await entryService.toggleFavorite(entryId)
      setTripEntries(prev => 
        prev.map(entry => 
          entry.id === entryId 
            ? { ...entry, isFavorite: !entry.isFavorite } 
            : entry
        )
      )
      toast.success("Entry updated!")
    } catch (error) {
      console.error('Error toggling entry favorite:', error)
      toast.error("Failed to update entry")
    }
  }

  const handleEntryDelete = () => {
    loadTripData()
  }

  const getEntryIcon = (type: string) => {
    switch (type) {
      case "journal": return <BookOpen className="h-4 w-4" />
      case "photo": return <Camera className="h-4 w-4" />
      case "map": return <Map className="h-4 w-4" />
      case "artifact": return <Archive className="h-4 w-4" />
      default: return <BookOpen className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 border-green-200"
      case "active": return "bg-blue-100 text-blue-800 border-blue-200"
      case "planned": return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "draft": return "bg-gray-100 text-gray-800 border-gray-200"
      default: return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return "✓"
      case "active": return "✈️"
      case "planned": return "📅"
      case "draft": return "📝"
      default: return "📝"
    }
  }

  const formatDateRange = () => {
    if (!trip?.startDate) return 'Date not set'
    
    const start = format(new Date(trip.startDate), "MMM d, yyyy")
    
    if (!trip.endDate) {
      return `Starting ${start}`
    }
    
    const end = format(new Date(trip.endDate), "MMM d, yyyy")
    
    if (trip.startDate === trip.endDate) {
      return start
    }
    
    return `${start} - ${end}`
  }

  const calculateDuration = () => {
    if (!trip?.startDate || !trip?.endDate) return null
    
    const start = new Date(trip.startDate)
    const end = new Date(trip.endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return diffDays === 1 ? "1 day" : `${diffDays} days`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col parchment-texture">
        <Navbar />
        <main className="flex-1 pt-24 pb-16 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-gold mx-auto mb-4" />
            <p className="text-deepbrown/70">Loading trip...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex flex-col parchment-texture">
        <Navbar />
        <main className="flex-1 pt-24 pb-16 flex items-center justify-center">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold text-deepbrown mb-4">
              Trip Not Found
            </h2>
            <p className="text-deepbrown/70 mb-6">
              The trip you're looking for doesn't exist or may have been removed.
            </p>
            <Button onClick={() => navigate('/dashboard')} className="bg-gold hover:bg-gold/90">
              Back to Dashboard
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const isOwner = user && user.uid === trip.uid

  return (
    <div className="min-h-screen flex flex-col parchment-texture">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate(-1)}
                className="border-gold/30 bg-transparent"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="font-display text-3xl font-bold text-deepbrown">
                    {trip.name}
                  </h1>
                  <Badge className={getStatusColor(trip.status)}>
                    <span className="mr-1">{getStatusIcon(trip.status)}</span>
                    {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-deepbrown/70">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gold" />
                    <span>{formatDateRange()}</span>
                    {calculateDuration() && (
                      <>
                        <span>•</span>
                        <span>{calculateDuration()}</span>
                      </>
                    )}
                  </div>
                  {trip.countriesVisited && trip.countriesVisited.length > 0 && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gold" />
                      <span>
                        {trip.countriesVisited.length === 1 
                          ? trip.countriesVisited[0]
                          : `${trip.countriesVisited.length} countries`
                        }
                      </span>
                    </div>
                  )}
                  {trip.totalEntries > 0 && (
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-gold" />
                      <span>{trip.totalEntries} {trip.totalEntries === 1 ? 'entry' : 'entries'}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleFavoriteToggle}
                  disabled={isTogglingFavorite}
                  className="border-gold/30 bg-transparent"
                >
                  <Heart 
                    className={`h-4 w-4 ${trip.isFavorite ? 'fill-red-500 text-red-500' : 'text-deepbrown'}`} 
                  />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="border-gold/30 bg-transparent"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                {isOwner && (
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/edit-trip/${trip.id}`)}
                    className="border-gold/30 bg-transparent"
                  >
                    <Edit3 className="mr-2 h-4 w-4" />
                    Edit Trip
                  </Button>
                )}
              </div>
            </div>

            {trip.coverImageUrl && (
              <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden mb-6">
                <img
                  src={trip.coverImageUrl}
                  alt={trip.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
            <div className="space-y-8">
              {trip.description && (
                <Card className="border-gold/20 bg-parchment-light">
                  <CardHeader>
                    <CardTitle className="text-xl text-deepbrown">About This Trip</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-deepbrown/80 leading-relaxed whitespace-pre-wrap">
                      {trip.description}
                    </p>
                  </CardContent>
                </Card>
              )}

              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display text-2xl font-semibold text-deepbrown">
                    Trip Entries
                    {tripEntries.length > 0 && (
                      <span className="text-lg font-normal text-deepbrown/70 ml-2">
                        ({tripEntries.length})
                      </span>
                    )}
                  </h2>
                  {isOwner && (
                    <AnimatedButton 
                      animationType="glow"
                      onClick={() => navigate('/entry/new')}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Entry
                    </AnimatedButton>
                  )}
                </div>

                {tripEntries.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tripEntries.map((entry, index) => (
                      <EntryCard
                        key={entry.id}
                        id={entry.id}
                        title={entry.title}
                        location={`${entry.location}, ${entry.country}`}
                        timestamp={entry.timestamp}
                        excerpt={entry.content.substring(0, 150) + '...'}
                        imageUrl={entry.mediaUrls[0] || "/placeholder.svg?height=400&width=600"}
                        index={index}
                        type={entry.type}
                        isFavorite={entry.isFavorite}
                        isDraft={entry.isDraft}
                        onFavoriteToggle={() => handleEntryFavoriteToggle(entry.id)}
                        onDelete={handleEntryDelete}
                        entryIcon={getEntryIcon(entry.type)}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="border-gold/20 bg-parchment-light">
                    <CardContent className="text-center py-12">
                      <BookOpen className="h-16 w-16 text-gold/50 mx-auto mb-4" />
                      <h3 className="font-display text-xl font-medium text-deepbrown mb-2">
                        No entries yet
                      </h3>
                      <p className="text-deepbrown/70 mb-6">
                        Start documenting your adventure by adding your first entry
                      </p>
                      {isOwner && (
                        <AnimatedButton 
                          animationType="glow"
                          onClick={() => navigate('/entry/new')}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add First Entry
                        </AnimatedButton>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {trip.dayLogs && trip.dayLogs.length > 0 && (
                <div>
                  <h2 className="font-display text-2xl font-semibold text-deepbrown mb-6">
                    Daily Timeline
                  </h2>
                  <div className="space-y-4">
                    {trip.dayLogs.map((dayLog) => (
                      <Card key={dayLog.id} className="border-gold/20 bg-parchment-light">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="font-display text-lg font-medium text-deepbrown">
                                {format(new Date(dayLog.date), "EEEE, MMMM d, yyyy")}
                              </h3>
                              <div className="flex items-center gap-4 text-sm text-deepbrown/70 mt-1">
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  <span>{dayLog.location}, {dayLog.country}</span>
                                </div>
                                {dayLog.totalEntries > 0 && (
                                  <div className="flex items-center gap-1">
                                    <BookOpen className="h-3 w-3" />
                                    <span>{dayLog.totalEntries} {dayLog.totalEntries === 1 ? 'entry' : 'entries'}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          {dayLog.description && (
                            <p className="text-deepbrown/80 leading-relaxed">
                              {dayLog.description}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <Card className="border-gold/20 bg-parchment-light">
                <CardHeader>
                  <CardTitle className="text-lg text-deepbrown">Trip Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-deepbrown/70">Status</span>
                    <Badge className={getStatusColor(trip.status)} variant="outline">
                      {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-deepbrown/70">Duration</span>
                    <span className="font-medium">{calculateDuration() || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-deepbrown/70">Total Entries</span>
                    <span className="font-medium">{trip.totalEntries}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-deepbrown/70">Countries</span>
                    <span className="font-medium">{trip.countriesVisited?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-deepbrown/70">Daily Logs</span>
                    <span className="font-medium">{trip.dayLogs?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-deepbrown/70">Locations</span>
                    <span className="font-medium">{trip.locationCount || 0}</span>
                  </div>
                </CardContent>
              </Card>

              {trip.companions && trip.companions.length > 0 && (
                <Card className="border-gold/20 bg-parchment-light">
                  <CardHeader>
                    <CardTitle className="text-lg text-deepbrown flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Travel Companions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {trip.companions.map((companion, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gold" />
                          <span className="text-deepbrown">{companion}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {trip.countriesVisited && trip.countriesVisited.length > 0 && (
                <Card className="border-gold/20 bg-parchment-light">
                  <CardHeader>
                    <CardTitle className="text-lg text-deepbrown flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Countries Visited
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {trip.countriesVisited.map((country, index) => (
                        <Badge 
                          key={index}
                          variant="secondary" 
                          className="bg-gold/10 text-deepbrown border border-gold/30"
                        >
                          {country}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {trip.tags && trip.tags.length > 0 && (
                <Card className="border-gold/20 bg-parchment-light">
                  <CardHeader>
                    <CardTitle className="text-lg text-deepbrown flex items-center gap-2">
                      <Plane className="h-5 w-5" />
                      Trip Tags
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {trip.tags.map((tag, index) => (
                        <Badge 
                          key={index}
                          variant="secondary" 
                          className="bg-blue/10 text-deepbrown border border-blue/30"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {trip.recentEntries && trip.recentEntries.length > 0 && (
                <Card className="border-gold/20 bg-parchment-light">
                  <CardHeader>
                    <CardTitle className="text-lg text-deepbrown">Recent Entries</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {trip.recentEntries.slice(0, 3).map((entry) => (
                        <motion.div
                          key={entry.id}
                          className="flex items-center gap-3 p-2 hover:bg-parchment rounded-lg transition-colors cursor-pointer"
                          whileHover={{ x: 3 }}
                          onClick={() => navigate(`/entry/${entry.id}`)}
                        >
                          <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                            {getEntryIcon(entry.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-deepbrown truncate">
                              {entry.title}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-deepbrown/70">
                              <span>{entry.location}</span>
                              <span>•</span>
                              <span>{format(new Date(entry.timestamp), "MMM d")}</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {isOwner && (
                <Card className="border-gold/20 bg-parchment-light">
                  <CardHeader>
                    <CardTitle className="text-lg text-deepbrown">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start border-gold/30 bg-transparent"
                      onClick={() => navigate('/entry/new')}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Entry
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start border-gold/30 bg-transparent"
                      onClick={() => navigate(`/edit-trip/${trip.id}`)}
                    >
                      <Edit3 className="mr-2 h-4 w-4" />
                      Edit Trip
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start border-gold/30 bg-transparent"
                      onClick={() => navigate('/map')}
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      View on Map
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Card className="border-gold/20 bg-parchment-light">
                <CardHeader>
                  <CardTitle className="text-lg text-deepbrown">Trip Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <span className="text-deepbrown/70">Created:</span>
                    <span className="ml-2 font-medium">
                      {format(new Date(trip.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                  {trip.updatedAt && trip.updatedAt !== trip.createdAt && (
                    <div className="text-sm">
                      <span className="text-deepbrown/70">Last updated:</span>
                      <span className="ml-2 font-medium">
                        {format(new Date(trip.updatedAt), "MMM d, yyyy")}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}