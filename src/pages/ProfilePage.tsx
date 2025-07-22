"use client"
import { motion } from "framer-motion"
import { Settings, Download, Share2 } from "lucide-react"
import { Navbar } from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileCard } from "@/components/ui/profile-card"
import { LoreTimeline } from "@/components/ui/lore-timeline"
import { EntryCard } from "@/components/ui/entry-card"
import { AnimatedButton } from "@/components/ui/animated-button"

// mock data
const user = {
  name: "Alex Morgan",
  username: "wanderlust",
  avatarUrl: "/placeholder.svg?height=200&width=200",
  bio: "Adventure seeker and storyteller. Exploring the world one journey at a time.",
  stats: {
    entries: 24,
    countries: 12,
    badges: 8,
  },
}

const entries = [
  {
    id: "1",
    title: "Hiking the Inca Trail",
    location: "Machu Picchu, Peru",
    date: new Date("2023-06-15"),
    excerpt:
      "The four-day trek through the Andes Mountains was challenging but rewarding, with breathtaking views at every turn.",
    imageUrl: "/placeholder.svg?height=400&width=600",
  },
  {
    id: "2",
    title: "Exploring Ancient Temples",
    location: "Kyoto, Japan",
    date: new Date("2023-04-22"),
    excerpt: "Wandering through the serene gardens and historic temples of Kyoto felt like stepping back in time.",
    imageUrl: "/placeholder.svg?height=400&width=600",
  },
  {
    id: "3",
    title: "Safari Adventure",
    location: "Serengeti, Tanzania",
    date: new Date("2023-02-10"),
    excerpt: "Witnessing the great migration across the Serengeti plains was a once-in-a-lifetime experience.",
    imageUrl: "/placeholder.svg?height=400&width=600",
  },
]

const timelineEntries = [
  {
    id: "1",
    title: "Hiking the Inca Trail",
    date: new Date("2023-06-15"),
    location: "Machu Picchu, Peru",
    type: "journal",
  },
  {
    id: "2",
    title: "Temple Visit",
    date: new Date("2023-04-22"),
    location: "Kyoto, Japan",
    type: "photo",
  },
  {
    id: "3",
    title: "Safari Photos",
    date: new Date("2023-02-10"),
    location: "Serengeti, Tanzania",
    type: "photo",
  },
  {
    id: "4",
    title: "Northern Lights",
    date: new Date("2022-12-05"),
    location: "Tromsø, Norway",
    type: "journal",
  },
  {
    id: "5",
    title: "Greek Islands Map",
    date: new Date("2022-09-18"),
    location: "Santorini, Greece",
    type: "map",
  },
  {
    id: "6",
    title: "Desert Compass",
    date: new Date("2022-07-30"),
    location: "Sahara Desert, Morocco",
    type: "artifact",
  },
]

export default function ProfilePage() {
  return (
    <div className="min-h-screen flex flex-col parchment-texture">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
            <div className="space-y-6">
              <ProfileCard
                name={user.name}
                username={user.username}
                avatarUrl={user.avatarUrl}
                bio={user.bio}
                stats={user.stats}
              />

              <div className="flex flex-col gap-3">
                <Button variant="outline" className="w-full border-gold/30 justify-start bg-transparent">
                  <Settings className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
                <AnimatedButton className="w-full justify-start" animationType="glow">
                  <Download className="mr-2 h-4 w-4" />
                  Export My Lore
                </AnimatedButton>
                <Button variant="outline" className="w-full border-gold/30 justify-start bg-transparent">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Profile
                </Button>
              </div>
            </div>

            <div className="space-y-8">
              <Tabs defaultValue="entries" className="w-full">
                <TabsList className="bg-parchment-dark border border-gold/20">
                  <TabsTrigger value="entries">Recent Entries</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="stats">Travel Stats</TabsTrigger>
                </TabsList>

                <TabsContent value="entries" className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {entries.map((entry, index) => (
                      <EntryCard
                        key={entry.id}
                        id={entry.id}
                        title={entry.title}
                        location={entry.location}
                        date={entry.date}
                        excerpt={entry.excerpt}
                        imageUrl={entry.imageUrl}
                        index={index}
                      />
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="timeline" className="mt-6">
                  <div className="bg-parchment-light rounded-2xl border border-gold/20 p-6">
                    <h3 className="font-display text-xl font-medium text-deepbrown mb-6">Your Travel Timeline</h3>
                    <LoreTimeline entries={timelineEntries} />
                  </div>
                </TabsContent>

                <TabsContent value="stats" className="mt-6">
                  <div className="bg-parchment-light rounded-2xl border border-gold/20 p-6">
                    <h3 className="font-display text-xl font-medium text-deepbrown mb-6">Travel Statistics</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="bg-parchment p-4 rounded-xl border border-gold/10 text-center">
                        <p className="text-4xl font-display font-bold text-gold">{user.stats.entries}</p>
                        <p className="text-deepbrown/70">Total Entries</p>
                      </div>
                      <div className="bg-parchment p-4 rounded-xl border border-gold/10 text-center">
                        <p className="text-4xl font-display font-bold text-gold">{user.stats.countries}</p>
                        <p className="text-deepbrown/70">Countries</p>
                      </div>
                      <div className="bg-parchment p-4 rounded-xl border border-gold/10 text-center">
                        <p className="text-4xl font-display font-bold text-gold">4</p>
                        <p className="text-deepbrown/70">Continents</p>
                      </div>
                    </div>

                    <h4 className="font-display text-lg font-medium text-deepbrown mb-4">Most Visited Regions</h4>
                    <div className="space-y-3 mb-8">
                      <div className="flex items-center">
                        <div className="w-full bg-parchment-dark rounded-full h-4">
                          <div className="bg-gold h-4 rounded-full" style={{ width: "75%" }}></div>
                        </div>
                        <span className="ml-3 text-sm font-medium text-deepbrown">Europe (9)</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-full bg-parchment-dark rounded-full h-4">
                          <div className="bg-gold h-4 rounded-full" style={{ width: "60%" }}></div>
                        </div>
                        <span className="ml-3 text-sm font-medium text-deepbrown">Asia (7)</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-full bg-parchment-dark rounded-full h-4">
                          <div className="bg-gold h-4 rounded-full" style={{ width: "40%" }}></div>
                        </div>
                        <span className="ml-3 text-sm font-medium text-deepbrown">South America (5)</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-full bg-parchment-dark rounded-full h-4">
                          <div className="bg-gold h-4 rounded-full" style={{ width: "25%" }}></div>
                        </div>
                        <span className="ml-3 text-sm font-medium text-deepbrown">Africa (3)</span>
                      </div>
                    </div>

                    <h4 className="font-display text-lg font-medium text-deepbrown mb-4">Travel Badges</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {["Mountain Explorer", "Island Hopper", "Cultural Enthusiast", "Wildlife Spotter"].map(
                        (badge, index) => (
                          <motion.div
                            key={badge}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-parchment p-3 rounded-xl border border-gold/10 text-center"
                          >
                            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gold/10 flex items-center justify-center">
                              <span className="text-2xl" role="img" aria-label={badge}>
                                {index === 0 ? "🏔️" : index === 1 ? "🏝️" : index === 2 ? "🏛️" : "🦁"}
                              </span>
                            </div>
                            <p className="text-xs font-medium text-deepbrown">{badge}</p>
                          </motion.div>
                        ),
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
