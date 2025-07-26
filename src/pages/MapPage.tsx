"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { ChevronRight, ChevronLeft, List, Grid, MapPin, Plus, Loader2 } from "lucide-react"
import { collection, query, where, onSnapshot, doc, addDoc, deleteDoc } from "firebase/firestore"
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
import { type Entry, type MapLocation, type Trip } from "@/lib/types"
import { toast } from "sonner"

export default function MapPage() {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = React.useState(true)
  const [entries, setEntries] = React.useState<Entry[]>([])
  const [mapLocations, setMapLocations] = React.useState<MapLocation[]>([])
  const [trips, setTrips] = React.useState<Trip[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [showLocationDialog, setShowLocationDialog] = React.useState(false)
  const [showTripDialog, setShowTripDialog] = React.useState(false)
  const [selectedEntries, setSelectedEntries] = React.useState<string[]>([])
  
  // New location form
  const [newLocation, setNewLocation] = React.useState({
    name: "",
    type: "visited" as "visited" | "planned" | "favorite",
    coordinates: { lat: 0, lng: 0 }
  })
  
  // New trip form
  const [newTrip, setNewTrip] = React.useState({
    name: "",
    description: "",
    entryIds: [] as string[]
  })

  // Load user entries and map data
  React.useEffect(() => {
    if (!user) return

    setIsLoading(true)

    // Load entries
    const entriesQuery = query(
      collection(db, "entries"),
      where("uid", "==", user.uid),
      where("isDraft", "!=", true)
    )

    const unsubscribeEntries = onSnapshot(entriesQuery, (snapshot) => {
      const entriesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Entry[]
      setEntries(entriesData)
    })

    // Load map locations
    const locationsQuery = query(
      collection(db, "mapLocations"),
      where("uid", "==", user.uid)
    )

    const unsubscribeLocations = onSnapshot(locationsQuery, (snapshot) => {
      const locationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MapLocation[]
      setMapLocations(locationsData)
    })

    // Load trips
    const tripsQuery = query(
      collection(db, "trips"),
      where("uid", "==", user.uid)
    )

    const unsubscribeTrips = onSnapshot(tripsQuery, (snapshot) => {
      const tripsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Trip[]
      setTrips(tripsData)
      setIsLoading(false)
    })

    return () => {
      unsubscribeEntries()
      unsubscribeLocations()
      unsubscribeTrips()
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
        createdAt: new Date().toISOString()
      })

      toast.success("Location added successfully!")
      setShowLocationDialog(false)
      setNewLocation({ name: "", type: "visited", coordinates: { lat: 0, lng: 0 } })
    } catch (error) {
      console.error("Error adding location:", error)
      toast.error("Failed to add location")
    }
  }

  const handleCreateTrip = async () => {
    if (!user || !newTrip.name) {
      toast.error("Please enter a trip name")
      return
    }

    try {
      await addDoc(collection(db, "trips"), {
        uid: user.uid,
        name: newTrip.name,
        description: newTrip.description,
        entryIds: selectedEntries,
        createdAt: new Date().toISOString()
      })

      toast.success("Trip created successfully!")
      setShowTripDialog(false)
      setNewTrip({ name: "", description: "", entryIds: [] })
      setSelectedEntries([])
    } catch (error) {
      console.error("Error creating trip:", error)
      toast.error("Failed to create trip")
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

  const getAllLocations = () => {
    const entryLocations = entries.map(entry => ({
      id: entry.id,
      name: entry.location,
      lat: entry.coordinates.lat,
      lng: entry.coordinates.lng,
      type: "visited" as const,
      entry
    }))

    const customLocations = mapLocations.map(location => ({
      id: location.id,
      name: location.name,
      lat: location.lat,
      lng: location.lng,
      type: location.type,
      location
    }))

    return [...entryLocations, ...customLocations]
  }

  const getLocationsByType = (type: string) => {
    return getAllLocations().filter(loc => loc.type === type)
  }

  const toggleEntrySelection = (entryId: string) => {
    setSelectedEntries(prev => 
      prev.includes(entryId) 
        ? prev.filter(id => id !== entryId)
        : [...prev, entryId]
    )
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
            initial={{ width: 320 }}
            animate={{ width: sidebarOpen ? 320 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-medium text-deepbrown">Your Locations</h2>
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
                        <div className="h-[200px] rounded-lg overflow-hidden">
                          <MapViewer
                            locations={newLocation.coordinates.lat ? [{
                              id: 'new',
                              name: newLocation.name,
                              lat: newLocation.coordinates.lat,
                              lng: newLocation.coordinates.lng,
                              type: newLocation.type
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

              <Tabs defaultValue="all" className="w-full">
                <TabsList className="bg-parchment-dark border border-gold/20 w-full">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="visited">Visited</TabsTrigger>
                  <TabsTrigger value="planned">Planned</TabsTrigger>
                  <TabsTrigger value="trips">Trips</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-4 space-y-2">
                  {getAllLocations().map((location, index) => (
                    <motion.div
                      key={`${location.id}-${location.type}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 p-3 hover:bg-parchment rounded-lg transition-colors cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                        <MapPin
                          className="h-4 w-4"
                          color={
                            location.type === "visited"
                              ? "#d4af37"
                              : location.type === "planned"
                                ? "#4c6b54"
                                : "#b22222"
                          }
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-deepbrown">{location.name}</p>
                        <p className="text-xs text-deepbrown/70 capitalize">{location.type}</p>
                      </div>
                      {('location' in location) && (
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
                      key={`visited-${location.id}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 p-3 hover:bg-parchment rounded-lg transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-gold" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-deepbrown">{location.name}</p>
                        <p className="text-xs text-deepbrown/70">Visited</p>
                      </div>
                    </motion.div>
                  ))}
                </TabsContent>

                <TabsContent value="planned" className="mt-4 space-y-2">
                  {getLocationsByType("planned").map((location, index) => (
                    <motion.div
                      key={`planned-${location.id}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 p-3 hover:bg-parchment rounded-lg transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full bg-forest/10 flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-forest" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-deepbrown">{location.name}</p>
                        <p className="text-xs text-deepbrown/70">Planned</p>
                      </div>
                    </motion.div>
                  ))}
                </TabsContent>

                <TabsContent value="trips" className="mt-4 space-y-2">
                  <div className="mb-4">
                    <Dialog open={showTripDialog} onOpenChange={setShowTripDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="w-full bg-gold hover:bg-gold/90">
                          <Plus className="mr-2 h-4 w-4" />
                          Create Trip
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="parchment border border-gold/20 max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="font-display text-deepbrown">Create New Trip</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="trip-name">Trip Name</Label>
                            <Input
                              id="trip-name"
                              placeholder="Enter trip name"
                              value={newTrip.name}
                              onChange={(e) => setNewTrip(prev => ({ ...prev, name: e.target.value }))}
                              className="bg-parchment border-gold/30"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="trip-description">Description (Optional)</Label>
                            <Input
                              id="trip-description"
                              placeholder="Trip description"
                              value={newTrip.description}
                              onChange={(e) => setNewTrip(prev => ({ ...prev, description: e.target.value }))}
                              className="bg-parchment border-gold/30"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Select Entries</Label>
                            <div className="max-h-48 overflow-y-auto space-y-2 border border-gold/20 rounded-lg p-3">
                              {entries.map(entry => (
                                <div key={entry.id} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`entry-${entry.id}`}
                                    checked={selectedEntries.includes(entry.id)}
                                    onChange={() => toggleEntrySelection(entry.id)}
                                    className="rounded"
                                  />
                                  <label 
                                    htmlFor={`entry-${entry.id}`}
                                    className="text-sm text-deepbrown cursor-pointer flex-1"
                                  >
                                    {entry.title} - {entry.location}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                          </DialogClose>
                          <Button onClick={handleCreateTrip} className="bg-gold hover:bg-gold/90">
                            Create Trip
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  {trips.map((trip, index) => (
                    <motion.div
                      key={trip.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 p-3 hover:bg-parchment rounded-lg transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full bg-deepbrown/10 flex items-center justify-center">
                        <List className="h-4 w-4 text-deepbrown" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-deepbrown">{trip.name}</p>
                        <p className="text-xs text-deepbrown/70">{trip.entryIds.length} locations</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-deepbrown/50" />
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

            <MapViewer locations={getAllLocations()} />

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