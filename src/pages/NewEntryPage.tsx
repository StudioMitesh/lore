"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Save, ImageIcon, MapPin, Calendar, X, Plus, Tag, Globe, BookOpen, Camera, Map, Archive } from "lucide-react"
import { collection, addDoc, doc, updateDoc, getDoc } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { Navbar } from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { AnimatedButton } from "@/components/ui/animated-button"
import { MapViewer } from "@/components/MapViewer"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { db, storage } from "@/api/firebase"
import { useAuth } from '@/context/useAuth'
import { type Entry, type UserProfile } from "@/lib/types"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"

interface FormData {
  title: string
  content: string
  timestamp: string
  location: string
  country: string
  coordinates: { lat: number; lng: number }
  tags: string[]
  type: "journal" | "photo" | "map" | "artifact"
}

export default function NewEntryPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [formData, setFormData] = React.useState<FormData>({
    title: "",
    content: "",
    timestamp: new Date().toISOString(),
    location: "",
    country: "",
    coordinates: { lat: 0, lng: 0 },
    tags: [],
    type: "journal"
  })
  
  const [images, setImages] = React.useState<File[]>([])
  const [imagePreviewUrls, setImagePreviewUrls] = React.useState<string[]>([])
  const [currentTag, setCurrentTag] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [locationSelected, setLocationSelected] = React.useState(false)

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAddImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/')
      const isValidSize = file.size <= 10 * 1024 * 1024 // 10MB limit
      
      if (!isValidType) {
        toast.error(`${file.name} is not a valid image file`)
        return false
      }
      if (!isValidSize) {
        toast.error(`${file.name} is too large (max 10MB)`)
        return false
      }
      return true
    })

    if (validFiles.length === 0) return

    setImages(prev => [...prev, ...validFiles])
    
    const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file))
    setImagePreviewUrls(prev => [...prev, ...newPreviewUrls])
  }

  const handleRemoveImage = (index: number) => {
    URL.revokeObjectURL(imagePreviewUrls[index])
    
    setImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index))
  }

  const handleAddTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      handleInputChange('tags', [...formData.tags, currentTag.trim()])
      setCurrentTag("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    handleInputChange('tags', formData.tags.filter(tag => tag !== tagToRemove))
  }

  const handleLocationSelect = (location: { lat: number; lng: number; address?: string }) => {
    handleInputChange('coordinates', { lat: location.lat, lng: location.lng })
    if (location.address) {
      const addressParts = location.address.split(', ')
      const country = addressParts[addressParts.length - 1] || ""
      const city = addressParts[0] || location.address
      
      handleInputChange('location', city)
      handleInputChange('country', country)
    }
    setLocationSelected(true)
    toast.success("Location set successfully!")
  }

  const uploadImages = async (images: File[]): Promise<string[]> => {
    if (images.length === 0) return []

    const uploadPromises = images.map(async (image, index) => {
      const imageRef = ref(storage, `entries/${user!.uid}/${Date.now()}_${index}_${image.name}`)
      await uploadBytes(imageRef, image)
      return await getDownloadURL(imageRef)
    })

    return await Promise.all(uploadPromises)
  }

  const updateUserStats = async (newEntry: Entry) => {
    if (!user) return

    try {
      const profileRef = doc(db, "profiles", user.uid)
      const profileSnap = await getDoc(profileRef)
      
      if (profileSnap.exists()) {
        const profile = profileSnap.data() as UserProfile
        
        // probably replace this with counters TODO
        const countries = new Set([profile.stats.countries, newEntry.country].filter(Boolean))
        const continents = new Set([profile.stats.continents, getContinent(newEntry.country)].filter(Boolean))
        
        const updatedStats = {
          ...profile.stats,
          entries: profile.stats.entries + 1,
          countries: countries.size,
          continents: continents.size,
          totalPhotos: (profile.stats.totalPhotos || 0) + newEntry.mediaUrls.length
        }

        await updateDoc(profileRef, { 
          stats: updatedStats,
          updatedAt: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('Error updating user stats:', error)
    }
  }

  const getContinent = (country: string): string => {
    // TODO better continent mapping probably or some better solution
    const countryLower = country.toLowerCase()
    if (['usa', 'united states', 'canada', 'mexico'].some(c => countryLower.includes(c))) return 'North America'
    if (['brazil', 'argentina', 'chile', 'peru', 'colombia'].some(c => countryLower.includes(c))) return 'South America'
    if (['uk', 'united kingdom', 'france', 'germany', 'spain', 'italy', 'netherlands'].some(c => countryLower.includes(c))) return 'Europe'
    if (['china', 'japan', 'korea', 'thailand', 'india', 'vietnam', 'singapore'].some(c => countryLower.includes(c))) return 'Asia'
    if (['egypt', 'kenya', 'south africa', 'morocco', 'nigeria'].some(c => countryLower.includes(c))) return 'Africa'
    if (['australia', 'new zealand', 'fiji'].some(c => countryLower.includes(c))) return 'Oceania'
    return 'Other'
  }

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      toast.error("Please enter a title")
      return false
    }
    if (!formData.content.trim()) {
      toast.error("Please enter some content")
      return false
    }
    if (!formData.location.trim()) {
      toast.error("Please enter a location")
      return false
    }
    if (!locationSelected && (formData.coordinates.lat === 0 && formData.coordinates.lng === 0)) {
      toast.error("Please select a location on the map")
      return false
    }
    return true
  }

  const handleSave = async (isDraft = false) => {
    if (!user) {
      toast.error("You must be logged in to save an entry")
      return
    }

    if (!validateForm() && !isDraft) return

    setIsLoading(true)
    try {
      const mediaUrls = await uploadImages(images)

      const entryData: Omit<Entry, 'id'> = {
        uid: user.uid,
        title: formData.title,
        content: formData.content,
        timestamp: formData.timestamp,
        location: formData.location,
        country: formData.country,
        coordinates: formData.coordinates,
        mediaUrls,
        tags: formData.tags,
        type: formData.type,
        createdAt: new Date().toISOString(),
        isDraft,
        isFavorite: false
      }

      const docRef = await addDoc(collection(db, "entries"), entryData)
      
      const newEntry: Entry = {
        id: docRef.id,
        ...entryData
      }

      if (!isDraft) {
        await updateUserStats(newEntry)
      }

      if (!isDraft) {
        await addDoc(collection(db, "timelineEvents"), {
          id: docRef.id,
          uid: user.uid,
          title: formData.title,
          timestamp: formData.timestamp,
          location: formData.location,
          country: formData.country,
          type: formData.type,
          createdAt: new Date().toISOString()
        })
      }

      if (formData.coordinates.lat !== 0 || formData.coordinates.lng !== 0) {
        await addDoc(collection(db, "mapLocations"), {
          uid: user.uid,
          name: formData.location,
          lat: formData.coordinates.lat,
          lng: formData.coordinates.lng,
          type: "visited",
          entryId: docRef.id,
          createdAt: new Date().toISOString()
        })
      }
      
      toast.success(isDraft ? "Entry saved as draft!" : "Entry saved successfully!")
      navigate('/dashboard')
    } catch (error) {
      console.error('Error saving entry:', error)
      toast.error("Failed to save entry. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "journal": return <BookOpen className="h-4 w-4" />
      case "photo": return <Camera className="h-4 w-4" />
      case "map": return <Map className="h-4 w-4" />
      case "artifact": return <Archive className="h-4 w-4" />
      default: return <BookOpen className="h-4 w-4" />
    }
  }

  React.useEffect(() => {
    return () => {
      imagePreviewUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [imagePreviewUrls])

  return (
    <div className="min-h-screen flex flex-col parchment-texture">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="font-display text-3xl font-bold text-deepbrown">Create New Entry</h1>
              <p className="text-deepbrown/70 mt-1">Document your adventures and preserve your memories</p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="border-gold/30 bg-transparent"
                onClick={() => handleSave(true)}
                disabled={isLoading}
              >
                Save as Draft
              </Button>
              <AnimatedButton 
                animationType="wax-stamp"
                onClick={() => handleSave(false)}
                disabled={isLoading}
                className="min-w-[140px]"
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Save className="h-4 w-4" />
                  </motion.div>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Lore
                  </>
                )}
              </AnimatedButton>
            </div>
          </div>

          <div className="space-y-8">
            <Card className="border-gold/20 bg-parchment-light">
              <CardHeader>
                <CardTitle className="text-xl text-deepbrown flex items-center gap-2">
                  {getTypeIcon(formData.type)}
                  Entry Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Entry Type</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value: any) => handleInputChange('type', value)}
                  >
                    <SelectTrigger className="bg-parchment border-gold/30 w-full">
                      <SelectValue placeholder="Select entry type" />
                    </SelectTrigger>
                    <SelectContent className="bg-parchment border-gold/30 shadow-lg">
                      <SelectItem value="journal">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          Journal Entry
                        </div>
                      </SelectItem>
                      <SelectItem value="photo">
                        <div className="flex items-center gap-2">
                          <Camera className="h-4 w-4" />
                          Photo Collection
                        </div>
                      </SelectItem>
                      <SelectItem value="map">
                        <div className="flex items-center gap-2">
                          <Map className="h-4 w-4" />
                          Map & Routes
                        </div>
                      </SelectItem>
                      <SelectItem value="artifact">
                        <div className="flex items-center gap-2">
                          <Archive className="h-4 w-4" />
                          Cultural Artifact
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter a title for your adventure"
                    className="bg-parchment border-gold/30"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location *</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-deepbrown/50" />
                      <Input
                        id="location"
                        placeholder="City, Place"
                        className="pl-9 bg-parchment border-gold/30"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-deepbrown/50" />
                      <Input
                        id="country"
                        placeholder="Country"
                        className="pl-9 bg-parchment border-gold/30"
                        value={formData.country}
                        onChange={(e) => handleInputChange('country', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Date *</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-deepbrown/50" />
                      <Input 
                        id="date" 
                        type="date" 
                        className="pl-9 bg-parchment border-gold/30"
                        value={formData.timestamp}
                        onChange={(e) => handleInputChange('timestamp', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-gold/20 bg-parchment-light">
              <CardHeader>
                <CardTitle className="text-xl text-deepbrown">Your Story *</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Tell your adventure story... What did you see? How did you feel? What made this experience special?"
                  className="min-h-[200px] bg-parchment border-gold/30 resize-none"
                  value={formData.content}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                />
                <div className="flex justify-between items-center mt-2 text-sm text-deepbrown/50">
                  <span>{formData.content.length} characters</span>
                  <span>Tell your story in detail</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-gold/20 bg-parchment-light">
              <CardHeader>
                <CardTitle className="text-xl text-deepbrown flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag (e.g., hiking, food, culture)"
                    className="bg-parchment border-gold/30"
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                  <Button 
                    variant="outline" 
                    onClick={handleAddTag}
                    className="border-gold/30 bg-transparent"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className="bg-gold/10 text-deepbrown border border-gold/30"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-gold/20 bg-parchment-light">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl text-deepbrown">Photos</CardTitle>
                <div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleAddImage}
                    className="hidden"
                    id="photo-upload"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-gold/30 bg-transparent"
                    onClick={() => document.getElementById('photo-upload')?.click()}
                  >
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Add Photos
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {imagePreviewUrls.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {imagePreviewUrls.map((url, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="relative group"
                      >
                        <img
                          src={url}
                          alt={`Travel photo ${index + 1}`}
                          className="w-full h-40 object-cover rounded-lg border border-gold/20"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                          {images[index]?.name}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gold/30 rounded-lg p-8 text-center">
                    <ImageIcon className="h-12 w-12 text-gold/50 mx-auto mb-4" />
                    <p className="text-deepbrown/70 mb-2">No photos added yet</p>
                    <p className="text-sm text-deepbrown/50">
                      Click "Add Photos" to upload images from your adventure
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-gold/20 bg-parchment-light">
              <CardHeader>
                <CardTitle className="text-xl text-deepbrown">Map Location *</CardTitle>
                <p className="text-sm text-deepbrown/70">
                  Click on the map to set the exact location of your adventure
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] rounded-lg overflow-hidden">
                  <MapViewer
                    locations={locationSelected ? [{
                      id: 'current',
                      name: formData.location || 'Selected Location',
                      lat: formData.coordinates.lat,
                      lng: formData.coordinates.lng,
                      type: 'visited'
                    }] : []}
                    onLocationSelect={handleLocationSelect}
                    interactive={true}
                    center={locationSelected ? formData.coordinates : undefined}
                    zoom={locationSelected ? 10 : 2}
                  />
                </div>
                {locationSelected && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      ✓ Location set: {formData.coordinates.lat.toFixed(6)}, {formData.coordinates.lng.toFixed(6)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t border-gold/20">
              <Button 
                variant="outline" 
                className="border-gold/30 bg-transparent"
                onClick={() => navigate('/dashboard')}
              >
                Cancel
              </Button>
              <Button 
                variant="outline" 
                className="border-gold/30 bg-transparent"
                onClick={() => handleSave(true)}
                disabled={isLoading}
              >
                Save as Draft
              </Button>
              <AnimatedButton 
                animationType="wax-stamp"
                onClick={() => handleSave(false)}
                disabled={isLoading}
                className="min-w-[140px]"
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Save className="h-4 w-4" />
                  </motion.div>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Lore
                  </>
                )}
              </AnimatedButton>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}