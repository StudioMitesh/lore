"use client"


import * as React from "react"
import { motion } from "framer-motion"
import { Save, ImageIcon, MapPin, Calendar, X, Plus, Tag, Globe, BookOpen, Camera, Map, Archive, Search, Loader2 } from "lucide-react"
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
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { db, storage } from "@/api/firebase"
import { useAuth } from '@/context/useAuth'
import { type Entry, type UserProfile, type AutocompletePrediction } from "@/lib/types"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"
import { EntryImages } from "@/components/EntryImages"
import { getNearbyPlaces, searchPlaces, getPlaceDetails, getPlaceDetailsFromPlaceId } from "@/services/geocoding"


interface FormData {
  title: string
  content: string
  timestamp: string
  location: string
  country: string
  coordinates: { lat: number; lng: number }
  tags: string[]
  type: "journal" | "photo" | "map" | "artifact"
  placeId?: string
}

export default function NewEntryPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [formData, setFormData] = React.useState<FormData>({
    title: "",
    content: "",
    timestamp: new Date().toISOString().split('T')[0],
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

  // Search and autocomplete state
  const [searchQuery, setSearchQuery] = React.useState("")
  const [searchResults, setSearchResults] = React.useState<AutocompletePrediction[]>([])
  const [isSearching, setIsSearching] = React.useState(false)
  const [showSearchResults, setShowSearchResults] = React.useState(false)
  const [searchDebounceTimer, setSearchDebounceTimer] = React.useState<NodeJS.Timeout | null>(null)

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Enhanced search functionality
  // Update the handleSearchInputChange function
const handleSearchInputChange = async (value: string) => {
  setSearchQuery(value);
  
  // Clear existing timer
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }

  // Set new timer for debounced search
  const timer = setTimeout(async () => {
    if (value.trim().length >= 3) {
      setIsSearching(true);
      try {
        const results = await searchPlaces(value, formData.coordinates.lat !== 0 ? {
          lat: formData.coordinates.lat,
          lng: formData.coordinates.lng,
          radius: 50000
        } : undefined);
        
        setSearchResults(results);
        setShowSearchResults(results.length > 0);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
        toast.error("Failed to search for places");
      } finally {
        setIsSearching(false);
      }
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, 300);

  setSearchDebounceTimer(timer);
};

// Update the handlePlaceSelect function
const handlePlaceSelect = async (prediction: AutocompletePrediction) => {
  setIsSearching(true);
  try {
    const placeDetails = await getPlaceDetailsFromPlaceId(prediction.placeId);
    
    if (!placeDetails) {
      throw new Error('No place details found');
    }

    handleInputChange('location', placeDetails.name);
    handleInputChange('country', placeDetails.country);
    handleInputChange('coordinates', placeDetails.coordinates);
    handleInputChange('placeId', placeDetails.placeId);
    
    setSearchQuery(placeDetails.name);
    setLocationSelected(true);
    setShowSearchResults(false);
    
    toast.success(`Location set to ${placeDetails.name}`);
  } catch (error) {
    console.error('Failed to get place details:', error);
    toast.error('Failed to load place details');
  } finally {
    setIsSearching(false);
  }
};
  


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

  // Enhanced location selection with geocoding
  const handleLocationSelect = async (location: { lat: number; lng: number; address?: string }) => {
    try {
      setIsSearching(true);
      
      // First try to get precise place details
      try {
        const placeDetails = await getPlaceDetails(location.lat, location.lng);
        
        if (placeDetails) {
          handleInputChange('coordinates', { lat: location.lat, lng: location.lng });
          handleInputChange('location', placeDetails.name);
          handleInputChange('country', placeDetails.country);
          handleInputChange('placeId', placeDetails.placeId);
          
          setSearchQuery(placeDetails.name);
          setLocationSelected(true);
          toast.success(`Location set to ${placeDetails.name}`);
          return;
        }
      } catch (error) {
        console.log('Falling back to nearby places search', error);
      }
  
      // Fallback to nearby places search
      const nearbyPlaces = await getNearbyPlaces(location.lat, location.lng, 50);
      
      if (nearbyPlaces.length > 0) {
        const placeDetails = nearbyPlaces[0];
        
        handleInputChange('coordinates', { lat: location.lat, lng: location.lng });
        handleInputChange('location', placeDetails.name);
        handleInputChange('country', placeDetails.country);
        handleInputChange('placeId', placeDetails.placeId);
        
        setSearchQuery(placeDetails.name);
        setLocationSelected(true);
        toast.success(`Location set to ${placeDetails.name}`);
        return;
      }
  
      // Final fallback to basic address parsing
      if (location.address) {
        const addressParts = location.address.split(', ');
        const country = addressParts[addressParts.length - 1] || "";
        const city = addressParts[0] || location.address;
        
        handleInputChange('coordinates', { lat: location.lat, lng: location.lng });
        handleInputChange('location', city);
        handleInputChange('country', country);
        setLocationSelected(true);
        toast.success("Location set successfully!");
      }
    } catch (error) {
      console.error('Failed to get location details:', error);
      toast.error('Failed to set location details');
    } finally {
      setIsSearching(false);
    }
  };
  


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
        isFavorite: false,
        isStandalone: true,
        placeId: formData.placeId
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
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer)
      }
    }
  }, [imagePreviewUrls, searchDebounceTimer])

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
                    <Label htmlFor="location-search">Location * (Search or click on map)</Label>
                    <Popover open={showSearchResults} onOpenChange={setShowSearchResults}>
                      <PopoverTrigger asChild>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-deepbrown/50" />
                          <Input
                            id="location-search"
                            placeholder="Search for a place..."
                            className="pl-9 bg-parchment border-gold/30"
                            value={searchQuery}
                            onChange={(e) => handleSearchInputChange(e.target.value)}
                            onFocus={() => {
                              if (searchQuery && searchResults.length > 0) {
                                setShowSearchResults(true);
                              }
                            }}
                            onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                          />
                          {isSearching ? (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gold" />
                          ) : (
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-deepbrown/50" />
                          )}
                        </div>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="p-0 w-[400px]" 
                        align="start"
                        onPointerDownOutside={(e) => {
                          if (!(e.target as HTMLElement).closest('#location-search')) {
                            setShowSearchResults(false);
                          }
                        }}
                        onOpenAutoFocus={(e) => e.preventDefault()}
                        onCloseAutoFocus={(e) => e.preventDefault()}
                      >
                        <Command>
                          <CommandList>
                            {searchResults.length === 0 && searchQuery.length >= 3 && !isSearching && (
                              <CommandEmpty>No places found.</CommandEmpty>
                            )}
                            <CommandGroup>
                              {searchResults.map((result) => (
                                <CommandItem
                                  key={result.placeId}
                                  value={result.description}
                                  onSelect={() => handlePlaceSelect(result)}
                                  className="flex flex-col items-start py-3 cursor-pointer"
                                  onMouseDown={(e) => e.preventDefault()}
                                >
                                  <div className="font-medium">{result.structuredFormatting.mainText}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {result.structuredFormatting.secondaryText}
                                  </div>
                                  <div className="flex gap-1 mt-1">
                                    {result.types?.slice(0, 2).map(type => (
                                      <Badge key={type} variant="secondary" className="text-xs">
                                        {type.replace(/_/g, ' ')}
                                      </Badge>
                                    ))}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
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
                <EntryImages 
                  images={imagePreviewUrls} 
                  title="Entry Photos"
                  maxDisplayImages={6}
                  enableLightbox={true}
                />
                {imagePreviewUrls.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {images.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-parchment rounded border border-gold/20">
                        <span className="text-sm text-deepbrown truncate">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveImage(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-gold/20 bg-parchment-light">
              <CardHeader>
                <CardTitle className="text-xl text-deepbrown">Map Location *</CardTitle>
                <p className="text-sm text-deepbrown/70">
                  Search above or click on the map to set the exact location of your adventure. 
                  Selected locations will appear as markers.
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
                      type: 'visited',
                      uid: user?.uid || ""
                    }] : []}
                    onLocationSelect={handleLocationSelect}
                    interactive={true}
                    center={locationSelected ? formData.coordinates : undefined}
                    zoom={locationSelected ? 10 : 2}
                  />
                </div>
                {locationSelected && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-800">
                          Location set: {formData.location}
                        </p>
                        <p className="text-xs text-green-700">
                          {formData.coordinates.lat.toFixed(6)}, {formData.coordinates.lng.toFixed(6)}
                        </p>
                        {formData.country && (
                          <p className="text-xs text-green-700">{formData.country}</p>
                        )}
                      </div>
                    </div>
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