"use client"


import * as React from "react"
import { motion } from "framer-motion"
import { Save, ImageIcon, MapPin, Calendar, X, Plus, Tag, Globe, BookOpen, Camera, Map, Archive, Search, Minus } from "lucide-react"
import { collection, addDoc, doc, updateDoc, getDoc, query, where, getDocs } from "firebase/firestore"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { db, storage } from "@/api/firebase"
import { useAuth } from '@/context/useAuth'
import { type Entry, type UserProfile, type AutocompletePrediction, type DayLog, type Trip } from "@/lib/types"
import { toast } from "sonner"
import { useNavigate, useSearchParams } from "react-router-dom"
import { EntryImages } from "@/components/EntryImages"
import { getNearbyPlaces, getPlaceDetails, getPlaceDetailsFromPlaceId, getAutocompleteSuggestions } from "@/services/geocoding"


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
  const [searchParams] = useSearchParams()
  const tripId = searchParams.get('tripId')
  const dayLogId = searchParams.get('dayLogId')
  const [associatedTrip, setAssociatedTrip] = React.useState<Trip | null>(null)
  const [associatedDayLog, _setAssociatedDayLog] = React.useState<DayLog | null>(null)
  const [showTripAssociation, setShowTripAssociation] = React.useState(false);
  const [selectedTrip, setSelectedTrip] = React.useState<Trip | null>(null);
  const [availableTrips, setAvailableTrips] = React.useState<Trip[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = React.useState(false);



  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [isInputFocused, setIsInputFocused] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("")
  const [searchResults, setSearchResults] = React.useState<AutocompletePrediction[]>([])
  const [isSearching, setIsSearching] = React.useState(false)
  const [showSearchResults, setShowSearchResults] = React.useState(false)
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const sessionTokenRef = React.useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const performSearch = React.useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
  
    setIsSearching(true);
    
    try {
      const results = await getAutocompleteSuggestions(
        query,
        sessionTokenRef.current || undefined,
        formData.coordinates.lat !== 0 ? {
          lat: formData.coordinates.lat,
          lng: formData.coordinates.lng,
          radius: 50000
        } : undefined
      );
      
      setSearchResults(results);
      setShowSearchResults(results.length > 0);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  }, [formData.coordinates]);

  const handleSearchInput = React.useCallback((value: string) => {
    setSearchValue(value);
    

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  }, [performSearch]);

  const handleSearchResultSelect = React.useCallback(async (result: AutocompletePrediction) => {
    try {
      const placeDetails = await getPlaceDetailsFromPlaceId(result.placeId);
      
      if (!placeDetails.coordinates) {
        throw new Error('No coordinates found for this place');
      }
      
      const { lat, lng } = placeDetails.coordinates;
      
      setSearchValue(placeDetails.name);
      setShowSearchResults(false);
      
      if (window.google?.maps?.places?.AutocompleteSessionToken) {
        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
      }
      

      setFormData(prev => ({
        ...prev,
        location: placeDetails.name,
        country: placeDetails.country || "",
        coordinates: { lat, lng },
        placeId: placeDetails.placeId
      }));
      
      setLocationSelected(true);
      toast.success(`Location set to ${placeDetails.name}`);
      
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    } catch (error) {
      console.error("Failed to navigate to search result:", error);
      toast.error('Failed to load place details');
    }
  }, []);

  const clearSearch = React.useCallback(() => {
    setSearchValue("")
    setSearchResults([])
    setShowSearchResults(false)
  }, [])


  const handleManualSearch = React.useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    performSearch(searchValue)
  }, [searchValue, performSearch])

  const handleSearchContainerClick = () => {
    if (!isInputFocused && searchInputRef.current) {
      searchInputRef.current.focus();
      const valueLength = searchInputRef.current.value.length;
      searchInputRef.current.setSelectionRange(valueLength, valueLength);
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


  const handleLocationSelect = async (location: { lat: number; lng: number; address?: string }) => {
    try {
      setIsSearching(true);
      

      try {
        const placeDetails = await getPlaceDetails(location.lat, location.lng);
        
        if (placeDetails) {
          setFormData(prev => ({
            ...prev,
            coordinates: { lat: location.lat, lng: location.lng },
            location: placeDetails.name,
            country: placeDetails.country || "",
            placeId: placeDetails.placeId
          }));
          
          setSearchValue(placeDetails.name);
          setLocationSelected(true);
          toast.success(`Location set to ${placeDetails.name}`);
          return;
        }
      } catch (error) {
        console.log('Falling back to nearby places search', error);
      }
  
      const nearbyPlaces = await getNearbyPlaces(location.lat, location.lng, 50);
      
      if (nearbyPlaces.length > 0) {
        const placeDetails = nearbyPlaces[0];
        
        setFormData(prev => ({
          ...prev,
          coordinates: { lat: location.lat, lng: location.lng },
          location: placeDetails.name,
          country: placeDetails.country || "",
          placeId: placeDetails.placeId
        }));
        
        setSearchValue(placeDetails.name);
        setLocationSelected(true);
        toast.success(`Location set to ${placeDetails.name}`);
        return;
      }
  
      if (location.address) {
        const addressParts = location.address.split(', ');
        const country = addressParts[addressParts.length - 1] || "";
        const city = addressParts[0] || location.address;
        
        setFormData(prev => ({
          ...prev,
          coordinates: { lat: location.lat, lng: location.lng },
          location: city,
          country: country
        }));
        
        setSearchValue(city);
        setLocationSelected(true);
        toast.success("Location set successfully!");
      }
    } catch (error) {
      console.error('Failed to get location details:', error);
      toast.error('Failed to set location details');
    } finally {
      setIsSearching(false);
      
      if (window.google?.maps?.places?.AutocompleteSessionToken) {
        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
      }
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

  const createMapLocation = async (entryId: string, entryData: Omit<Entry, 'id'>) => {
    if (entryData.coordinates.lat === 0 && entryData.coordinates.lng === 0) return
  
    try {
      await addDoc(collection(db, "mapLocations"), {
        uid: entryData.uid,
        name: entryData.location,
        lat: entryData.coordinates.lat,
        lng: entryData.coordinates.lng,
        type: "visited" as const,
        tripId: tripId || null,
        dayLogId: dayLogId || null,
        entryId: entryId,
        isCustom: false,
        createdAt: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error creating map location:', error)
    }
  }

  const updateAssociatedRecords = async (entryId: string) => {
    try {
      if (tripId && associatedTrip) {
        const tripRef = doc(db, "trips", tripId)
        const updatedEntryIDs = [...(associatedTrip.entryIDs || []), entryId]
        await updateDoc(tripRef, {
          entryIDs: updatedEntryIDs,
          totalEntries: updatedEntryIDs.length,
          updatedAt: new Date().toISOString()
        })
      }
  
      if (dayLogId && associatedDayLog) {
        const dayLogRef = doc(db, "dayLogs", dayLogId)
        const updatedEntryIds = [...(associatedDayLog.entryIds || []), entryId]
        await updateDoc(dayLogRef, {
          entryIds: updatedEntryIds,
          totalEntries: updatedEntryIds.length,
          updatedAt: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('Error updating associated records:', error)
    }
  }

  const loadUserTrips = async () => {
    if (!user) return;
    
    setIsLoadingTrips(true);
    try {
      const tripsQuery = query(
        collection(db, "trips"),
        where("uid", "==", user.uid)
      );
      const tripsSnapshot = await getDocs(tripsQuery);
      const trips = tripsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Trip));
      setAvailableTrips(trips);
      

      if (tripId) {
        const matchingTrip = trips.find(t => t.id === tripId);
        if (matchingTrip) {
          setSelectedTrip(matchingTrip);
          setAssociatedTrip(matchingTrip);
        }
      }
    } catch (error) {
      console.error('Error loading trips:', error);
      toast.error('Failed to load your trips');
    } finally {
      setIsLoadingTrips(false);
    }
  };
  
  React.useEffect(() => {
    loadUserTrips();
  }, [user]);
  

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
        tripId: selectedTrip?.id || null,
        dayLogId: dayLogId || null,
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
        isStandalone: !tripId,
        placeId: formData.placeId
      }
  
      const docRef = await addDoc(collection(db, "entries"), entryData)
      const entryId = docRef.id
      
      const newEntry: Entry = {
        id: entryId,
        ...entryData
      }
  
      await createMapLocation(entryId, entryData)
  
      await updateAssociatedRecords(entryId)
  
      if (!isDraft) {
        await updateUserStats(newEntry)
        
        await addDoc(collection(db, "timelineEvents"), {
          id: entryId,
          uid: user.uid,
          title: formData.title,
          timestamp: formData.timestamp,
          location: formData.location,
          country: formData.country,
          type: formData.type,
          createdAt: new Date().toISOString(),
          tripId: tripId || null,
          dayLogId: dayLogId || null
        })
      }
      
      toast.success(isDraft ? "Entry saved as draft!" : "Entry saved successfully!")
      if (tripId) {
        navigate(`/trip/${tripId}`);
      } else {
        navigate('/dashboard');
      }
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
      imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, [imagePreviewUrls]);

  React.useEffect(() => {
    if (tripId && !associatedTrip) {
      const verifyTrip = async () => {
        try {
          const tripRef = doc(db, "trips", tripId);
          const tripSnap = await getDoc(tripRef);
          if (tripSnap.exists()) {
            setAssociatedTrip({ id: tripSnap.id, ...tripSnap.data() } as Trip);
          }
        } catch (error) {
          console.error('Error verifying trip:', error);
        }
      };
      verifyTrip();
    }
  }, [tripId]);

  const TripAssociationSection = () => (
    <Card className="border-gold/20 bg-parchment-light">
      <CardHeader className="pb-4 sm:pb-6">
        <CardTitle className="text-base sm:text-lg text-deepbrown flex items-center gap-2">
          <MapPin className="h-4 sm:h-5 w-4 sm:w-5 text-deepbrown/50" />
          Trip Association (Optional)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedTrip ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-deepbrown/50">Selected Trip:</p>
                <p className="text-deepbrown">{selectedTrip.name}</p>
                {selectedTrip.startDate && (
                  <p className="text-sm text-deepbrown/50">
                    {new Date(selectedTrip.startDate).toLocaleDateString()} - 
                    {selectedTrip.endDate ? new Date(selectedTrip.endDate).toLocaleDateString() : 'Ongoing'}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-deepbrown border-gold/50 hover:bg-gold/10"
                onClick={() => {
                  setSelectedTrip(null);
                  setAssociatedTrip(null);
                }}
              >
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <Select
            onValueChange={(tripId) => {
              const trip = availableTrips.find(t => t.id === tripId);
              if (trip) {
                setSelectedTrip(trip);
                setAssociatedTrip(trip);
              }
            }}
            disabled={isLoadingTrips}
          >
            <SelectTrigger className="bg-gold/20 border-gold/50 text-deepbrown">
              <SelectValue placeholder={isLoadingTrips ? "Loading trips..." : "Select a trip to associate"} />
            </SelectTrigger>
            <SelectContent className="bg-parchment border-gold/30 shadow-lg">
              {availableTrips.map(trip => (
                <SelectItem 
                  key={trip.id} 
                  value={trip.id}
                  className="hover:bg-gold/10 focus:bg-gold/20 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-deepbrown/50" />
                    <span className="text-deepbrown">{trip.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardContent>
    </Card>
  );  
  

  return (
    <div className="min-h-screen flex flex-col parchment-texture">
      <Navbar />
      
      <main className="flex-1 pt-20 sm:pt-24 pb-12 sm:pb-16">
        <div className="container max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center mb-8">
            <div className="mb-4 sm:mb-0">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-deepbrown">Create New Entry</h1>
              <p className="text-sm sm:text-base text-deepbrown/70 mt-1">Document your adventures and preserve your memories</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
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
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl text-deepbrown flex items-center gap-2">
                  {getTypeIcon(formData.type)}
                  Entry Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location-search">Location * (Search or click on map)</Label>
                  <div className="relative search-input-container w-full"
                    onClick={handleSearchContainerClick}
                  >
                    <Popover open={showSearchResults} onOpenChange={setShowSearchResults}>
                      <PopoverTrigger asChild>
                        <div>
                          <Input
                            ref={searchInputRef}
                            id="location-search"
                            placeholder="Search for a place..."
                            className="pl-9 bg-parchment border-gold/30"
                            value={searchValue}
                            onChange={(e) => {
                              handleSearchInput(e.target.value);
                              if (e.target.value) {
                                setShowSearchResults(true);
                              }
                            }}
                            onFocus={() => {
                              setIsInputFocused(true);
                              if (searchValue && searchResults.length > 0) {
                                setShowSearchResults(true);
                              }
                            }}
                            onBlur={() => {
                              setIsInputFocused(false);
                              setTimeout(() => setShowSearchResults(false), 200);
                            }}
                          />
                        </div>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="p-0 w-full max-w-[calc(100vw-2rem)] sm:max-w-none bg-white/98 backdrop-blur-sm shadow-2xl border-2 border-gray-200 rounded-xl mt-1" 
                        align="start"
                        onPointerDownOutside={(e) => {
                          if (!(e.target as HTMLElement).closest('.search-input-container')) {
                            setShowSearchResults(false);
                          }
                        }}
                        onOpenAutoFocus={(e) => e.preventDefault()}
                        onCloseAutoFocus={(e) => e.preventDefault()}
                      >
                        <div className="max-h-80 overflow-y-auto">
                          {searchResults.length === 0 && searchValue && !isSearching ? (
                            <div className="p-3 sm:p-4 text-center text-sm sm:text-base text-gray-500">
                              No results found for "{searchValue}"
                            </div>
                          ) : (
                            searchResults.map((result, index) => (
                              <div
                                key={`${result.placeId}-${index}`}
                                className="p-3 sm:p-4 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  handleSearchResultSelect(result);
                                  setShowSearchResults(false);
                                }}
                              >
                                <div className="font-semibold text-gray-800 text-base mb-1">
                                  {result.structuredFormatting.mainText}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {result.structuredFormatting.secondaryText}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-deepbrown/50" />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                      </div>
                    )}
                    {searchValue && !isSearching && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearSearch();
                          searchInputRef.current?.focus();
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl font-bold w-6 h-6 flex items-center justify-center"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 bg-white/95 backdrop-blur-sm border-2 border-gray-200 shadow-sm hover:bg-gray-50"
                    onClick={() => {
                      if (searchValue.trim()) {
                        handleManualSearch();
                        searchInputRef.current?.focus();
                        setTimeout(() => {
                          if (searchInputRef.current) {
                            const len = searchInputRef.current.value.length;
                            searchInputRef.current.setSelectionRange(len, len);
                          }
                        }, 0);
                      }
                    }}
                    disabled={!searchValue.trim() || isSearching}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
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

            <Button
              variant="outline"
              className="border-gold/20 bg-parchment-light text-deepbrown mb-4"
              onClick={() => setShowTripAssociation(!showTripAssociation)}
            >
              {showTripAssociation ? <Minus className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
              {showTripAssociation ? 'Hide Trip Association' : 'Associate with a Trip (Optional)'}
            </Button>

            {showTripAssociation && <TripAssociationSection />}

            <Card className="border-gold/20 bg-parchment-light">
              <CardHeader>
                <CardTitle className="text-xl text-deepbrown">Your Story *</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Tell your adventure story... What did you see? How did you feel? What made this experience special?"
                  className="min-h-[150px] sm:min-h-[200px] bg-parchment border-gold/30 resize-none text-sm sm:text-base"
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
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl text-deepbrown flex items-center gap-2">
                  <Tag className="h-4 sm:h-5 w-4 sm:w-5" />
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
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                <CardTitle className="text-lg sm:text-xl text-deepbrown">Photos</CardTitle>
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
                  <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
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
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl text-deepbrown">Map Location *</CardTitle>
                <p className="text-xs sm:text-sm text-deepbrown/70 mt-1 sm:mt-2">
                  Search above or click on the map to set the exact location of your adventure. 
                  Selected locations will appear as markers.
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] sm:h-[400px] rounded-lg overflow-hidden">
                  <MapViewer
                    locations={locationSelected ? [{
                      id: 'current-entry-location',
                      name: formData.location || 'Selected Location',
                      lat: formData.coordinates.lat,
                      lng: formData.coordinates.lng,
                      type: 'visited',
                      isCustom: false,
                      uid: user?.uid || "",
                    }] : []}
                    onLocationSelect={handleLocationSelect}
                    interactive={true}
                    center={locationSelected ? formData.coordinates : undefined}
                    zoom={locationSelected ? 12 : 2}
                    showSearch={false}
                    enableClustering={false}
                  />
                </div>
                {locationSelected && (
                  <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-2 sm:gap-3">
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

            <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-6 border-t border-gold/20">
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