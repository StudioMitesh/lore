"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { ChevronRight, ChevronLeft, List, Grid, MapPin } from "lucide-react"
import { Navbar } from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapViewer } from "@/components/MapViewer"
import { AnimatedButton } from "@/components/ui/animated-button"

// mock data
const locations = [
  { id: "1", name: "Machu Picchu", lat: -13.1631, lng: -72.545, type: "visited" },
  { id: "2", name: "Kyoto", lat: 35.0116, lng: 135.7681, type: "visited" },
  { id: "3", name: "Serengeti", lat: -2.3333, lng: 34.8333, type: "visited" },
  { id: "4", name: "Tromsø", lat: 69.6492, lng: 18.9553, type: "visited" },
  { id: "5", name: "Santorini", lat: 36.3932, lng: 25.4615, type: "visited" },
  { id: "6", name: "Sahara Desert", lat: 23.4162, lng: -12.6089, type: "visited" },
  { id: "7", name: "Bali", lat: -8.3405, lng: 115.092, type: "planned" },
  { id: "8", name: "New Zealand", lat: -40.9006, lng: 174.886, type: "planned" },
  { id: "9", name: "Iceland", lat: 64.9631, lng: -19.0208, type: "favorite" },
]

const trips = [
  { id: "1", name: "South America 2023", count: 3 },
  { id: "2", name: "Asia Tour", count: 2 },
  { id: "3", name: "African Safari", count: 1 },
  { id: "4", name: "European Winter", count: 2 },
]

export default function MapPage() {
  const [sidebarOpen, setSidebarOpen] = React.useState(true)

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
              <h2 className="font-display text-xl font-medium text-deepbrown mb-4">Your Locations</h2>

              <Tabs defaultValue="all" className="w-full">
                <TabsList className="bg-parchment-dark border border-gold/20 w-full">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="visited">Visited</TabsTrigger>
                  <TabsTrigger value="planned">Planned</TabsTrigger>
                  <TabsTrigger value="trips">Trips</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-4 space-y-2">
                  {locations.map((location, index) => (
                    <motion.div
                      key={location.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 p-3 hover:bg-parchment rounded-lg transition-colors cursor-pointer"
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
                      <div>
                        <p className="text-sm font-medium text-deepbrown">{location.name}</p>
                        <p className="text-xs text-deepbrown/70">
                          {location.type === "visited"
                            ? "Visited"
                            : location.type === "planned"
                              ? "Planned"
                              : "Favorite"}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </TabsContent>

                <TabsContent value="visited" className="mt-4 space-y-2">
                  {locations
                    .filter((l) => l.type === "visited")
                    .map((location, index) => (
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
                        <div>
                          <p className="text-sm font-medium text-deepbrown">{location.name}</p>
                          <p className="text-xs text-deepbrown/70">Visited</p>
                        </div>
                      </motion.div>
                    ))}
                </TabsContent>

                <TabsContent value="planned" className="mt-4 space-y-2">
                  {locations
                    .filter((l) => l.type === "planned")
                    .map((location, index) => (
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
                        <div>
                          <p className="text-sm font-medium text-deepbrown">{location.name}</p>
                          <p className="text-xs text-deepbrown/70">Planned</p>
                        </div>
                      </motion.div>
                    ))}
                </TabsContent>

                <TabsContent value="trips" className="mt-4 space-y-2">
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
                        <p className="text-xs text-deepbrown/70">{trip.count} locations</p>
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

            <MapViewer locations={locations} />

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
