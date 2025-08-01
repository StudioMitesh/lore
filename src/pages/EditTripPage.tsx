'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  Save,
  ImageIcon,
  Calendar,
  X,
  Plus,
  Tag,
  ArrowLeft,
  Loader2,
  Trash2,
  Plane,
  Users,
  User,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AnimatedButton } from '@/components/ui/animated-button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { storage } from '@/api/firebase';
import { useAuth } from '@/context/useAuth';
import { tripService } from '@/services/tripService';
import { type Trip, type CreateTripData } from '@/lib/types';
import { toast } from 'sonner';

interface FormData {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'planned' | 'active' | 'completed';
  tags: string[];
  companions: string[];
}

export default function EditTripPage() {
  const navigate = useNavigate();
  const params = useParams();
  const { user } = useAuth();
  const tripId = params?.id as string;

  const [trip, setTrip] = React.useState<Trip | null>(null);
  const [formData, setFormData] = React.useState<FormData>({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'draft',
    tags: [],
    companions: [],
  });

  const [existingCoverImage, setExistingCoverImage] = React.useState<string>('');
  const [newCoverImage, setNewCoverImage] = React.useState<File | null>(null);
  const [newCoverImagePreview, setNewCoverImagePreview] = React.useState<string>('');
  const [removedCoverImage, setRemovedCoverImage] = React.useState<boolean>(false);
  const [currentTag, setCurrentTag] = React.useState('');
  const [currentCompanion, setCurrentCompanion] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    const loadTrip = async () => {
      if (!tripId || !user) return;

      try {
        setIsInitialLoading(true);
        const tripData = await tripService.getTrip(tripId);

        if (!tripData) {
          toast.error('Trip not found');
          navigate('/dashboard');
          return;
        }

        if (tripData.uid !== user.uid) {
          toast.error("You don't have permission to edit this trip");
          navigate('/dashboard');
          return;
        }

        setTrip(tripData);
        setFormData({
          name: tripData.name,
          description: tripData.description || '',
          startDate: tripData.startDate || '',
          endDate: tripData.endDate || '',
          status: tripData.status,
          tags: tripData.tags || [],
          companions: tripData.companions || [],
        });

        setExistingCoverImage(tripData.coverImageUrl || '');
      } catch (error) {
        console.error('Error loading trip:', error);
        toast.error('Failed to load trip');
        navigate('/dashboard');
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadTrip();
  }, [tripId, user, navigate]);

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (field === 'startDate' && value) {
      if (!formData.endDate || new Date(formData.endDate) < new Date(value)) {
        setFormData((prev) => ({ ...prev, endDate: value }));
      }
    }
  };

  const handleAddNewCoverImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isValidType = file.type.startsWith('image/');
    const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit

    if (!isValidType) {
      toast.error('Please select a valid image file');
      return;
    }
    if (!isValidSize) {
      toast.error('Image is too large (max 10MB)');
      return;
    }

    setNewCoverImage(file);
    setNewCoverImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveExistingCoverImage = () => {
    setExistingCoverImage('');
    setRemovedCoverImage(true);
  };

  const handleRemoveNewCoverImage = () => {
    if (newCoverImagePreview) {
      URL.revokeObjectURL(newCoverImagePreview);
    }
    setNewCoverImage(null);
    setNewCoverImagePreview('');
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

  const handleAddCompanion = () => {
    if (currentCompanion.trim() && !formData.companions.includes(currentCompanion.trim())) {
      handleInputChange('companions', [...formData.companions, currentCompanion.trim()]);
      setCurrentCompanion('');
    }
  };

  const handleRemoveCompanion = (companionToRemove: string) => {
    handleInputChange(
      'companions',
      formData.companions.filter((companion) => companion !== companionToRemove)
    );
  };

  const uploadCoverImage = async (image: File): Promise<string> => {
    const imageRef = ref(storage, `trips/${user!.uid}/${Date.now()}_${image.name}`);
    await uploadBytes(imageRef, image);
    return await getDownloadURL(imageRef);
  };

  const deleteRemovedCoverImage = async (imageUrl: string) => {
    try {
      const imageRef = ref(storage, imageUrl);
      await deleteObject(imageRef);
    } catch (error) {
      console.warn('Failed to delete cover image:', imageUrl, error);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error('Please enter a trip name');
      return false;
    }
    if (!formData.startDate) {
      toast.error('Please select a start date');
      return false;
    }
    if (formData.endDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      toast.error('End date cannot be before start date');
      return false;
    }
    return true;
  };

  const handleUpdate = async (isDraft = false) => {
    if (!user || !trip) {
      toast.error('Unable to update trip');
      return;
    }

    if (!validateForm() && !isDraft) return;

    setIsLoading(true);
    try {
      let finalCoverImageUrl = existingCoverImage;

      if (newCoverImage) {
        finalCoverImageUrl = await uploadCoverImage(newCoverImage);
      }

      if (removedCoverImage && existingCoverImage) {
        await deleteRemovedCoverImage(existingCoverImage);
        if (!newCoverImage) {
          finalCoverImageUrl = '';
        }
      }

      const updatedTripData: Partial<CreateTripData> = {
        name: formData.name,
        description: formData.description,
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: isDraft ? 'draft' : formData.status,
        tags: formData.tags,
        coverImageUrl: finalCoverImageUrl,
      };

      await tripService.updateTrip(trip.id, updatedTripData);

      toast.success(isDraft ? 'Trip saved as draft!' : 'Trip updated successfully!');
      navigate(`/trip/${trip.id}`);
    } catch (error) {
      console.error('Error updating trip:', error);
      toast.error('Failed to update trip. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!trip) return;

    setIsDeleting(true);
    try {
      if (existingCoverImage) {
        await deleteRemovedCoverImage(existingCoverImage);
      }

      await tripService.deleteTrip(trip.id);

      toast.success('Trip deleted successfully');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error deleting trip:', error);
      toast.error('Failed to delete trip');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  React.useEffect(() => {
    return () => {
      if (newCoverImagePreview) {
        URL.revokeObjectURL(newCoverImagePreview);
      }
    };
  }, [newCoverImagePreview]);

  if (isInitialLoading) {
    return (
      <div className="min-h-screen flex flex-col parchment-texture">
        <Navbar />
        <main className="flex-1 pt-24 pb-16 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-gold mx-auto mb-4" />
            <p className="text-deepbrown/70">Loading trip...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex flex-col parchment-texture">
        <Navbar />
        <main className="flex-1 pt-24 pb-16 flex items-center justify-center">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold text-deepbrown mb-4">Trip Not Found</h2>
            <p className="text-deepbrown/70 mb-6">
              The trip you're looking for doesn't exist or you don't have permission to edit it.
            </p>
            <Button onClick={() => navigate('/dashboard')} className="bg-gold hover:bg-gold/90">
              Back to Dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const currentCoverImage =
    newCoverImagePreview || (existingCoverImage && !removedCoverImage ? existingCoverImage : '');

  return (
    <div className="min-h-screen flex flex-col parchment-texture">
      <Navbar />

      <main className="flex-1 pt-20 sm:pt-24 pb-12 sm:pb-16">
        <div className="container max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-start sm:items-center gap-3 sm:gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate(-1)}
                className="border-gold/30 bg-transparent mt-1 sm:mt-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-deepbrown">
                  Edit Trip
                </h1>
                <p className="text-sm sm:text-base text-deepbrown/70 mt-1">
                  Update your adventure details
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-0">
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
                    Update Trip
                  </>
                )}
              </AnimatedButton>
            </div>
          </div>

          <div className="space-y-8">
            <Card className="border-gold/20 bg-parchment-light">
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl text-deepbrown flex items-center gap-2">
                  <Plane className="h-4 sm:h-5 w-4 sm:w-5" />
                  Trip Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Trip Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter your trip name"
                    className="bg-parchment border-gold/30"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your trip plans, goals, or what makes this adventure special..."
                    className="min-h-[100px] bg-parchment border-gold/30 resize-none text-sm sm:text-base"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date *</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-deepbrown/50" />
                      <Input
                        id="startDate"
                        type="date"
                        className="pl-9 bg-parchment border-gold/30"
                        value={formData.startDate}
                        onChange={(e) => handleInputChange('startDate', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-deepbrown/50" />
                      <Input
                        id="endDate"
                        type="date"
                        className="pl-9 bg-parchment border-gold/30"
                        value={formData.endDate}
                        onChange={(e) => handleInputChange('endDate', e.target.value)}
                        min={formData.startDate}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: any) => handleInputChange('status', value)}
                    >
                      <SelectTrigger className="bg-parchment border-gold/30 w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="bg-parchment border-gold/30 shadow-lg">
                        <SelectItem value="draft">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-gray-500" />
                            Draft
                          </div>
                        </SelectItem>
                        <SelectItem value="planned">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-yellow-500" />
                            Planned
                          </div>
                        </SelectItem>
                        <SelectItem value="active">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            Active
                          </div>
                        </SelectItem>
                        <SelectItem value="completed">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            Completed
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-gold/20 bg-parchment-light">
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                <CardTitle className="text-lg sm:text-xl text-deepbrown">Cover Photo</CardTitle>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAddNewCoverImage}
                    className="hidden"
                    id="cover-upload"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gold/30 bg-transparent"
                    onClick={() => document.getElementById('cover-upload')?.click()}
                  >
                    <ImageIcon className="mr-2 h-4 w-4" />
                    {currentCoverImage ? 'Change Photo' : 'Add Cover Photo'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {currentCoverImage ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="relative group"
                  >
                    <img
                      src={currentCoverImage}
                      alt="Trip cover"
                      className="w-full h-64 object-cover rounded-lg border border-gold/20"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={
                        newCoverImagePreview
                          ? handleRemoveNewCoverImage
                          : handleRemoveExistingCoverImage
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    {newCoverImagePreview && (
                      <div className="absolute bottom-2 left-2 bg-green-600/80 text-white px-2 py-1 rounded text-xs">
                        New
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <div className="border-2 border-dashed border-gold/30 rounded-lg p-8 text-center">
                    <ImageIcon className="h-12 w-12 text-gold/50 mx-auto mb-4" />
                    <p className="text-deepbrown/70 mb-2">No cover photo added yet</p>
                    <p className="text-sm text-deepbrown/50">
                      Add a beautiful cover photo to represent your trip
                    </p>
                  </div>
                )}
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
                    placeholder="Add a tag (e.g., adventure, culture, family)"
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
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl text-deepbrown flex items-center gap-2">
                  <Users className="h-4 sm:h-5 w-4 sm:w-5" />
                  Travel Companions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a travel companion name"
                    className="bg-parchment border-gold/30"
                    value={currentCompanion}
                    onChange={(e) => setCurrentCompanion(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCompanion()}
                  />
                  <Button
                    variant="outline"
                    onClick={handleAddCompanion}
                    className="border-gold/30 bg-transparent"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {formData.companions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.companions.map((companion, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="bg-blue/10 text-deepbrown border border-blue/30"
                      >
                        <User className="h-3 w-3 mr-1" />
                        {companion}
                        <button
                          onClick={() => handleRemoveCompanion(companion)}
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

            <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6 border-t border-gold/20">
              <Button
                variant="outline"
                className="border-red-300 bg-transparent text-red-600 hover:bg-red-50 sm:w-auto"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isLoading || isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Trip
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
                      Update Trip
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
            <DialogTitle>Delete Trip</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{formData.name}"? This action cannot be undone and
              will permanently remove the trip. All entries associated with this trip will become
              standalone entries.
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
              Delete Trip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
