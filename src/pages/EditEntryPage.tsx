"use client"
import * as React from "react"
import { motion } from "framer-motion"
import { Save, ImageIcon, MapPin, Calendar, X, Plus, Tag, Globe, BookOpen, Camera, Map, Archive, ArrowLeft, Loader2, Trash2 } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import { Navbar } from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { AnimatedButton } from "@/components/ui/animated-button"
import { GoogleMapsLoader } from "@/components/GoogleMapsLoader"
import { MapViewer } from "@/components/MapViewer"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { entryService, type CreateEntryData } from "@/services/entryService"
import { type Entry } from "@/lib/types"
import { useAuth } from "@/context/AuthContext"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface FormData {
  title: string
  content: string
  date: string
  location: string
  country: string
  coordinates: { lat: number; lng: number }
  tags: string[]
  type: "journal" | "photo" | "map" | "artifact"
  isDraft?: boolean
}

export default function EditEntryPage() {
  const navigate = useNavigate()
  const params = useParams()
  const { user } = useAuth()
  const entryId = params?.id as string
  
  const [entry, setEntry] = React.useState<Entry | null>(null)
  const [formData, setFormData] = React.useState<FormData>({
    title: "",
    content: "",
    date: new Date().toISOString().split('T')[0],
    location: "",
    country: "",
    coordinates: { lat: 0, lng: 0 },
    tags: [],
    type: "journal",
    isDraft: false
  })
  
  const [existingImages, setExistingImages] = React.useState<string[]>([])
  const [newImages, setNewImages] = React.useState<File[]>([])
  const [newImagePreviewUrls, setNewImagePreviewUrls] = React.useState<string[]>([])
  const [removedImageUrls, setRemovedImageUrls] = React.useState<string[]>([])
  const [currentTag, setCurrentTag] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [isInitialLoading, setIsInitialLoading] = React.useState(true)
  const [locationSelected, setLocationSelected] = React.useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  React.useEffect(() => {
    const loadEntry = async () => {
      if (!entryId || !user) return

      try {
        setIsInitialLoading(true)
        const entryData = await entryService.getEntry(entryId)
        
        if (!entryData) {
          toast.error("Entry not found")
          navigate('/dashboard')
          return
        }

        if (entryData.uid !== user.uid) {
          toast.error("You don't have permission to edit this entry")
          navigate('/dashboard')
          return
        }

        setEntry(entryData)
        setFormData({
          title: entryData.title,
          content: entryData.content,
          date: entryData.date,
          location: entryData.location,
          country: entryData.country,
          coordinates: entryData.coordinates,
          tags: entryData.tags || [],
          type: entryData.type,
          isDraft: entryData.isDraft || false
        })
        
        setExistingImages(entryData.mediaUrls || [])
        setLocationSelected(entryData.coordinates.lat !== 0 || entryData.coordinates.lng !== 0)
      } catch (error) {
        console.error('Error loading entry:', error)
        toast.error("Failed to load entry")
        navigate('/dashboard')
      } finally {
        setIsInitialLoading(false)
      }
    }

    loadEntry()
  }, [entryId, user, navigate])

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAddNewImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    // Validate file types and sizes
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

    setNewImages(prev => [...prev, ...validFiles])
    
    // Create preview URLs
    const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file))
    setNewImagePreviewUrls(prev => [...prev, ...newPreviewUrls])
  }

  const handleRemoveExistingImage = (imageUrl: string) => {
    setExistingImages(prev => prev.filter(url => url !== imageUrl))
    setRemovedImageUrls(prev => [...prev, imageUrl])
  }

  const handleRemoveNewImage = (index: number) => {
    // Revoke the object URL to prevent memory leaks
    URL.revokeObjectURL(newImagePreviewUrls[index])
    
    setNewImages(prev => prev.filter((_, i) => i !== index))
    setNewImagePreviewUrls(prev => prev.filter((_, i) => i !== index))
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
    toast.success("Location updated successfully!")
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
    return true
  }

  const handleUpdate = async (isDraft = false) => {
    if (!user || !entry) {
      toast.error("Unable to update entry")
      return
    }

    if (!validateForm() && !isDraft) return

    setIsLoading(true)
    try {
      const updateData: Partial<CreateEntryData> = {
        ...formData,
        isDraft
      }

      await entryService.updateEntry(entry.id, updateData, newImages)
      
      toast.success(isDraft ? "Entry saved as draft!" : "Entry updated successfully!")
      navigate('/dashboard')
    } catch (error) {
      console.error('Error updating entry:', error)
      toast.error("Failed to update entry. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!entry) return

    setIsDeleting(true)
    try {
      await entryService.deleteEntry(entry.id)
      toast.success("Entry deleted successfully")
      navigate('/dashboard')
    } catch (error) {
      console.error('Error deleting entry:', error)
      toast.error("Failed to delete entry")
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
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

  // Cleanup preview URLs on unmount
  React.useEffect(() => {
    return () => {
      newImagePreviewUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [])

  if (isInitialLoading) {
    return (
      <div className="min-h-screen flex flex-col parchment-texture">
        <Navbar />
        <main className="flex-1 pt-24 pb-16 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-gold mx-auto mb-4" />
            <p className="text-deepbrown/70">Loading entry...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="min-h-screen flex flex-col parchment-texture">
        <Navbar />
        <main className="flex-1 pt-24 pb-16 flex items-center justify-center">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold text-deepbrown mb-4">
              Entry Not Found
            </h2>
            <p className="text-deepbrown/70 mb-6">
              The entry you're looking for doesn't exist or you don't have permission to edit it.
            </p>
            <Button onClick={() => navigate('/dashboard')} className="bg-gold hover:bg-gold/90">
              Back to Dashboard
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col parchment-texture">
      <GoogleMapsLoader />
      <Navbar />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-4xl">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate(-1)}
                className="border-gold/30 bg-transparent"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="font-display text-3xl font-bold text-deepbrown">Edit Entry</h1>
                <p className="text-deepbrown/70 mt-1">Update your adventure and memories</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="border-red-300 bg-transparent text-red-600 hover:bg-red-50"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isLoading || isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
              <Button 
                variant="outline" 
                className="border-gold/30 bg-transparent"
                onClick={() => handleUpdate(true)}
                disabled={isLoading}
              >
                Save as Draft
              </Button>
              <AnimatedButton 
                animationType="wax-stamp"
                onClick={() => handleUpdate(false)}
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
                    Update Entry
                  </>
                )}
              </AnimatedButton>
            </div>
          </div>

          <div className="space-y-8">
            {/* Entry Type & Basic Details */}
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
                    <SelectTrigger className="bg-parchment border-gold/30">
                      <SelectValue placeholder="Select entry type" />
                    </SelectTrigger>
                    <SelectContent>
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
                        value={formData.date}
                        onChange={(e) => handleInputChange('date', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Story Content */}
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

            {/* Tags */}
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

            {/* Photos */}
            <Card className="border-gold/20 bg-parchment-light">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl text-deepbrown">Photos</CardTitle>
                <div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleAddNewImage}
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
                {(existingImages.length > 0 || newImagePreviewUrls.length > 0) ? (
                  <div className="space-y-6">
                    {/* Existing Images */}
                    {existingImages.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-deepbrown mb-3">Current Photos</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {existingImages.map((imageUrl, index) => (
                            <motion.div
                              key={`existing-${index}`}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.3 }}
                              className="relative group"
                            >
                              <img
                                src={imageUrl}
                                alt={`Existing photo ${index + 1}`}
                                className="w-full h-40 object-cover rounded-lg border border-gold/20"
                              />
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleRemoveExistingImage(imageUrl)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                              <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                                Existing
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* New Images */}
                    {newImagePreviewUrls.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-deepbrown mb-3">New Photos</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {newImagePreviewUrls.map((url, index) => (
                            <motion.div
                              key={`new-${index}`}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.3 }}
                              className="relative group"
                            >
                              <img
                                src={url}
                                alt={`New photo ${index + 1}`}
                                className="w-full h-40 object-cover rounded-lg border border-gold/20"
                              />
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleRemoveNewImage(index)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                              <div className="absolute bottom-2 left-2 bg-green-600/80 text-white px-2 py-1 rounded text-xs">
                                New
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
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

            {/* Interactive Map */}
            <Card className="border-gold/20 bg-parchment-light">
              <CardHeader>
                <CardTitle className="text-xl text-deepbrown">Map Location *</CardTitle>
                <p className="text-sm text-deepbrown/70">
                  Click on the map to update the exact location of your adventure
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

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6 border-t border-gold/20">
              <Button 
                variant="outline" 
                className="border-red-300 bg-transparent text-red-600 hover:bg-red-50 sm:w-auto"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isLoading || isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Entry
              </Button>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  variant="outline" 
                  className="border-gold/30 bg-transparent"
                  onClick={() => navigate(-1)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="outline" 
                  className="border-gold/30 bg-transparent"
                  onClick={() => handleUpdate(true)}
                  disabled={isLoading}
                >
                  Save as Draft
                </Button>
                <AnimatedButton 
                  animationType="wax-stamp"
                  onClick={() => handleUpdate(false)}
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
                      Update Entry
                    </>
                  )}
                </AnimatedButton>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{formData.title}"? This action cannot be undone and will permanently remove the entry and all associated photos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="mr-2"
                >
                  <Trash2 className="h-4 w-4" />
                </motion.div>
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}