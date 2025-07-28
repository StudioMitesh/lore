"use client"

import { useEffect, useState } from "react"
import { doc, getDoc, updateDoc, collection, query, where, onSnapshot, setDoc } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { motion } from "framer-motion"
import { Settings, Download, Share2, Save, Upload, Loader2, MapPin, BookOpen, Camera, Map, Archive } from "lucide-react"

import { db, storage } from "@/api/firebase"
import { useAuth } from "@/context/useAuth"
import { type UserProfile, type Entry, type TimelineEvent } from "@/lib/types"

import { Navbar } from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileCard } from "@/components/ui/profile-card"
import { LoreTimeline } from "@/components/ui/lore-timeline"
import { EntryCard } from "@/components/ui/entry-card"
import { AnimatedButton } from "@/components/ui/animated-button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { StatCard } from "@/components/StatCard"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export default function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
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

    let unsubscribeEntries: (() => void) | undefined

    const loadProfileData = async () => {
      try {
        setIsLoading(true)
        
        const profileRef = doc(db, "profiles", user.uid)
        const profileSnap = await getDoc(profileRef)

        if (profileSnap.exists()) {
          console.log('Profile exists, loading data')
          const profileData = profileSnap.data() as UserProfile
          setProfile(profileData)
          setFormData(profileData)
        } else {
          console.log('Creating new profile')
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
              totalPhotos: 0
            },
            badges: [],
            createdAt: new Date().toISOString(),
            favorites: []
          }

          await setDoc(profileRef, defaultProfile)
          setProfile(defaultProfile)
          setFormData(defaultProfile)
        }

        const entriesQuery = query(
          collection(db, "entries"),
          where("uid", "==", user.uid),
          where("isDraft", "!=", true)
        )

        unsubscribeEntries = onSnapshot(entriesQuery, (snapshot) => {
          console.log('Entries snapshot received:', snapshot.size, 'documents')
          const entriesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Entry[]
          
          setEntries(entriesData.slice(0, 6))
          
          const events: TimelineEvent[] = entriesData.map(entry => ({
            id: entry.id,
            uid: entry.uid,
            title: entry.title,
            date: entry.date,
            location: entry.location,
            country: entry.country,
            type: entry.type,
            createdAt: entry.createdAt
          }))
          
          setTimelineEvents(events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
          
          updateProfileStats(entriesData)
        }, (error) => {
          console.error('Error in entries snapshot:', error)
          toast.error('Failed to load entries')
        })

        return unsubscribeEntries

      } catch (error) {
        console.error('Error loading profile data:', error)
        toast.error("Failed to load profile data")
      } finally {
        setIsLoading(false)
      }
    }

    loadProfileData()

    return () => {
      if (unsubscribeEntries) {
        console.log('Cleaning up entries subscription')
        unsubscribeEntries()
      }
    }
  }, [user])

  const updateProfileStats = async (entriesData: Entry[]) => {
    if (!user) return

    const countries = new Set(entriesData.map(entry => entry.country))
    const continents = new Set(entriesData.map(entry => {
      // continent mapping rough solution (probably find a better way for this TODO)
      const country = entry.country.toLowerCase()
      if (['usa', 'canada', 'mexico'].some(c => country.includes(c))) return 'North America'
      if (['brazil', 'argentina', 'chile'].some(c => country.includes(c))) return 'South America'
      if (['uk', 'france', 'germany', 'spain', 'italy'].some(c => country.includes(c))) return 'Europe'
      if (['china', 'japan', 'korea', 'thailand', 'india'].some(c => country.includes(c))) return 'Asia'
      if (['egypt', 'kenya', 'south africa'].some(c => country.includes(c))) return 'Africa'
      if (['australia', 'new zealand'].some(c => country.includes(c))) return 'Oceania'
      return 'Other'
    }))

    const totalPhotos = entriesData.reduce((sum, entry) => sum + (entry.mediaUrls?.length || 0), 0)

    const updatedStats = {
      entries: entriesData.length,
      countries: countries.size,
      continents: continents.size,
      badges: profile?.badges?.length || 0,
      totalPhotos
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

  const handleFavoriteToggle = async (entryId: string) => {
    if (!user || !profile) return

    try {
      const favorites = profile.favorites || []
      const updatedFavorites = favorites.includes(entryId)
        ? favorites.filter(id => id !== entryId)
        : [...favorites, entryId]

      const profileRef = doc(db, "profiles", user.uid)
      await updateDoc(profileRef, { favorites: updatedFavorites })

      const entryRef = doc(db, "entries", entryId)
      await updateDoc(entryRef, { isFavorite: !favorites.includes(entryId) })

      setProfile(prev => prev ? { ...prev, favorites: updatedFavorites } : null)
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

  const exportProfile = async () => {
    if (!profile || !entries) return

    try {
      const exportData = {
        profile,
        entries,
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
      <main className="flex-1 pt-24 pb-16">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
            <div className="space-y-6">
              <ProfileCard
                name={`${profile.first_name} ${profile.last_name}`}
                username={profile.username}
                avatarUrl={profile.avatarUrl || "/placeholder.svg"}
                bio={profile.bio}
                stats={profile.stats}
              />

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
                        Update the details of your profile below. Changes will be saved once you click save.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
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

                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-deepbrown">Interests & Preferences (comma-separated)</h4>
                        <div className="space-y-2">
                          <Input
                            placeholder="Interests (e.g., hiking, photography, culture)"
                            value={(formData.interests || []).join(", ")}
                            onChange={(e) => handleArrayChange("interests", e.target.value)}
                            className="bg-parchment border-gold/30"
                          />
                          <Input
                            placeholder="Languages Spoken (e.g., English, Spanish, French)"
                            value={(formData.languagesSpoken || []).join(", ")}
                            onChange={(e) => handleArrayChange("languagesSpoken", e.target.value)}
                            className="bg-parchment border-gold/30"
                          />
                          <Input
                            placeholder="Favorite Places (e.g., Paris, Tokyo, New York)"
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
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="mr-2"
                          >
                            <Save className="h-4 w-4" />
                          </motion.div>
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Save Changes
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
            </div>

            <div className="space-y-8">
              <Tabs defaultValue="entries" className="w-full">
                <TabsList className="bg-parchment-dark border border-gold/20">
                  <TabsTrigger value="entries">Recent Entries</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="stats">Travel Stats</TabsTrigger>
                </TabsList>

                <TabsContent value="entries" className="mt-6">
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
                          imageUrl={entry.mediaUrls[0] || "/placeholder.svg"}
                          index={index}
                          type={entry.type}
                          isFavorite={profile.favorites?.includes(entry.id) || false}
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
                      <p className="text-deepbrown/70">
                        Start documenting your adventures to see them here
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="timeline" className="mt-6">
                  <div className="bg-parchment-light rounded-2xl border border-gold/20 p-6">
                    <h3 className="font-display text-xl font-medium text-deepbrown mb-6">Your Travel Timeline</h3>
                    <LoreTimeline entries={timelineEvents} />
                  </div>
                </TabsContent>

                <TabsContent value="stats" className="mt-6">
                  <div className="bg-parchment-light rounded-2xl border border-gold/20 p-6">
                    <h3 className="font-display text-xl font-medium text-deepbrown mb-6">Travel Statistics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <StatCard label="Total Entries" value={profile.stats.entries} />
                      <StatCard label="Countries" value={profile.stats.countries} />
                      <StatCard label="Continents" value={profile.stats.continents} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      <StatCard label="Total Photos" value={profile.stats.totalPhotos || 0} />
                      <StatCard label="Travel Badges" value={profile.badges?.length || 0} />
                    </div>

                    {profile.badges && profile.badges.length > 0 && (
                      <>
                        <h4 className="font-display text-lg font-medium text-deepbrown mb-4">Travel Badges</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {profile.badges.slice(0, 8).map((badge, i) => (
                            <motion.div
                              key={badge.id}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.1 }}
                              className="bg-parchment p-3 rounded-xl border border-gold/10 text-center"
                            >
                              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gold/10 flex items-center justify-center">
                                <span className="text-2xl" role="img" aria-label={badge.name}>
                                  {badge.icon}
                                </span>
                              </div>
                              <p className="text-xs font-medium text-deepbrown">{badge.name}</p>
                              <p className="text-xs text-deepbrown/70">{badge.description}</p>
                            </motion.div>
                          ))}
                        </div>
                      </>
                    )}

                    <div className="mt-8 space-y-6">
                      {profile.interests && profile.interests.length > 0 && (
                        <div>
                          <h4 className="font-display text-lg font-medium text-deepbrown mb-3">Interests</h4>
                          <div className="flex flex-wrap gap-2">
                            {profile.interests.map((interest, index) => (
                              <span 
                                key={index} 
                                className="px-3 py-1 bg-gold/10 text-deepbrown rounded-full text-sm border border-gold/20"
                              >
                                {interest}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {profile.languagesSpoken && profile.languagesSpoken.length > 0 && (
                        <div>
                          <h4 className="font-display text-lg font-medium text-deepbrown mb-3">Languages Spoken</h4>
                          <div className="flex flex-wrap gap-2">
                            {profile.languagesSpoken.map((language, index) => (
                              <span 
                                key={index} 
                                className="px-3 py-1 bg-forest/10 text-deepbrown rounded-full text-sm border border-forest/20"
                              >
                                {language}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {profile.favoritePlaces && profile.favoritePlaces.length > 0 && (
                        <div>
                          <h4 className="font-display text-lg font-medium text-deepbrown mb-3">Favorite Places</h4>
                          <div className="space-y-2">
                            {profile.favoritePlaces.map((place, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-gold" />
                                <span className="text-deepbrown">{place}</span>
                              </div>
                            ))}
                          </div>
                        </div>
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