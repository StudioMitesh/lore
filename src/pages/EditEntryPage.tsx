'use client';
import * as React from 'react';
import { motion } from 'framer-motion';
import {
  Save,
  ImageIcon,
  MapPin,
  Calendar,
  X,
  Plus,
  Tag,
  Globe,
  BookOpen,
  Camera,
  Map,
  Archive,
  ArrowLeft,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import {
  collection,
  doc,
  updateDoc,
  getDoc,
  deleteDoc,
  addDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AnimatedButton } from '@/components/ui/animated-button';
import { MapViewer } from '@/components/map/MapViewer';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/context/useAuth';
import { type Entry, type UserProfile, type Trip, type DayLog } from '@/lib/types';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface FormData {
  title: string;
  content: string;
  timestamp: string;
  location: string;
  country: string;
  coordinates: { lat: number; lng: number };
  tags: string[];
  type: 'journal' | 'photo' | 'map' | 'artifact' | 'event';
}

export default function EditEntryPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const entryId = params?.id as string;

  const [entry, setEntry] = React.useState<Entry | null>(null);
  const [formData, setFormData] = React.useState<FormData>({
    title: '',
    content: '',
    timestamp: new Date().toISOString(),
    location: '',
    country: '',
    coordinates: { lat: 0, lng: 0 },
    tags: [],
    type: 'journal',
  });

  const [existingImages, setExistingImages] = React.useState<string[]>([]);
  const [newImages, setNewImages] = React.useState<File[]>([]);
  const [newImagePreviewUrls, setNewImagePreviewUrls] = React.useState<string[]>([]);
  const [removedImageUrls, setRemovedImageUrls] = React.useState<string[]>([]);
  const [currentTag, setCurrentTag] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [locationSelected, setLocationSelected] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [associatedTrip, setAssociatedTrip] = React.useState<Trip | null>(null);
  const [associatedDayLog, setAssociatedDayLog] = React.useState<DayLog | null>(null);

  React.useEffect(() => {
    const loadEntry = async () => {
      if (!entryId || !user) return;

      try {
        setIsInitialLoading(true);
        const entryRef = doc(db, 'entries', entryId);
        const entrySnap = await getDoc(entryRef);

        if (!entrySnap.exists()) {
          toast.error('Entry not found');
          router.push('/dashboard');
          return;
        }

        const entryData = { id: entrySnap.id, ...entrySnap.data() } as Entry;

        if (entryData.uid !== user.uid) {
          toast.error("You don't have permission to edit this entry");
          router.push('/dashboard');
          return;
        }

        setEntry(entryData);
        setFormData({
          title: entryData.title,
          content: entryData.content,
          timestamp: entryData.timestamp,
          location: entryData.location,
          country: entryData.country,
          coordinates: entryData.coordinates,
          tags: entryData.tags || [],
          type: entryData.type,
        });

        setExistingImages(entryData.mediaUrls || []);
        setLocationSelected(entryData.coordinates.lat !== 0 || entryData.coordinates.lng !== 0);
      } catch (error) {
        console.error('Error loading entry:', error);
        toast.error('Failed to load entry');
        router.push('/dashboard');
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadEntry();
  }, [entryId, user]);

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddNewImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter((file) => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit

      if (!isValidType) {
        toast.error(`${file.name} is not a valid image file`);
        return false;
      }
      if (!isValidSize) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setNewImages((prev) => [...prev, ...validFiles]);

    const newPreviewUrls = validFiles.map((file) => URL.createObjectURL(file));
    setNewImagePreviewUrls((prev) => [...prev, ...newPreviewUrls]);
  };

  const handleRemoveExistingImage = (imageUrl: string) => {
    setExistingImages((prev) => prev.filter((url) => url !== imageUrl));
    setRemovedImageUrls((prev) => [...prev, imageUrl]);
  };

  const handleRemoveNewImage = (index: number) => {
    URL.revokeObjectURL(newImagePreviewUrls[index]);

    setNewImages((prev) => prev.filter((_, i) => i !== index));
    setNewImagePreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      handleInputChange('tags', [...formData.tags, currentTag.trim()]);
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    handleInputChange(
      'tags',
      formData.tags.filter((tag) => tag !== tagToRemove)
    );
  };

  const handleLocationSelect = (location: { lat: number; lng: number; address?: string }) => {
    handleInputChange('coordinates', { lat: location.lat, lng: location.lng });
    if (location.address) {
      const addressParts = location.address.split(', ');
      const country = addressParts[addressParts.length - 1] || '';
      const city = addressParts[0] || location.address;

      handleInputChange('location', city);
      handleInputChange('country', country);
    }
    setLocationSelected(true);
    toast.success('Location updated successfully!');
  };

  const uploadImages = async (images: File[]): Promise<string[]> => {
    if (images.length === 0) return [];

    const uploadPromises = images.map(async (image, index) => {
      const imageRef = ref(storage, `entries/${user!.uid}/${Date.now()}_${index}_${image.name}`);
      await uploadBytes(imageRef, image);
      return await getDownloadURL(imageRef);
    });

    return await Promise.all(uploadPromises);
  };

  const deleteRemovedImages = async (imageUrls: string[]) => {
    if (imageUrls.length === 0) return;

    const deletePromises = imageUrls.map(async (url) => {
      try {
        const imageRef = ref(storage, url);
        await deleteObject(imageRef);
      } catch (error) {
        console.warn('Failed to delete image:', url, error);
      }
    });

    await Promise.allSettled(deletePromises);
  };

  const updateUserStats = async (updatedEntry: Entry, originalEntry: Entry) => {
    if (!user) return;

    try {
      const profileRef = doc(db, 'profiles', user.uid);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        const profile = profileSnap.data() as UserProfile;

        const originalPhotoCount = originalEntry.mediaUrls?.length || 0;
        const newPhotoCount = updatedEntry.mediaUrls?.length || 0;
        const photoDifference = newPhotoCount - originalPhotoCount;

        const updatedStats = {
          ...profile.stats,
          totalPhotos: Math.max(0, (profile.stats.totalPhotos || 0) + photoDifference),
        };

        await updateDoc(profileRef, {
          stats: updatedStats,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error updating user stats:', error);
    }
  };

  const updateMapLocation = async (entryId: string, entryData: Partial<Entry>) => {
    if (
      !entryData.coordinates ||
      (entryData.coordinates.lat === 0 && entryData.coordinates.lng === 0)
    )
      return;

    try {
      const mapLocQuery = query(collection(db, 'mapLocations'), where('entryId', '==', entryId));
      const mapLocSnap = await getDocs(mapLocQuery);

      const mapLocationData = {
        uid: user!.uid,
        name: entryData.location!,
        lat: entryData.coordinates.lat,
        lng: entryData.coordinates.lng,
        type: 'visited' as const,
        tripId: entryData.tripId || null,
        dayLogId: entryData.dayLogId || null,
        entryId: entryId,
        isCustom: false,
        updatedAt: new Date().toISOString(),
      };

      if (!mapLocSnap.empty) {
        const mapLocRef = doc(db, 'mapLocations', mapLocSnap.docs[0].id);
        await updateDoc(mapLocRef, mapLocationData);
      } else {
        await addDoc(collection(db, 'mapLocations'), {
          ...mapLocationData,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error updating map location:', error);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return false;
    }
    if (!formData.content.trim()) {
      toast.error('Please enter some content');
      return false;
    }
    if (!formData.location.trim()) {
      toast.error('Please enter a location');
      return false;
    }
    if (!locationSelected && formData.coordinates.lat === 0 && formData.coordinates.lng === 0) {
      toast.error('Please select a location on the map');
      return false;
    }
    return true;
  };

  const handleUpdate = async (isDraft = false) => {
    if (!user || !entry) {
      toast.error('Unable to update entry');
      return;
    }

    if (!validateForm() && !isDraft) return;

    setIsLoading(true);
    try {
      const newMediaUrls = await uploadImages(newImages);
      const finalMediaUrls = [...existingImages, ...newMediaUrls];
      await deleteRemovedImages(removedImageUrls);
      const updatedEntryData: Partial<Entry> = {
        title: formData.title,
        content: formData.content,
        timestamp: formData.timestamp,
        location: formData.location,
        country: formData.country,
        coordinates: formData.coordinates,
        mediaUrls: finalMediaUrls,
        tags: formData.tags,
        type: formData.type,
        isDraft,
        updatedAt: new Date().toISOString(),
      };

      const entryRef = doc(db, 'entries', entry.id);
      await updateDoc(entryRef, updatedEntryData);

      const updatedEntry: Entry = {
        ...entry,
        ...updatedEntryData,
      } as Entry;

      await updateMapLocation(entry.id, updatedEntry);

      await updateUserStats(updatedEntry, entry);

      if (!isDraft) {
        const timelineQuery = query(collection(db, 'timelineEvents'), where('id', '==', entry.id));
        const timelineSnap = await getDocs(timelineQuery);

        const timelineData = {
          title: formData.title,
          timestamp: formData.timestamp,
          location: formData.location,
          country: formData.country,
          type: formData.type,
          updatedAt: new Date().toISOString(),
        };

        if (!timelineSnap.empty) {
          const timelineRef = doc(db, 'timelineEvents', timelineSnap.docs[0].id);
          await updateDoc(timelineRef, timelineData);
        } else {
          await addDoc(collection(db, 'timelineEvents'), {
            ...timelineData,
            id: entry.id,
            uid: user.uid,
            createdAt: entry.createdAt,
            tripId: entry.tripId,
            dayLogId: entry.dayLogId,
          });
        }
      }

      toast.success(isDraft ? 'Entry saved as draft!' : 'Entry updated successfully!');

      if (entry.tripId) {
        router.push(`/trip/${entry.tripId}`);
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error updating entry:', error);
      toast.error('Failed to update entry. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!entry) return;

    setIsDeleting(true);
    try {
      const allImages = [...existingImages, ...removedImageUrls];
      await deleteRemovedImages(allImages);
      await deleteDoc(doc(db, 'entries', entry.id));

      toast.success('Entry deleted successfully');
      router.push('/dashboard');
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Failed to delete entry');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'journal':
        return <BookOpen className="h-4 w-4" />;
      case 'photo':
        return <Camera className="h-4 w-4" />;
      case 'map':
        return <Map className="h-4 w-4" />;
      case 'artifact':
        return <Archive className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  React.useEffect(() => {
    return () => {
      newImagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [newImagePreviewUrls]);

  React.useEffect(() => {
    const loadAssociatedData = async () => {
      if (!entry) return;

      try {
        if (entry.tripId) {
          const tripRef = doc(db, 'trips', entry.tripId);
          const tripSnap = await getDoc(tripRef);
          if (tripSnap.exists()) {
            setAssociatedTrip({ id: tripSnap.id, ...tripSnap.data() } as Trip);
          }
        }

        if (entry.dayLogId) {
          const dayLogRef = doc(db, 'dayLogs', entry.dayLogId);
          const dayLogSnap = await getDoc(dayLogRef);
          if (dayLogSnap.exists()) {
            setAssociatedDayLog({ id: dayLogSnap.id, ...dayLogSnap.data() } as DayLog);
          }
        }
      } catch (error) {
        console.error('Error loading associated data:', error);
      }
    };

    loadAssociatedData();
  }, [entry]);

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
    );
  }

  if (!entry) {
    return (
      <div className="min-h-screen flex flex-col parchment-texture">
        <Navbar />
        <main className="flex-1 pt-24 pb-16 flex items-center justify-center">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold text-deepbrown mb-4">Entry Not Found</h2>
            <p className="text-deepbrown/70 mb-6">
              The entry you're looking for doesn't exist or you don't have permission to edit it.
            </p>
            <Button onClick={() => router.push('/dashboard')} className="bg-gold hover:bg-gold/90">
              Back to Dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col parchment-texture">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.back()}
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
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
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

            {(associatedTrip || associatedDayLog) && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-lg text-blue-800 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Association
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {associatedTrip && (
                    <div className="mb-2">
                      <span className="font-medium text-blue-700">Trip:</span> {associatedTrip.name}
                    </div>
                  )}
                  {associatedDayLog && (
                    <div>
                      <span className="font-medium text-blue-700">Day Log:</span>{' '}
                      {associatedDayLog.location} ({associatedDayLog.date})
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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
                {existingImages.length > 0 || newImagePreviewUrls.length > 0 ? (
                  <div className="space-y-6">
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
                    locations={
                      locationSelected
                        ? [
                            {
                              id: 'current',
                              name: formData.location || 'Selected Location',
                              lat: formData.coordinates.lat,
                              lng: formData.coordinates.lng,
                              type: 'visited',
                            },
                          ]
                        : []
                    }
                    onLocationSelect={handleLocationSelect}
                    interactive={true}
                    center={locationSelected ? formData.coordinates : undefined}
                    zoom={locationSelected ? 10 : 2}
                  />
                </div>
                {locationSelected && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      ✓ Location set: {formData.coordinates.lat.toFixed(6)},{' '}
                      {formData.coordinates.lng.toFixed(6)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

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
                  onClick={() => router.back()}
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
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
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

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{formData.title}"? This action cannot be undone and
              will permanently remove the entry and all associated photos.
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
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
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
  );
}
