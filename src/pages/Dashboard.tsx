"use client"
import { motion } from "framer-motion"
import { format } from "date-fns"
import { Search, Plus, MapPin, Calendar, Filter, Heart, BookOpen, Camera, Map, Archive, Loader2 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { Navbar } from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EntryCard } from "@/components/ui/entry-card"
import { AnimatedButton } from "@/components/ui/animated-button"
import { type Entry } from "@/lib/types"
import { entryService } from "@/services/entryService"
import { useAuth } from "@/context/AuthContext"
import { toast } from "sonner"

interface UserStats {
  totalEntries: number
  countriesVisited: number
  continents: number
  latestEntryDate: string | null
  totalPhotos: number
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  
  const [entries, setEntries] = useState<Entry[]>([])
  const [favoriteEntries, setFavoriteEntries] = useState<Entry[]>([])
  const [draftEntries, setDraftEntries] = useState<Entry[]>([])
  const [stats, setStats] = useState<UserStats>({
    totalEntries: 0,
    countriesVisited: 0,
    continents: 0,
    latestEntryDate: null,
    totalPhotos: 0
  })
  
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")

  const loadEntries = async () => {
    if (!user) return
    
    try {
      setIsLoading(true)
      
      const [allEntries, favorites, drafts, userStats] = await Promise.all([
        entryService.getUserEntries(user.uid, false),
        entryService.getFavoriteEntries(user.uid),
        entryService.getDraftEntries(user.uid),
        entryService.getUserStats(user.uid)
      ])
      
      setEntries(allEntries)
      setFavoriteEntries(favorites)
      setDraftEntries(drafts)
      setStats(userStats)
    } catch (error) {
      console.error('Error loading entries:', error)
      toast.error("Failed to load entries")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!user || !searchTerm.trim()) {
      loadEntries()
      return
    }

    try {
      setIsLoading(true)
      const searchResults = await entryService.searchEntries(user.uid, searchTerm)
      setEntries(searchResults)
    } catch (error) {
      console.error('Error searching entries:', error)
      toast.error("Search failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFavoriteToggle = async (entryId: string) => {
    try {
      await entryService.toggleFavorite(entryId)
      loadEntries()
      toast.success("Entry updated!")
    } catch (error) {
      console.error('Error toggling favorite:', error)
      toast.error("Failed to update entry")
    }
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

  const getRecentEntries = () => {
    return entries.slice(0, 6)
  }

  const getRecentLocations = () => {
    const uniqueLocations = entries.reduce((acc, entry) => {
      const key = `${entry.location}, ${entry.country}`
      if (!acc.find(item => `${item.location}, ${item.country}` === key)) {
        acc.push(entry)
      }
      return acc
    }, [] as Entry[])
    
    return uniqueLocations.slice(0, 4)
  }

  useEffect(() => {
    if (user && !authLoading) {
      loadEntries()
    }
  }, [user, authLoading])

  useEffect(() => {
    if (searchTerm === "") {
      loadEntries()
    }
  }, [searchTerm])

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex flex-col parchment-texture">
        <Navbar />
        <main className="flex-1 pt-24 pb-16 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-gold mx-auto mb-4" />
            <p className="text-deepbrown/70">Loading your adventures...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col parchment-texture">
        <Navbar />
        <main className="flex-1 pt-24 pb-16 flex items-center justify-center">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold text-deepbrown mb-4">
              Welcome to Your Travel Journal
            </h2>
            <p className="text-deepbrown/70 mb-6">
              Please sign in to access your adventures and create new entries.
            </p>
            <Button onClick={() => navigate('/login')} className="bg-gold hover:bg-gold/90">
              Sign In
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col parchment-texture">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="font-display text-3xl font-bold text-deepbrown">Your Adventures</h1>
              <p className="text-deepbrown/70">
                {stats.totalEntries > 0 
                  ? `${stats.totalEntries} entries across ${stats.countriesVisited} countries`
                  : "Start documenting your travel memories"
                }
              </p>
            </div>
            <AnimatedButton 
              animationType="glow" 
              className="shrink-0"
              onClick={() => navigate('/new-entry')}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Entry
            </AnimatedButton>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-8">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-deepbrown/50" />
                  <Input 
                    placeholder="Search entries..." 
                    className="pl-9 bg-parchment-light border-gold/30"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="border-gold/30 bg-transparent"
                    onClick={handleSearch}
                  >
                    <Search className="h-4 w-4" />
                    <span className="sr-only">Search</span>
                  </Button>
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

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-parchment-dark border border-gold/20">
                  <TabsTrigger value="all">
                    All Entries ({entries.length})
                  </TabsTrigger>
                  <TabsTrigger value="recent">
                    Recent
                  </TabsTrigger>
                  <TabsTrigger value="favorites">
                    Favorites ({favoriteEntries.length})
                  </TabsTrigger>
                  <TabsTrigger value="drafts">
                    Drafts ({draftEntries.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-6">
                  {entries.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {entries.map((entry, index) => (
                        <EntryCard
                          key={entry.id}
                          id={entry.id}
                          title={entry.title}
                          location={`${entry.location}, ${entry.country}`}
                          date={new Date(entry.date)}
                          excerpt={entry.content.substring(0, 150) + '...'}
                          imageUrl={entry.mediaUrls[0] || "/placeholder.svg?height=400&width=600"}
                          index={index}
                          type={entry.type}
                          isFavorite={entry.isFavorite}
                          onFavoriteToggle={() => handleFavoriteToggle(entry.id)}
                          entryIcon={getEntryIcon(entry.type)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <BookOpen className="h-16 w-16 text-gold/50 mx-auto mb-4" />
                      <h3 className="font-display text-xl font-medium text-deepbrown mb-2">
                        No entries yet
                      </h3>
                      <p className="text-deepbrown/70 mb-6">
                        Start your journey by creating your first travel entry
                      </p>
                      <AnimatedButton 
                        animationType="glow"
                        onClick={() => navigate('/new-entry')}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create First Entry
                      </AnimatedButton>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="recent" className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {getRecentEntries().map((entry, index) => (
                      <EntryCard
                        key={entry.id}
                        id={entry.id}
                        title={entry.title}
                        location={`${entry.location}, ${entry.country}`}
                        date={new Date(entry.date)}
                        excerpt={entry.content.substring(0, 150) + '...'}
                        imageUrl={entry.mediaUrls[0] || "/placeholder.svg?height=400&width=600"}
                        index={index}
                        type={entry.type}
                        isFavorite={entry.isFavorite}
                        onFavoriteToggle={() => handleFavoriteToggle(entry.id)}
                        entryIcon={getEntryIcon(entry.type)}
                      />
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="favorites" className="mt-6">
                  {favoriteEntries.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {favoriteEntries.map((entry, index) => (
                        <EntryCard
                          key={entry.id}
                          id={entry.id}
                          title={entry.title}
                          location={`${entry.location}, ${entry.country}`}
                          date={new Date(entry.date)}
                          excerpt={entry.content.substring(0, 150) + '...'}
                          imageUrl={entry.mediaUrls[0] || "/placeholder.svg?height=400&width=600"}
                          index={index}
                          type={entry.type}
                          isFavorite={true}
                          onFavoriteToggle={() => handleFavoriteToggle(entry.id)}
                          entryIcon={getEntryIcon(entry.type)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Heart className="h-16 w-16 text-gold/50 mx-auto mb-4" />
                      <h3 className="font-display text-xl font-medium text-deepbrown mb-2">
                        No favorites yet
                      </h3>
                      <p className="text-deepbrown/70">
                        Mark your special memories as favorites to find them easily
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="drafts" className="mt-6">
                  {draftEntries.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {draftEntries.map((entry, index) => (
                        <EntryCard
                          key={entry.id}
                          id={entry.id}
                          title={entry.title || "Untitled Draft"}
                          location={entry.location ? `${entry.location}, ${entry.country}` : "Location not set"}
                          date={new Date(entry.createdAt)}
                          excerpt={entry.content ? entry.content.substring(0, 150) + '...' : "No content yet"}
                          imageUrl={entry.mediaUrls[0] || "/placeholder.svg?height=400&width=600"}
                          index={index}
                          type={entry.type}
                          isFavorite={entry.isFavorite}
                          onFavoriteToggle={() => handleFavoriteToggle(entry.id)}
                          entryIcon={getEntryIcon(entry.type)}
                          isDraft={true}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Archive className="h-16 w-16 text-gold/50 mx-auto mb-4" />
                      <h3 className="font-display text-xl font-medium text-deepbrown mb-2">
                        No drafts found
                      </h3>
                      <p className="text-deepbrown/70">
                        Your saved drafts will appear here
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-6">
              <div className="bg-parchment-light rounded-2xl border border-gold/20 p-5">
                <h3 className="font-display text-lg font-medium text-deepbrown mb-4">Trip Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-deepbrown/70">Total Entries</span>
                    <span className="font-display font-medium">{stats.totalEntries}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-deepbrown/70">Countries Visited</span>
                    <span className="font-display font-medium">{stats.countriesVisited}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-deepbrown/70">Continents</span>
                    <span className="font-display font-medium">{stats.continents}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-deepbrown/70">Total Photos</span>
                    <span className="font-display font-medium">{stats.totalPhotos}</span>
                  </div>
                  {stats.latestEntryDate && (
                    <div className="flex justify-between items-center">
                      <span className="text-deepbrown/70">Latest Entry</span>
                      <span className="font-display font-medium">
                        {format(new Date(stats.latestEntryDate), "MMM d, yyyy")}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {getRecentLocations().length > 0 && (
                <div className="bg-parchment-light rounded-2xl border border-gold/20 p-5">
                  <h3 className="font-display text-lg font-medium text-deepbrown mb-4">Recent Locations</h3>
                  <div className="space-y-3">
                    {getRecentLocations().map((entry) => (
                      <motion.div
                        key={entry.id}
                        className="flex items-center gap-3 p-2 hover:bg-parchment rounded-lg transition-colors cursor-pointer"
                        whileHover={{ x: 3 }}
                        onClick={() => navigate(`/entry/${entry.id}`)}
                      >
                        <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                          <MapPin className="h-4 w-4 text-gold" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-deepbrown truncate">
                            {entry.location}
                          </p>
                          <p className="text-xs text-deepbrown/70">
                            {entry.country} • {format(new Date(entry.date), "MMM d, yyyy")}
                          </p>
                        </div>
                        <div className="text-gold/70">
                          {getEntryIcon(entry.type)}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {entries.length > 0 && (
                <div className="bg-parchment-light rounded-2xl border border-gold/20 p-5">
                  <h3 className="font-display text-lg font-medium text-deepbrown mb-4">Entry Types</h3>
                  <div className="space-y-3">
                    {Object.entries(
                      entries.reduce((acc, entry) => {
                        acc[entry.type] = (acc[entry.type] || 0) + 1
                        return acc
                      }, {} as Record<string, number>)
                    ).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          {getEntryIcon(type)}
                          <span className="text-deepbrown/70 capitalize">{type}</span>
                        </div>
                        <span className="font-display font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-parchment-light rounded-2xl border border-gold/20 p-5">
                <h3 className="font-display text-lg font-medium text-deepbrown mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start border-gold/30 bg-transparent"
                    onClick={() => navigate('/new-entry')}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New Entry
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start border-gold/30 bg-transparent"
                    onClick={() => navigate('/map')}
                  >
                    <Map className="mr-2 h-4 w-4" />
                    View Map
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start border-gold/30 bg-transparent"
                    onClick={() => setActiveTab('favorites')}
                  >
                    <Heart className="mr-2 h-4 w-4" />
                    Favorites
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
