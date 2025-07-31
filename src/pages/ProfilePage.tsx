"use client"

import { useEffect, useState } from "react"
import { doc, getDoc, updateDoc, collection, query, where, setDoc, getDocs } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { motion } from "framer-motion"
import { Settings, Download, Share2, Save, Upload, Loader2, MapPin, BookOpen, Camera, Map, Archive, Globe, Calendar, Heart, Users } from "lucide-react"

import { db, storage } from "@/api/firebase"
import { useAuth } from "@/context/useAuth"
import { type UserProfile, type Trip, type Entry, type TimelineEvent } from "@/lib/types"

import { Navbar } from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileCard } from "@/components/ui/profile-card"
import { LoreTimeline } from "@/components/ui/lore-timeline"
import { AnimatedButton } from "@/components/ui/animated-button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { StatCard } from "@/components/StatCard"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { format } from "date-fns"

export default function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [trips, setTrips] = useState<Trip[]>([])
  const [recentEntries, setRecentEntries] = useState<Entry[]>([])
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState<Partial<UserProfile>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null)
  const [selectedCover, setSelectedCover] = useState<File | null>(null)

  useEffect(() => {
    if (!user) {
      setIsLoading(false)
      return
    }

    const loadProfileData = async () => {
      try {
        setIsLoading(true)
        
        const profileRef = doc(db, "profiles", user.uid)
        const profileSnap = await getDoc(profileRef)

        if (profileSnap.exists()) {
          const profileData = profileSnap.data() as UserProfile
          setProfile(profileData)
          setFormData(profileData)
        } else {
          // Create default profile
          const defaultProfile: UserProfile = {
            uid: user.uid,
            first_name: user.displayName?.split(' ')[0] || '',
            last_name: user.displayName?.split(' ').slice(1).join(' ') || '',
            username: user.displayName || user.email?.split('@')[0] || '',
            email: user.email || '',
            bio: '',
            avatarUrl: user.photoURL || '',
            stats: {
              entries: 0,
              countries: 0,
              continents: 0,
              badges: 0,
              totalPhotos: 0,
              totalTrips: 0,
              activeDays: 0
            },
            badges: [],
            createdAt: new Date().toISOString(),
            favorites: []
          }

          await setDoc(profileRef, defaultProfile)
          setProfile(defaultProfile)
          setFormData(defaultProfile)
        }

        // Load trips for timeline and stats
        const tripsQuery = query(
          collection(db, "trips"),
          where("uid", "==", user.uid)
        )

        const tripsSnapshot = await getDocs(tripsQuery)
        const tripsData = tripsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Trip[]
        
        setTrips(tripsData)

        // Load recent entries for timeline (limit to recent ones)
        const entriesQuery = query(
          collection(db, "entries"),
          where("uid", "==", user.uid),
          where("isDraft", "!=", true)
        )

        const entriesSnapshot = await getDocs(entriesQuery)
        const entriesData = entriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Entry[]

        // Sort by timestamp and take recent ones
        const sortedEntries = entriesData
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 6)
        
        setRecentEntries(sortedEntries)
        
        // Create timeline events from trips and entries
        const events: TimelineEvent[] = [
  // Trip events
  ...tripsData
    .filter(trip => trip.startDate) // Only include trips with startDate
    .map(trip => ({
      id: `trip-${trip.id}`,
      uid: trip.uid,
      title: `Started trip: ${trip.name}`,
      timestamp: trip.startDate,
      location: trip.countriesVisited?.[0] || 'Unknown',
      country: trip.countriesVisited?.[0] || 'Unknown',
      type: "event" as const,
      createdAt: trip.createdAt,
      tripId: trip.id
    })),
  // Entry events (limited)
  ...sortedEntries
    .filter(entry => entry.timestamp) // Only include entries with timestamp
    .slice(0, 10)
    .map(entry => ({
      id: entry.id,
      uid: entry.uid,
      title: entry.title,
      timestamp: entry.timestamp,
      location: entry.location || 'Unknown',
      country: entry.country || 'Unknown',
      type: entry.type,
      createdAt: entry.createdAt,
      tripId: entry.tripId,
      dayLogId: entry.dayLogId
    }))
]
        
        setTimelineEvents(events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()))
        
        // Update profile stats
        await updateProfileStats(tripsData, entriesData)

      } catch (error) {
        console.error('Error loading profile data:', error)
        toast.error("Failed to load profile data")
      } finally {
        setIsLoading(false)
      }
    }

    loadProfileData()
  }, [user])

  const updateProfileStats = async (tripsData: Trip[], entriesData: Entry[]) => {
    if (!user) return

    // Calculate stats from trips and entries
    const allCountries = new Set<string>()
    tripsData.forEach(trip => {
      trip.countriesVisited.forEach(country => allCountries.add(country))
    })
    entriesData.forEach(entry => allCountries.add(entry.country))

    const continents = new Set(Array.from(allCountries).map(country => {
      // Simplified continent mapping - you might want to use a proper library
      const countryLower = country.toLowerCase()
      if (['usa', 'united states', 'canada', 'mexico'].some(c => countryLower.includes(c))) return 'North America'
      if (['brazil', 'argentina', 'chile', 'peru', 'colombia'].some(c => countryLower.includes(c))) return 'South America'
      if (['uk', 'france', 'germany', 'spain', 'italy', 'portugal', 'netherlands'].some(c => countryLower.includes(c))) return 'Europe'
      if (['china', 'japan', 'korea', 'thailand', 'india', 'vietnam', 'indonesia'].some(c => countryLower.includes(c))) return 'Asia'
      if (['egypt', 'kenya', 'south africa', 'morocco', 'ethiopia'].some(c => countryLower.includes(c))) return 'Africa'
      if (['australia', 'new zealand', 'fiji'].some(c => countryLower.includes(c))) return 'Oceania'
      return 'Other'
    }))

    const totalPhotos = entriesData.reduce((sum, entry) => sum + (entry.mediaUrls?.length || 0), 0)
    
    const activeDaysSet = new Set(
      entriesData
        .filter(entry => entry.timestamp)
        .map(entry => {
          try {
            const date = typeof entry.timestamp === 'string' 
              ? new Date(entry.timestamp)
              : entry.timestamp;
            return date.toISOString().split('T')[0];
          } catch (error) {
            console.error('Invalid timestamp:', entry.timestamp, error);
            return '';
          }
        })
        .filter(dateStr => dateStr)
    );

    const updatedStats = {
      entries: entriesData.length,
      countries: allCountries.size,
      continents: continents.size,
      badges: profile?.badges?.length || 0,
      totalPhotos,
      totalTrips: tripsData.length,
      activeDays: activeDaysSet.size
    }

    try {
      const profileRef = doc(db, "profiles", user.uid)
      await updateDoc(profileRef, { stats: updatedStats })
      
      setProfile(prev => prev ? { ...prev, stats: updatedStats } : null)
    } catch (error) {
      console.error('Error updating profile stats:', error)
    }
  }

  const uploadImage = async (file: File, path: string): Promise<string> => {
    const imageRef = ref(storage, `${path}/${user!.uid}_${Date.now()}`)
    await uploadBytes(imageRef, file)
    return await getDownloadURL(imageRef)
  }

  const handleChange = (field: keyof UserProfile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleNestedChange = (group: string, key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [group]: {
        ...(prev as any)[group],
        [key]: value
      }
    }))
  }

  const handleArrayChange = (field: keyof UserProfile, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value.split(',').map(item => item.trim()).filter(item => item)
    }))
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Avatar image must be less than 5MB")
        return
      }
      setSelectedAvatar(file)
    }
  }

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Cover image must be less than 10MB")
        return
      }
      setSelectedCover(file)
    }
  }

  const handleSave = async () => {
    if (!user || !profile) return
    
    setIsSaving(true)
    try {
      const updatedFormData = { ...formData }

      if (selectedAvatar) {
        const avatarUrl = await uploadImage(selectedAvatar, 'avatars')
        updatedFormData.avatarUrl = avatarUrl
      }

      if (selectedCover) {
        const coverUrl = await uploadImage(selectedCover, 'covers')
        updatedFormData.coverPhotoUrl = coverUrl
      }

      const profileRef = doc(db, "profiles", user.uid)
      await updateDoc(profileRef, {
        ...updatedFormData,
        updatedAt: new Date().toISOString(),
      })

      setProfile(updatedFormData as UserProfile)
      setEditMode(false)
      setSelectedAvatar(null)
      setSelectedCover(null)
      toast.success("Profile updated successfully!")
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error("Failed to update profile")
    } finally {
      setIsSaving(false)
    }
  }

  const exportProfile = async () => {
    if (!profile || !trips || !recentEntries) return

    try {
      const exportData = {
        profile,
        trips,
        recentEntries,
        timelineEvents,
        exportedAt: new Date().toISOString()
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      })
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `travel-lore-${profile.username}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success("Profile exported successfully!")
    } catch (error) {
      console.error('Error exporting profile:', error)
      toast.error("Failed to export profile")
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col parchment-texture">
        <Navbar />
        <main className="flex-1 pt-24 pb-16 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-gold mx-auto mb-4" />
            <p className="text-deepbrown/70">Loading your profile...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col parchment-texture">
        <Navbar />
        <main className="flex-1 pt-24 pb-16 flex items-center justify-center">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold text-deepbrown mb-4">
              Profile Not Found
            </h2>
            <p className="text-deepbrown/70 mb-6">
              There was an issue loading your profile. Please try again.
            </p>
            <Button onClick={() => window.location.reload()} className="bg-gold hover:bg-gold/90">
              Reload Page
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col parchment-texture">
      <Navbar />
      <main className="flex-1 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">

          {profile.coverPhotoUrl && (
            <div className="relative h-64 rounded-2xl overflow-hidden mb-8">
              <img 
                src={profile.coverPhotoUrl} 
                alt="Cover" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6 md:gap-8">
            {/* Left Sidebar - Profile Info */}
            <div className="space-y-6">
              <ProfileCard
                name={`${profile.first_name} ${profile.last_name}`}
                username={profile.username}
                avatarUrl={profile.avatarUrl || "/placeholder.svg"}
                bio={profile.bio}
                stats={profile.stats}
              />

              {/* High-level Stats */}
              <div className="bg-parchment-light rounded-2xl border border-gold/20 p-5">
                <h3 className="font-display text-lg font-medium text-deepbrown mb-4">Travel Overview</h3>
                <div className="grid grid-cols-2 gap-4">
                  <StatCard label="Total Trips" value={profile.stats.totalTrips || 0} />
                  <StatCard label="Countries" value={profile.stats.countries} />
                  <StatCard label="Continents" value={profile.stats.continents} />
                  <StatCard label="Active Days" value={profile.stats.activeDays || 0} />
                </div>
              </div>

              {/* Profile Actions */}
              <div className="flex flex-col gap-3">
                <Dialog open={editMode} onOpenChange={setEditMode}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Settings className="mr-2 h-4 w-4" /> Edit Profile
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl parchment border border-gold/20 max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="font-display text-deepbrown">Edit Your Profile</DialogTitle>
                      <DialogDescription className="text-foreground">
                        Update your profile information below.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                      {/* Profile Images */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-deepbrown">Profile Images</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="avatar">Avatar Image</Label>
                            <div className="flex items-center gap-3">
                              <img 
                                src={selectedAvatar ? URL.createObjectURL(selectedAvatar) : (profile.avatarUrl || "/placeholder.svg")}
                                alt="Avatar preview"
                                className="w-12 h-12 rounded-full object-cover"
                              />
                              <div>
                                <input
                                  id="avatar"
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={handleAvatarChange}
                                />
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => document.getElementById('avatar')?.click()}
                                >
                                  <Upload className="mr-2 h-4 w-4" />
                                  Upload Avatar
                                </Button>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cover">Cover Photo</Label>
                            <div className="space-y-2">
                              {(selectedCover || profile.coverPhotoUrl) && (
                                <img 
                                  src={selectedCover ? URL.createObjectURL(selectedCover) : profile.coverPhotoUrl}
                                  alt="Cover preview"
                                  className="w-full h-20 rounded-lg object-cover"
                                />
                              )}
                              <div>
                                <input
                                  id="cover"
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={handleCoverChange}
                                />
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => document.getElementById('cover')?.click()}
                                >
                                  <Upload className="mr-2 h-4 w-4" />
                                  Upload Cover
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Basic Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input 
                          value={formData.first_name || ""} 
                          onChange={e => handleChange("first_name", e.target.value)} 
                          placeholder="First Name" 
                          className="bg-parchment border-gold/30"
                        />
                        <Input 
                          value={formData.last_name || ""} 
                          onChange={e => handleChange("last_name", e.target.value)} 
                          placeholder="Last Name" 
                          className="bg-parchment border-gold/30"
                        />
                        <Input 
                          value={formData.username || ""} 
                          onChange={e => handleChange("username", e.target.value)} 
                          placeholder="Username" 
                          className="bg-parchment border-gold/30"
                        />
                        <Input 
                          value={formData.email || ""} 
                          disabled 
                          placeholder="Email" 
                          className="bg-parchment-dark border-gold/30"
                        />
                        <Input 
                          value={formData.location || ""} 
                          onChange={e => handleChange("location", e.target.value)} 
                          placeholder="Location" 
                          className="bg-parchment border-gold/30"
                        />
                        <Input 
                          value={formData.website || ""} 
                          onChange={e => handleChange("website", e.target.value)} 
                          placeholder="Website" 
                          className="bg-parchment border-gold/30"
                        />
                      </div>

                      <Textarea 
                        className="bg-parchment border-gold/30 resize-none" 
                        value={formData.bio || ""} 
                        onChange={e => handleChange("bio", e.target.value)} 
                        placeholder="Tell us about yourself and your travel adventures..."
                        rows={4}
                      />

                      {/* Social Links */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-deepbrown">Social Links</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {["twitter", "instagram", "linkedin", "github"].map((platform) => (
                            <Input
                              key={platform}
                              placeholder={`${platform.charAt(0).toUpperCase() + platform.slice(1)} URL`}
                              value={formData.socialLinks?.[platform as keyof typeof formData.socialLinks] || ""}
                              onChange={(e) => handleNestedChange("socialLinks", platform, e.target.value)}
                              className="bg-parchment border-gold/30"
                            />
                          ))}
                        </div>
                      </div>

                      {/* Interests & Preferences */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-deepbrown">Interests & Preferences</h4>
                        <div className="space-y-2">
                          <Input
                            placeholder="Interests (comma-separated)"
                            value={(formData.interests || []).join(", ")}
                            onChange={(e) => handleArrayChange("interests", e.target.value)}
                            className="bg-parchment border-gold/30"
                          />
                          <Input
                            placeholder="Languages Spoken (comma-separated)"
                            value={(formData.languagesSpoken || []).join(", ")}
                            onChange={(e) => handleArrayChange("languagesSpoken", e.target.value)}
                            className="bg-parchment border-gold/30"
                          />
                          <Input
                            placeholder="Favorite Places (comma-separated)"
                            value={(formData.favoritePlaces || []).join(", ")}
                            onChange={(e) => handleArrayChange("favoritePlaces", e.target.value)}
                            className="bg-parchment border-gold/30"
                          />
                        </div>
                      </div>
                    </div>

                    <DialogFooter className="gap-2 mt-4">
                      <DialogClose asChild>
                        <Button variant="ghost" type="button" disabled={isSaving}>
                          Cancel
                        </Button>
                      </DialogClose>
                      <Button 
                        onClick={handleSave} 
                        className="bg-gold text-deepbrown hover:bg-gold/80"
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <AnimatedButton 
                  className="w-full justify-start" 
                  animationType="glow"
                  onClick={exportProfile}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export My Lore
                </AnimatedButton>
                
                <Button variant="outline" className="w-full justify-start">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Profile
                </Button>
              </div>

              {/* Personal Info Display */}
              {(profile.interests?.length || profile.languagesSpoken?.length || profile.favoritePlaces?.length) && (
                <div className="bg-parchment-light rounded-2xl border border-gold/20 p-5">
                  <h3 className="font-display text-lg font-medium text-deepbrown mb-4">About Me</h3>
                  <div className="space-y-4">
                    {profile.interests && profile.interests.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-deepbrown mb-2">Interests</h4>
                        <div className="flex flex-wrap gap-2">
                          {profile.interests.slice(0, 6).map((interest, index) => (
                            <span 
                              key={index} 
                              className="px-2 py-1 bg-gold/10 text-deepbrown rounded-full text-xs border border-gold/20"
                            >
                              {interest}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {profile.languagesSpoken && profile.languagesSpoken.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-deepbrown mb-2">Languages</h4>
                        <div className="flex flex-wrap gap-2">
                          {profile.languagesSpoken.slice(0, 4).map((language, index) => (
                            <span 
                              key={index} 
                              className="px-2 py-1 bg-forest/10 text-deepbrown rounded-full text-xs border border-forest/20"
                            >
                              {language}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {profile.favoritePlaces && profile.favoritePlaces.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-deepbrown mb-2">Favorite Places</h4>
                        <div className="space-y-1">
                          {profile.favoritePlaces.slice(0, 4).map((place, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <MapPin className="h-3 w-3 text-gold" />
                              <span className="text-xs text-deepbrown">{place}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Content - Tabs */}
            <div className="space-y-8">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="bg-parchment-dark border border-gold/20">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="achievements">Achievements</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                  <div className="space-y-6">
                    {/* Trip Highlights */}
                    {trips.length > 0 && (
                      <div className="bg-parchment-light rounded-2xl border border-gold/20 p-6">
                        <h3 className="font-display text-xl font-medium text-deepbrown mb-4">Recent Adventures</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {trips.slice(0, 4).map((trip, index) => (
                            <motion.div
                              key={trip.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="p-4 bg-parchment rounded-lg border border-gold/10 hover:border-gold/30 transition-colors cursor-pointer"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-medium text-deepbrown">{trip.name}</h4>
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  trip.status === 'completed' ? 'bg-green-100 text-green-700' :
                                  trip.status === 'active' ? 'bg-blue-100 text-blue-700' :
                                  trip.status === 'planned' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {trip.status}
                                </span>
                              </div>
                              <p className="text-sm text-deepbrown/70 mb-2">
                                {trip.description || "No description"}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-deepbrown/60">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {trip.startDate ? format(new Date(trip.startDate), "MMM yyyy") : 'No date'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Globe className="h-3 w-3" />
                                  {trip.countriesVisited.length} countries
                                </span>
                                <span className="flex items-center gap-1">
                                  <BookOpen className="h-3 w-3" />
                                  {trip.totalEntries} entries
                                </span>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recent Entries */}
                    {recentEntries.length > 0 && (
                      <div className="bg-parchment-light rounded-2xl border border-gold/20 p-6">
                        <h3 className="font-display text-xl font-medium text-deepbrown mb-4">Latest Memories</h3>
                        <div className="space-y-4">
                          {recentEntries.map((entry, index) => (
                            <motion.div
                              key={entry.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="flex items-center gap-4 p-3 bg-parchment rounded-lg border border-gold/10 hover:border-gold/30 transition-colors cursor-pointer"
                            >
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gold/10 flex-shrink-0">
                                {entry.mediaUrls[0] ? (
                                  <img 
                                    src={entry.mediaUrls[0]} 
                                    alt={entry.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    {entry.type === "journal" && <BookOpen className="h-5 w-5 text-gold" />}
                                    {entry.type === "photo" && <Camera className="h-5 w-5 text-gold" />}
                                    {entry.type === "map" && <Map className="h-5 w-5 text-gold" />}
                                    {entry.type === "artifact" && <Archive className="h-5 w-5 text-gold" />}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-deepbrown truncate">{entry.title}</h4>
                                <p className="text-sm text-deepbrown/70">{entry.location}, {entry.country}</p>
                                <p className="text-xs text-deepbrown/50">
                                  {entry.timestamp ? format(new Date(entry.timestamp), "MMM d, yyyy") : 'No date'}
                                </p>
                              </div>
                              {entry.isFavorite && (
                                <Heart className="h-4 w-4 text-red-500 fill-current" />
                              )}
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {trips.length === 0 && recentEntries.length === 0 && (
                      <div className="text-center py-12">
                        <BookOpen className="h-16 w-16 text-gold/50 mx-auto mb-4" />
                        <h3 className="font-display text-xl font-medium text-deepbrown mb-2">
                          Your adventure awaits
                        </h3>
                        <p className="text-deepbrown/70">
                          Start documenting your travels to see them here
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="timeline" className="mt-6">
                  <div className="bg-parchment-light rounded-2xl border border-gold/20 p-6">
                    <h3 className="font-display text-xl font-medium text-deepbrown mb-6">Your Travel Timeline</h3>
                    <LoreTimeline entries={timelineEvents} />
                  </div>
                </TabsContent>

                <TabsContent value="achievements" className="mt-6">
                  <div className="bg-parchment-light rounded-2xl border border-gold/20 p-6">
                    <h3 className="font-display text-xl font-medium text-deepbrown mb-6">Travel Achievements</h3>
                    
                    {profile.badges && profile.badges.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                        {profile.badges.map((badge, i) => (
                          <motion.div
                            key={badge.id}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-parchment p-4 rounded-xl border border-gold/10 text-center"
                          >
                            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gold/10 flex items-center justify-center">
                              <span className="text-2xl" role="img" aria-label={badge.name}>
                                {badge.icon}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-deepbrown">{badge.name}</p>
                            <p className="text-xs text-deepbrown/70">{badge.description}</p>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-gold/50 mx-auto mb-4" />
                        <p className="text-deepbrown/70">No badges earned yet. Keep exploring!</p>
                      </div>
                    )}

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-parchment rounded-lg">
                        <div className="text-2xl font-bold text-gold">{profile.stats.totalTrips}</div>
                        <div className="text-sm text-deepbrown/70">Total Trips</div>
                      </div>
                      <div className="text-center p-4 bg-parchment rounded-lg">
                        <div className="text-2xl font-bold text-gold">{profile.stats.countries}</div>
                        <div className="text-sm text-deepbrown/70">Countries</div>
                      </div>
                      <div className="text-center p-4 bg-parchment rounded-lg">
                        <div className="text-2xl font-bold text-gold">{profile.stats.continents}</div>
                        <div className="text-sm text-deepbrown/70">Continents</div>
                      </div>
                      <div className="text-center p-4 bg-parchment rounded-lg">
                        <div className="text-2xl font-bold text-gold">{profile.stats.totalPhotos}</div>
                        <div className="text-sm text-deepbrown/70">Photos</div>
                      </div>
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