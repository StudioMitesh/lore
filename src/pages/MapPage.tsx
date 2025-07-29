"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { ChevronRight, ChevronLeft, Grid, MapPin, Plus, Loader2, Route } from "lucide-react"
import { collection, query, where, onSnapshot, doc, addDoc, deleteDoc, getDocs } from "firebase/firestore"
import { Navbar } from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapViewer } from "@/components/MapViewer"
import { AnimatedButton } from "@/components/ui/animated-button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { db } from "@/api/firebase"
import { useAuth } from '@/context/useAuth'
import { type Entry, type MapLocation, type Trip, type DayLog, type TripWithDetails } from "@/lib/types"
import { toast } from "sonner"
import { format } from "date-fns"

interface MapLocationWithDetails extends MapLocation {
  trip?: Trip
  dayLog?: DayLog
  entry?: Entry
}

export default function MapPage() {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = React.useState(true)
  const [trips, setTrips] = React.useState<TripWithDetails[]>([])
  const [standaloneEntries, setStandaloneEntries] = React.useState<Entry[]>([])
  const [customLocations, setCustomLocations] = React.useState<MapLocation[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [showLocationDialog, setShowLocationDialog] = React.useState(false)
  const [selectedTrip, setSelectedTrip] = React.useState<string>("")
  
  const [newLocation, setNewLocation] = React.useState({
    name: "",
    type: "visited" as "visited" | "planned" | "favorite",
    coordinates: { lat: 0, lng: 0 },
    tripId: ""
  })

  React.useEffect(() => {
    if (!user) return

    setIsLoading(true)

    // Load trips with their day logs and entries
    const tripsQuery = query(
      collection(db, "trips"),
      where("uid", "==", user.uid)
    )

    const unsubscribeTrips = onSnapshot(tripsQuery, async (snapshot) => {
      const tripsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Trip[]

      // For each trip, load its day logs and recent entries
      const tripsWithDetails: TripWithDetails[] = []
      for (const trip of tripsData) {
        const dayLogsQuery = query(
          collection(db, "dayLogs"),
          where("tripId", "==", trip.id)
        )
        
        const dayLogsSnapshot = await getDocs(dayLogsQuery)
        const dayLogs = dayLogsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as DayLog[]

        const entriesQuery = query(
          collection(db, "entries"),
          where("tripId", "==", trip.id),
          where("isDraft", "!=", true)
        )
        
        const entriesSnapshot = await getDocs(entriesQuery)
        const recentEntries = entriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Entry[]

        // Get unique locations count
        const locationCount = new Set(recentEntries.map(e => `${e.coordinates.lat},${e.coordinates.lng}`)).size

        tripsWithDetails.push({
          ...trip,
          dayLogs,
          recentEntries: recentEntries.slice(0, 5), // Recent 5 entries
          locationCount
        })
      }

      setTrips(tripsWithDetails)
    })

    // Load standalone entries
    const standaloneQuery = query(
      collection(db, "entries"),
      where("uid", "==", user.uid),
      where("isStandalone", "==", true),
      where("isDraft", "!=", true)
    )

    const unsubscribeStandalone = onSnapshot(standaloneQuery, (snapshot) => {
      const standaloneData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Entry[]
      setStandaloneEntries(standaloneData)
    })

    // Load custom locations
    const customLocationsQuery = query(
      collection(db, "mapLocations"),
      where("uid", "==", user.uid),
      where("isCustom", "==", true)
    )

    const unsubscribeCustom = onSnapshot(customLocationsQuery, (snapshot) => {
      const customData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MapLocation[]
      setCustomLocations(customData)
      setIsLoading(false)
    })

    return () => {
      unsubscribeTrips()
      unsubscribeStandalone()
      unsubscribeCustom()
    }
  }, [user])

  const handleLocationSelect = (location: { lat: number; lng: number; address?: string }) => {
    setNewLocation(prev => ({
      ...prev,
      coordinates: { lat: location.lat, lng: location.lng },
      name: prev.name || location.address || `Location ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
    }))
  }

  const handleAddLocation = async () => {
    if (!user || !newLocation.name || !newLocation.coordinates.lat) {
      toast.error("Please fill in all required fields and select a location")
      return
    }

    try {
      await addDoc(collection(db, "mapLocations"), {
        uid: user.uid,
        name: newLocation.name,
        lat: newLocation.coordinates.lat,
        lng: newLocation.coordinates.lng,
        type: newLocation.type,
        tripId: newLocation.tripId || undefined,
        isCustom: true,
        createdAt: new Date().toISOString()
      })

      toast.success("Location added successfully!")
      setShowLocationDialog(false)
      setNewLocation({ name: "", type: "visited", coordinates: { lat: 0, lng: 0 }, tripId: "" })
    } catch (error) {
      console.error("Error adding location:", error)
      toast.error("Failed to add location")
    }
  }

  const handleRemoveLocation = async (locationId: string) => {
    try {
      await deleteDoc(doc(db, "mapLocations", locationId))
      toast.success("Location removed")
    } catch (error) {
      console.error("Error removing location:", error)
      toast.error("Failed to remove location")
    }
  }

  const getAllMapLocations = () => {
    const locations: MapLocationWithDetails[] = []

    // Add trip-based locations (grouped by trip)
    trips.forEach(trip => {
      // Get unique locations from trip entries
      const tripLocations = new Map<string, Entry>()
      trip.recentEntries.forEach(entry => {
        const key = `${entry.coordinates.lat},${entry.coordinates.lng}`
        if (!tripLocations.has(key)) {
          tripLocations.set(key, entry)
        }
      })

      // Add trip locations
      tripLocations.forEach(entry => {
        locations.push({
          id: `trip-${trip.id}-${entry.id}`,
          uid: user?.uid || "",
          name: entry.location,
          lat: entry.coordinates.lat,
          lng: entry.coordinates.lng,
          type: "visited",
          tripId: trip.id,
          trip,
          entry,
          isCustom: false
        })
      })
    })

    // Add standalone entry locations
    standaloneEntries.forEach(entry => {
      locations.push({
        id: `standalone-${entry.id}`,
        uid: user?.uid || "",
        name: entry.location,
        lat: entry.coordinates.lat,
        lng: entry.coordinates.lng,
        type: "visited",
        entry,
        isCustom: false
      })
    })

    // Add custom locations
    customLocations.forEach(location => {
      const trip = location.tripId ? trips.find(t => t.id === location.tripId) : undefined
      locations.push({
        ...location,
        trip
      })
    })

    return locations
  }

  const getLocationsByType = (type: string) => {
    if (type === "trips") {
      return trips.map(trip => ({
        id: trip.id,
        name: trip.name,
        type: "trip" as const,
        trip,
        locationCount: trip.locationCount,
        status: trip.status
      }))
    }
    return getAllMapLocations().filter(loc => loc.type === type)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col parchment-texture">
        <Navbar />
        <main className="flex-1 pt-16 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-gold mx-auto mb-4" />
            <p className="text-deepbrown/70">Loading your map...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col parchment-texture">
      <Navbar />

      <main className="flex-1 pt-16">
        <div className="flex h-[calc(100vh-4rem)]">
          <motion.div
            className="bg-parchment-light border-r border-gold/20 h-full overflow-y-auto"
            initial={{ width: 350 }}
            animate={{ width: sidebarOpen ? 350 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-medium text-deepbrown">Travel Map</h2>
                <div className="flex gap-2">
                  <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="border-gold/30 bg-transparent">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="parchment border border-gold/20">
                      <DialogHeader>
                        <DialogTitle className="font-display text-deepbrown">Add Custom Location</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="location-name">Location Name</Label>
                          <Input
                            id="location-name"
                            placeholder="Enter location name"
                            value={newLocation.name}
                            onChange={(e) => setNewLocation(prev => ({ ...prev, name: e.target.value }))}
                            className="bg-parchment border-gold/30"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="location-type">Type</Label>
                          <Select 
                            value={newLocation.type} 
                            onValueChange={(value: any) => setNewLocation(prev => ({ ...prev, type: value }))}
                          >
                            <SelectTrigger className="bg-parchment border-gold/30">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="visited">Visited</SelectItem>
                              <SelectItem value="planned">Planned</SelectItem>
                              <SelectItem value="favorite">Favorite</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="trip-assignment">Assign to Trip (Optional)</Label>
                          <Select 
                            value={newLocation.tripId} 
                            onValueChange={(value) => setNewLocation(prev => ({ ...prev, tripId: value }))}
                          >
                            <SelectTrigger className="bg-parchment border-gold/30">
                              <SelectValue placeholder="Select a trip..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">No trip</SelectItem>
                              {trips.map(trip => (
                                <SelectItem key={trip.id} value={trip.id}>
                                  {trip.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="h-[200px] rounded-lg overflow-hidden">
                          <MapViewer
                            locations={newLocation.coordinates.lat ? [{
                              id: 'new',
                              name: newLocation.name,
                              lat: newLocation.coordinates.lat,
                              lng: newLocation.coordinates.lng,
                              type: newLocation.type,
                              uid: user?.uid || ""
                            }] : []}
                            onLocationSelect={handleLocationSelect}
                            interactive={true}
                            zoom={2}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleAddLocation} className="bg-gold hover:bg-gold/90">
                          Add Location
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <Tabs defaultValue="trips" className="w-full">
                <TabsList className="bg-parchment-dark border border-gold/20 w-full">
                  <TabsTrigger value="trips">Trips</TabsTrigger>
                  <TabsTrigger value="all">All Locations</TabsTrigger>
                  <TabsTrigger value="visited">Visited</TabsTrigger>
                  <TabsTrigger value="planned">Planned</TabsTrigger>
                  <TabsTrigger value="custom">Custom</TabsTrigger>
                </TabsList>

                <TabsContent value="trips" className="mt-4 space-y-2">
                  {trips.map((trip, index) => (
                    <motion.div
                      key={trip.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 p-3 hover:bg-parchment rounded-lg transition-colors cursor-pointer group"
                      onClick={() => setSelectedTrip(selectedTrip === trip.id ? "" : trip.id)}
                    >
                      <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                        <Route
                          className="h-4 w-4"
                          color={
                            trip.status === "completed" ? "#d4af37" :
                            trip.status === "active" ? "#4c6b54" :
                            trip.status === "planned" ? "#b22222" :
                            "#8B7355"
                          }
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-deepbrown">{trip.name}</p>
                        <div className="flex items-center gap-2 text-xs text-deepbrown/70">
                          <span className="capitalize">{trip.status}</span>
                          <span>•</span>
                          <span>{trip.locationCount} locations</span>
                          <span>•</span>
                          <span>{trip.totalEntries} entries</span>
                        </div>
                      </div>
                      <ChevronRight 
                        className={`h-4 w-4 text-deepbrown/50 transition-transform ${
                          selectedTrip === trip.id ? 'rotate-90' : ''
                        }`} 
                      />
                    </motion.div>
                  ))}

                  {/* Standalone entries section */}
                  {standaloneEntries.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-sm font-medium text-deepbrown/70 mb-2 px-2">Standalone Entries</h4>
                      {standaloneEntries.map((entry, index) => (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: (trips.length + index) * 0.05 }}
                          className="flex items-center gap-3 p-3 hover:bg-parchment rounded-lg transition-colors cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-full bg-forest/10 flex items-center justify-center">
                            <MapPin className="h-4 w-4 text-forest" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-deepbrown">{entry.title}</p>
                            <p className="text-xs text-deepbrown/70">{entry.location}, {entry.country}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="all" className="mt-4 space-y-2">
                  {getAllMapLocations().map((location, index) => (
                    <motion.div
                      key={location.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 p-3 hover:bg-parchment rounded-lg transition-colors cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                        <MapPin
                          className="h-4 w-4"
                          color={
                            location.type === "visited" ? "#d4af37" :
                            location.type === "planned" ? "#4c6b54" :
                            location.type === "favorite" ? "#b22222" :
                            "#8B7355"
                          }
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-deepbrown">{location.name}</p>
                        <div className="flex items-center gap-1 text-xs text-deepbrown/70">
                          <span className="capitalize">{location.type}</span>
                          {location.trip && (
                            <>
                              <span>•</span>
                              <span className="text-gold">{location.trip.name}</span>
                            </>
                          )}
                          {location.entry && (
                            <>
                              <span>•</span>
                              <span>{format(new Date(location.entry.timestamp), "MMM d, yyyy")}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {location.isCustom && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveLocation(location.id)
                          }}
                        >
                          <ChevronRight className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </motion.div>
                  ))}
                </TabsContent>

                <TabsContent value="visited" className="mt-4 space-y-2">
                  {getLocationsByType("visited").map((location, index) => (
                    <motion.div
                      key={location.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 p-3 hover:bg-parchment rounded-lg transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-gold" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-deepbrown">{location.name}</p>
                        <p className="text-xs text-deepbrown/70">Visited</p>
                      </div>
                    </motion.div>
                  ))}
                </TabsContent>

                <TabsContent value="planned" className="mt-4 space-y-2">
                  {getLocationsByType("planned").map((location, index) => (
                    <motion.div
                      key={location.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 p-3 hover:bg-parchment rounded-lg transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full bg-forest/10 flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-forest" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-deepbrown">{location.name}</p>
                        <p className="text-xs text-deepbrown/70">Planned</p>
                      </div>
                    </motion.div>
                  ))}
                </TabsContent>

                <TabsContent value="custom" className="mt-4 space-y-2">
                  {customLocations.map((location, index) => (
                    <motion.div
                      key={location.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 p-3 hover:bg-parchment rounded-lg transition-colors cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-full bg-deepbrown/10 flex items-center justify-center">
                        <MapPin
                          className="h-4 w-4"
                          color={
                            location.type === "visited" ? "#d4af37" :
                            location.type === "planned" ? "#4c6b54" :
                            "#b22222"
                          }
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-deepbrown">{location.name}</p>
                        <p className="text-xs text-deepbrown/70 capitalize">{location.type}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveLocation(location.id)
                        }}
                      >
                        <ChevronRight className="h-4 w-4 text-red-500" />
                      </Button>
                    </motion.div>
                  ))}
                </TabsContent>
              </Tabs>
            </div>
          </motion.div>

          <div className="flex-1 relative">
            <Button
              variant="outline"
              size="icon"
              className="absolute top-4 left-4 z-10 bg-parchment/90 backdrop-blur-sm border-gold/30"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>

            <MapViewer 
              locations={getAllMapLocations()} 
              trips={trips}
              selectedTripId={selectedTrip}
            />

            <div className="absolute bottom-6 left-6 z-10">
              <AnimatedButton animationType="glow">
                <Grid className="mr-2 h-4 w-4" />
                Toggle AR View
              </AnimatedButton>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}