'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Calendar,
  MapPin,
  Edit3,
  Heart,
  Share2,
  ArrowLeft,
  Loader2,
  BookOpen,
  Camera,
  Map,
  Archive,
  Plane,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapViewer } from '@/components/map/MapViewer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/context/useAuth';
import { entryService } from '@/services/entryService';
import { tripService } from '@/services/tripService';
import { type Entry, type Trip } from '@/lib/types';
import { toast } from 'sonner';

export default function EntryDisplayPage() {
  const navigate = useNavigate();
  const params = useParams();
  const { user } = useAuth();
  const entryId = params?.id as string;

  const [entry, setEntry] = React.useState<Entry | null>(null);
  const [trip, setTrip] = React.useState<Trip | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isTogglingFavorite, setIsTogglingFavorite] = React.useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = React.useState<number | null>(null);

  const loadEntryData = React.useCallback(async () => {
    if (!entryId) return;

    try {
      setIsLoading(true);
      const entryData = await entryService.getEntry(entryId);

      if (!entryData) {
        toast.error('Entry not found');
        navigate('/dashboard');
        return;
      }

      setEntry(entryData);

      if (entryData.tripId) {
        try {
          const tripData = await tripService.getTrip(entryData.tripId);
          setTrip(tripData);
        } catch (error) {
          console.warn('Failed to load trip data:', error);
        }
      }
    } catch (error) {
      console.error('Error loading entry:', error);
      toast.error('Failed to load entry');
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [entryId, navigate]);

  React.useEffect(() => {
    loadEntryData();
  }, [loadEntryData]);

  const handleFavoriteToggle = async () => {
    if (!entry || isTogglingFavorite) return;

    setIsTogglingFavorite(true);
    try {
      await entryService.toggleFavorite(entry.id);
      setEntry((prev) => (prev ? { ...prev, isFavorite: !prev.isFavorite } : null));
      toast.success(entry.isFavorite ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  const getEntryIcon = (type: string) => {
    switch (type) {
      case 'journal':
        return <BookOpen className="h-5 w-5" />;
      case 'photo':
        return <Camera className="h-5 w-5" />;
      case 'map':
        return <Map className="h-5 w-5" />;
      case 'artifact':
        return <Archive className="h-5 w-5" />;
      default:
        return <BookOpen className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'journal':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'photo':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'map':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'artifact':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
  };

  const handlePreviousImage = () => {
    if (selectedImageIndex === null || !entry?.mediaUrls) return;
    setSelectedImageIndex(
      selectedImageIndex > 0 ? selectedImageIndex - 1 : entry.mediaUrls.length - 1
    );
  };

  const handleNextImage = () => {
    if (selectedImageIndex === null || !entry?.mediaUrls) return;
    setSelectedImageIndex(
      selectedImageIndex < entry.mediaUrls.length - 1 ? selectedImageIndex + 1 : 0
    );
  };

  const handleKeyDown = React.useCallback(
    (e: KeyboardEvent) => {
      if (selectedImageIndex === null) return;

      switch (e.key) {
        case 'ArrowLeft':
          handlePreviousImage();
          break;
        case 'ArrowRight':
          handleNextImage();
          break;
        case 'Escape':
          setSelectedImageIndex(null);
          break;
      }
    },
    [selectedImageIndex]
  );

  React.useEffect(() => {
    if (selectedImageIndex !== null) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedImageIndex, handleKeyDown]);

  if (isLoading) {
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
              The entry you're looking for doesn't exist or may have been removed.
            </p>
            <Button onClick={() => navigate('/dashboard')} className="bg-gold hover:bg-gold/90">
              Back to Dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const isOwner = user && user.uid === entry.uid;

  return (
    <div className="min-h-screen flex flex-col parchment-texture">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate(-1)}
                className="border-gold/30 bg-transparent"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="font-display text-3xl font-bold text-deepbrown">{entry.title}</h1>
                  <Badge className={getTypeColor(entry.type)}>
                    <span className="mr-1">{getEntryIcon(entry.type)}</span>
                    {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                  </Badge>
                  {entry.isDraft && (
                    <Badge
                      variant="secondary"
                      className="bg-yellow-100 text-yellow-800 border-yellow-200"
                    >
                      Draft
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-deepbrown/70">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gold" />
                    <span>
                      {entry.location}, {entry.country}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gold" />
                    <span>{format(new Date(entry.timestamp), 'EEEE, MMMM d, yyyy')}</span>
                  </div>
                  {trip && (
                    <div className="flex items-center gap-2">
                      <Plane className="h-4 w-4 text-gold" />
                      <button
                        onClick={() => navigate(`/trip/${trip.id}`)}
                        className="text-gold hover:text-gold/80 font-medium hover:underline"
                      >
                        {trip.name}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleFavoriteToggle}
                  disabled={isTogglingFavorite}
                  className="border-gold/30 bg-transparent"
                >
                  <Heart
                    className={`h-4 w-4 ${entry.isFavorite ? 'fill-red-500 text-red-500' : 'text-deepbrown'}`}
                  />
                </Button>
                <Button variant="outline" size="icon" className="border-gold/30 bg-transparent">
                  <Share2 className="h-4 w-4" />
                </Button>
                {isOwner && (
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/entry/edit/${entry.id}`)}
                    className="border-gold/30 bg-transparent"
                  >
                    <Edit3 className="mr-2 h-4 w-4" />
                    Edit Entry
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
            <div className="space-y-8">
              <Card className="border-gold/20 bg-parchment-light">
                <CardContent className="p-8">
                  <div className="prose prose-lg max-w-none">
                    <div className="text-deepbrown/80 leading-relaxed whitespace-pre-wrap">
                      {entry.content}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {entry.mediaUrls && entry.mediaUrls.length > 0 && (
                <Card className="border-gold/20 bg-parchment-light">
                  <CardHeader>
                    <CardTitle className="text-xl text-deepbrown flex items-center gap-2">
                      <Camera className="h-5 w-5" />
                      Photos ({entry.mediaUrls.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {entry.mediaUrls.map((url, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{
                            duration: 0.3,
                            delay: index * 0.1,
                          }}
                          className="relative group cursor-pointer"
                          onClick={() => handleImageClick(index)}
                        >
                          <img
                            src={url}
                            alt={`${entry.title} - Photo ${index + 1}`}
                            className="w-full h-48 object-cover rounded-lg border border-gold/20 transition-transform duration-200 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 rounded-lg flex items-center justify-center">
                            <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {(entry.coordinates.lat !== 0 || entry.coordinates.lng !== 0) && (
                <Card className="border-gold/20 bg-parchment-light">
                  <CardHeader>
                    <CardTitle className="text-xl text-deepbrown flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 rounded-lg overflow-hidden">
                      <MapViewer
                        locations={[
                          {
                            id: entry.id,
                            name: entry.location,
                            lat: entry.coordinates.lat,
                            lng: entry.coordinates.lng,
                            type: 'visited',
                          },
                        ]}
                        center={entry.coordinates}
                        zoom={12}
                        interactive={false}
                      />
                    </div>
                    <div className="mt-4 text-sm text-deepbrown/70">
                      <p>
                        Coordinates: {entry.coordinates.lat.toFixed(6)},{' '}
                        {entry.coordinates.lng.toFixed(6)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              <Card className="border-gold/20 bg-parchment-light">
                <CardHeader>
                  <CardTitle className="text-lg text-deepbrown">Entry Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-deepbrown/70">Type</span>
                    <Badge className={getTypeColor(entry.type)} variant="outline">
                      {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-deepbrown/70">Date</span>
                    <span className="font-medium">
                      {format(new Date(entry.timestamp), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-deepbrown/70">Location</span>
                    <span className="font-medium text-right">{entry.location}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-deepbrown/70">Country</span>
                    <span className="font-medium">{entry.country}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-deepbrown/70">Photos</span>
                    <span className="font-medium">{entry.mediaUrls?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-deepbrown/70">Status</span>
                    <Badge variant={entry.isDraft ? 'secondary' : 'default'}>
                      {entry.isDraft ? 'Draft' : 'Published'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {trip && (
                <Card className="border-gold/20 bg-parchment-light">
                  <CardHeader>
                    <CardTitle className="text-lg text-deepbrown flex items-center gap-2">
                      <Plane className="h-5 w-5" />
                      Trip Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <button
                          onClick={() => navigate(`/trip/${trip.id}`)}
                          className="font-display text-lg font-medium text-gold hover:text-gold/80 hover:underline"
                        >
                          {trip.name}
                        </button>
                        {trip.description && (
                          <p className="text-sm text-deepbrown/70 mt-1 line-clamp-2">
                            {trip.description}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-deepbrown/70">Status</span>
                          <Badge variant="outline" className="text-xs">
                            {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                          </Badge>
                        </div>
                        {trip.startDate && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-deepbrown/70">Trip Dates</span>
                            <span className="font-medium text-right">
                              {format(new Date(trip.startDate), 'MMM d')}
                              {trip.endDate && trip.endDate !== trip.startDate && (
                                <> - {format(new Date(trip.endDate), 'MMM d, yyyy')}</>
                              )}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-deepbrown/70">Total Entries</span>
                          <span className="font-medium">{trip.totalEntries}</span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-gold/30 bg-transparent mt-3"
                        onClick={() => navigate(`/trip/${trip.id}`)}
                      >
                        View Full Trip
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {entry.tags && entry.tags.length > 0 && (
                <Card className="border-gold/20 bg-parchment-light">
                  <CardHeader>
                    <CardTitle className="text-lg text-deepbrown">Tags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {entry.tags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="bg-gold/10 text-deepbrown border border-gold/30"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {isOwner && (
                <Card className="border-gold/20 bg-parchment-light">
                  <CardHeader>
                    <CardTitle className="text-lg text-deepbrown">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start border-gold/30 bg-transparent"
                      onClick={() => navigate(`/entry/edit/${entry.id}`)}
                    >
                      <Edit3 className="mr-2 h-4 w-4" />
                      Edit Entry
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start border-gold/30 bg-transparent"
                      onClick={handleFavoriteToggle}
                      disabled={isTogglingFavorite}
                    >
                      <Heart className="mr-2 h-4 w-4" />
                      {entry.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                    </Button>
                    {trip && (
                      <Button
                        variant="outline"
                        className="w-full justify-start border-gold/30 bg-transparent"
                        onClick={() => navigate(`/trip/${trip.id}`)}
                      >
                        <Plane className="mr-2 h-4 w-4" />
                        View Trip
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="w-full justify-start border-gold/30 bg-transparent"
                      onClick={() => navigate('/map')}
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      View on Map
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Card className="border-gold/20 bg-parchment-light">
                <CardHeader>
                  <CardTitle className="text-lg text-deepbrown">Entry Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <span className="text-deepbrown/70">Created:</span>
                    <span className="ml-2 font-medium">
                      {format(new Date(entry.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                  {entry.updatedAt && entry.updatedAt !== entry.createdAt && (
                    <div className="text-sm">
                      <span className="text-deepbrown/70">Last updated:</span>
                      <span className="ml-2 font-medium">
                        {format(new Date(entry.updatedAt), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                  )}
                  <div className="text-sm">
                    <span className="text-deepbrown/70">Word count:</span>
                    <span className="ml-2 font-medium">
                      {entry.content.trim().split(/\s+/).length} words
                    </span>
                  </div>
                  {entry.coordinates.lat !== 0 ||
                    (entry.coordinates.lng !== 0 && (
                      <div className="text-sm">
                        <span className="text-deepbrown/70">Coordinates:</span>
                        <span className="ml-2 font-medium text-xs">
                          {entry.coordinates.lat.toFixed(4)}, {entry.coordinates.lng.toFixed(4)}
                        </span>
                      </div>
                    ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Dialog open={selectedImageIndex !== null} onOpenChange={() => setSelectedImageIndex(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-transparent border-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Image Gallery</DialogTitle>
          </DialogHeader>
          {selectedImageIndex !== null && entry?.mediaUrls && (
            <div className="relative">
              <img
                src={entry.mediaUrls[selectedImageIndex]}
                alt={`${entry.title} - Photo ${selectedImageIndex + 1}`}
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              />

              <Button
                variant="outline"
                size="icon"
                className="absolute top-4 right-4 bg-black/50 border-white/20 text-white hover:bg-black/70"
                onClick={() => setSelectedImageIndex(null)}
              >
                <X className="h-4 w-4" />
              </Button>

              {entry.mediaUrls.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 border-white/20 text-white hover:bg-black/70"
                    onClick={handlePreviousImage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 border-white/20 text-white hover:bg-black/70"
                    onClick={handleNextImage}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}

              {entry.mediaUrls.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                  {selectedImageIndex + 1} / {entry.mediaUrls.length}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
