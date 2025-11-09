'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Save, ImageIcon, Calendar, X, Plus, Tag, Plane, User, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
import { storage } from '@/lib/firebase';
import { useAuth } from '@/context/useAuth';
import { tripService } from '@/services/tripService';
import { type CreateTripData } from '@/lib/types';
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

export default function NewTripPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [formData, setFormData] = React.useState<FormData>({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'draft',
    tags: [],
    companions: [],
  });

  const [coverImage, setCoverImage] = React.useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = React.useState<string>('');
  const [currentTag, setCurrentTag] = React.useState('');
  const [currentCompanion, setCurrentCompanion] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (field === 'startDate' && value) {
      if (!formData.endDate || new Date(formData.endDate) < new Date(value)) {
        setFormData((prev) => ({ ...prev, endDate: value }));
      }
    }
  };

  const handleAddCoverImage = (event: React.ChangeEvent<HTMLInputElement>) => {
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

    setCoverImage(file);
    setCoverImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveCoverImage = () => {
    if (coverImagePreview) {
      URL.revokeObjectURL(coverImagePreview);
    }
    setCoverImage(null);
    setCoverImagePreview('');
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

  const handleSave = async (isDraft = false) => {
    if (!user) {
      toast.error('You must be logged in to create a trip');
      return;
    }

    if (!validateForm() && !isDraft) return;

    setIsLoading(true);
    try {
      let coverImageUrl = '';
      if (coverImage) {
        coverImageUrl = await uploadCoverImage(coverImage);
      }

      const tripData: CreateTripData = {
        name: formData.name,
        description: formData.description,
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: isDraft ? 'draft' : formData.status,
        tags: formData.tags,
        coverImageUrl,
      };

      const tripId = await tripService.createTrip(user.uid, tripData);

      toast.success(isDraft ? 'Trip saved as draft!' : 'Trip created successfully!');
      router.push(`/trip/${tripId}`);
    } catch (error) {
      console.error('Error creating trip:', error);
      toast.error('Failed to create trip. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    return () => {
      if (coverImagePreview) {
        URL.revokeObjectURL(coverImagePreview);
      }
    };
  }, [coverImagePreview]);

  return (
    <div className="min-h-screen flex flex-col parchment-texture">
      <Navbar />

      <main className="flex-1 pt-14 sm:pt-20 lg:pt-24 pb-6 sm:pb-12 lg:pb-16">
        <div className="container max-w-4xl mx-auto px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-5 sm:mb-8">
            <div>
              <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-deepbrown">
                Create New Trip
              </h1>
              <p className="text-xs sm:text-sm lg:text-base text-deepbrown/70 mt-1 sm:mt-1.5">
                Plan and organize your next adventure
              </p>
            </div>
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                className="border-gold/30 bg-transparent text-sm sm:text-base flex-1 sm:flex-none"
                onClick={() => handleSave(true)}
                disabled={isLoading}
              >
                Save as Draft
              </Button>
              <AnimatedButton
                animationType="wax-stamp"
                onClick={() => handleSave(false)}
                disabled={isLoading}
                className="min-w-[120px] sm:min-w-[140px] text-sm sm:text-base flex-1 sm:flex-none"
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
                    <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </motion.div>
                ) : (
                  <>
                    <Save className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Create Trip
                  </>
                )}
              </AnimatedButton>
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6 lg:space-y-8">
            <Card className="border-gold/20 bg-parchment-light">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg lg:text-xl text-deepbrown flex items-center gap-1.5 sm:gap-2">
                  <Plane className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                  Trip Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm sm:text-base">
                    Trip Name *
                  </Label>
                  <Input
                    id="name"
                    placeholder="Enter your trip name (e.g., 'European Adventure 2024')"
                    className="bg-parchment border-gold/30 text-sm sm:text-base"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm sm:text-base">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your trip plans, goals, or what makes this adventure special..."
                    className="min-h-[100px] bg-parchment border-gold/30 resize-none text-sm sm:text-base"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate" className="text-sm sm:text-base">
                      Start Date *
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-deepbrown/50" />
                      <Input
                        id="startDate"
                        type="date"
                        className="pl-9 bg-parchment border-gold/30 text-sm sm:text-base"
                        value={formData.startDate}
                        onChange={(e) => handleInputChange('startDate', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate" className="text-sm sm:text-base">
                      End Date
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-deepbrown/50" />
                      <Input
                        id="endDate"
                        type="date"
                        className="pl-9 bg-parchment border-gold/30 text-sm sm:text-base"
                        value={formData.endDate}
                        onChange={(e) => handleInputChange('endDate', e.target.value)}
                        min={formData.startDate}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-sm sm:text-base">
                      Status
                    </Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: any) => handleInputChange('status', value)}
                    >
                      <SelectTrigger className="bg-parchment border-gold/30 w-full text-sm sm:text-base">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="bg-parchment border-gold/30 shadow-lg">
                        <SelectItem value="draft" className="text-sm sm:text-base">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-gray-500" />
                            Draft
                          </div>
                        </SelectItem>
                        <SelectItem value="planned" className="text-sm sm:text-base">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-yellow-500" />
                            Planned
                          </div>
                        </SelectItem>
                        <SelectItem value="active" className="text-sm sm:text-base">
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
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg lg:text-xl text-deepbrown">
                  Cover Photo
                </CardTitle>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAddCoverImage}
                    className="hidden"
                    id="cover-upload"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gold/30 bg-transparent text-sm sm:text-base w-full sm:w-auto"
                    onClick={() => document.getElementById('cover-upload')?.click()}
                  >
                    <ImageIcon className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {coverImage ? 'Change Photo' : 'Add Cover Photo'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {coverImagePreview ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="relative group"
                  >
                    <img
                      src={coverImagePreview}
                      alt="Trip cover"
                      className="w-full h-40 sm:h-48 lg:h-64 object-cover rounded-lg border border-gold/20"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 sm:h-8 sm:w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={handleRemoveCoverImage}
                    >
                      <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </motion.div>
                ) : (
                  <div className="border-2 border-dashed border-gold/30 rounded-lg p-6 sm:p-8 text-center">
                    <ImageIcon className="h-10 w-10 sm:h-12 sm:w-12 text-gold/50 mx-auto mb-3 sm:mb-4" />
                    <p className="text-sm sm:text-base text-deepbrown/70 mb-2">
                      No cover photo added yet
                    </p>
                    <p className="text-xs sm:text-sm text-deepbrown/50">
                      Add a beautiful cover photo to represent your trip
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-gold/20 bg-parchment-light">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg lg:text-xl text-deepbrown flex items-center gap-1.5 sm:gap-2">
                  <Tag className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Add a tag (e.g., adventure, culture, family)"
                    className="bg-parchment border-gold/30 text-sm sm:text-base flex-1"
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                  <Button
                    variant="outline"
                    onClick={handleAddTag}
                    className="border-gold/30 bg-transparent text-sm sm:text-base w-full sm:w-auto"
                  >
                    <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="ml-2">Add Tag</span>
                  </Button>
                </div>

                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {formData.tags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="bg-gold/10 text-deepbrown border border-gold/30 text-xs sm:text-sm py-1 px-2"
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
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg lg:text-xl text-deepbrown flex items-center gap-1.5 sm:gap-2">
                  <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                  Travel Companions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Add a travel companion name"
                    className="bg-parchment border-gold/30 text-sm sm:text-base flex-1"
                    value={currentCompanion}
                    onChange={(e) => setCurrentCompanion(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCompanion()}
                  />
                  <Button
                    variant="outline"
                    onClick={handleAddCompanion}
                    className="border-gold/30 bg-transparent text-sm sm:text-base w-full sm:w-auto"
                  >
                    <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="ml-2">Add Companion</span>
                  </Button>
                </div>

                {formData.companions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {formData.companions.map((companion, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="bg-blue/10 text-deepbrown border border-blue/30 text-xs sm:text-sm py-1 px-2"
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

            <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-gold/20">
              <Button
                variant="outline"
                className="border-gold/30 bg-transparent"
                onClick={() => router.push('/dashboard')}
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
                    Create Trip
                  </>
                )}
              </AnimatedButton>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
