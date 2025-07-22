"use client"
import { motion } from "framer-motion"
import { format } from "date-fns"
import { Search, Plus, MapPin, Calendar, Filter } from "lucide-react"
import { Navbar } from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EntryCard } from "@/components/ui/entry-card"
import { AnimatedButton } from "@/components/ui/animated-button"

// mock data
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
  {
    id: "4",
    title: "Northern Lights",
    location: "Tromsø, Norway",
    date: new Date("2022-12-05"),
    excerpt: "The dancing aurora borealis painted the night sky with vibrant greens and purples.",
    imageUrl: "/placeholder.svg?height=400&width=600",
  },
  {
    id: "5",
    title: "Island Hopping",
    location: "Santorini, Greece",
    date: new Date("2022-09-18"),
    excerpt: "The white-washed buildings against the deep blue Aegean Sea created a postcard-perfect scene.",
    imageUrl: "/placeholder.svg?height=400&width=600",
  },
  {
    id: "6",
    title: "Desert Expedition",
    location: "Sahara Desert, Morocco",
    date: new Date("2022-07-30"),
    excerpt: "Camping under the stars in the vast Sahara Desert was a humbling and magical experience.",
    imageUrl: "/placeholder.svg?height=400&width=600",
  },
]

export default function Dashboard() {
  return (
    <div className="min-h-screen flex flex-col parchment-texture">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="font-display text-3xl font-bold text-deepbrown">Your Adventures</h1>
              <p className="text-deepbrown/70">Explore and manage your travel memories</p>
            </div>

            <AnimatedButton animationType="glow" className="shrink-0">
              <Plus className="mr-2 h-4 w-4" />
              Create New Entry
            </AnimatedButton>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-8">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-deepbrown/50" />
                  <Input placeholder="Search entries..." className="pl-9 bg-parchment-light border-gold/30" />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="border-gold/30 bg-transparent">
                    <Calendar className="h-4 w-4" />
                    <span className="sr-only">Filter by date</span>
                  </Button>
                  <Button variant="outline" size="icon" className="border-gold/30 bg-transparent">
                    <MapPin className="h-4 w-4" />
                    <span className="sr-only">Filter by location</span>
                  </Button>
                  <Button variant="outline" size="icon" className="border-gold/30 bg-transparent">
                    <Filter className="h-4 w-4" />
                    <span className="sr-only">More filters</span>
                  </Button>
                </div>
              </div>

              <Tabs defaultValue="all" className="w-full">
                <TabsList className="bg-parchment-dark border border-gold/20">
                  <TabsTrigger value="all">All Entries</TabsTrigger>
                  <TabsTrigger value="recent">Recent</TabsTrigger>
                  <TabsTrigger value="favorites">Favorites</TabsTrigger>
                  <TabsTrigger value="drafts">Drafts</TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="mt-6">
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
                <TabsContent value="recent">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {entries.slice(0, 4).map((entry, index) => (
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
                <TabsContent value="favorites">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {entries.slice(1, 3).map((entry, index) => (
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
                <TabsContent value="drafts">
                  <div className="p-8 text-center">
                    <p className="text-deepbrown/70">No drafts found</p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-6">
              <div className="bg-parchment-light rounded-2xl border border-gold/20 p-5">
                <h3 className="font-display text-lg font-medium text-deepbrown mb-4">Trip Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-deepbrown/70">Total Entries</span>
                    <span className="font-display font-medium">{entries.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-deepbrown/70">Countries Visited</span>
                    <span className="font-display font-medium">5</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-deepbrown/70">Continents</span>
                    <span className="font-display font-medium">4</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-deepbrown/70">Latest Entry</span>
                    <span className="font-display font-medium">{format(entries[0].date, "MMM d, yyyy")}</span>
                  </div>
                </div>
              </div>

              <div className="bg-parchment-light rounded-2xl border border-gold/20 p-5">
                <h3 className="font-display text-lg font-medium text-deepbrown mb-4">Recent Locations</h3>
                <div className="space-y-3">
                  {entries.slice(0, 4).map((entry) => (
                    <motion.div
                      key={entry.id}
                      className="flex items-center gap-3 p-2 hover:bg-parchment rounded-lg transition-colors cursor-pointer"
                      whileHover={{ x: 3 }}
                    >
                      <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-gold" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-deepbrown">{entry.location}</p>
                        <p className="text-xs text-deepbrown/70">{format(entry.date, "MMM d, yyyy")}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
