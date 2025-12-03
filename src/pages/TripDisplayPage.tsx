'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Calendar,
  MapPin,
  Users,
  Edit3,
  Heart,
  Share2,
  ArrowLeft,
  Loader2,
  Plane,
  Camera,
  BookOpen,
  Map,
  Archive,
  Plus,
  User,
  Link,
  Search,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnimatedButton } from '@/components/ui/animated-button';
import { EntryCard } from '@/components/ui/entry-card';
import { useAuth } from '@/context/useAuth';
import { tripService } from '@/services/tripService';
import { entryService } from '@/services/entryService';
import { type TripWithDetails, type Entry } from '@/lib/types';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export default function TripDisplayPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const tripId = params?.id as string;

  const [trip, setTrip] = React.useState<TripWithDetails | null>(null);
  const [tripEntries, setTripEntries] = React.useState<Entry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isTogglingFavorite, setIsTogglingFavorite] = React.useState(false);
  const [showAttachModal, setShowAttachModal] = React.useState(false);
  const [availableEntries, setAvailableEntries] = React.useState<Entry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = React.useState<string>('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLoadingEntries, setIsLoadingEntries] = React.useState(false);


  const loadTripData = React.useCallback(async () => {
    if (!tripId) return;

    try {
      setIsLoading(true);
      const [tripData, entries] = await Promise.all([
        tripService.getTripWithDetails(tripId),
        tripService.getTripEntries(tripId),
      ]);

      if (!tripData) {
        toast.error('Trip not found');
        router.push('/dashboard');
        return;
      }

      setTrip(tripData);
      setTripEntries(entries);
    } catch (error) {
      console.error('Error loading trip:', error);
      toast.error('Failed to load trip');
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  const loadAvailableEntries = React.useCallback(async () => {
    if (!user || !tripId) return;

    try {
      setIsLoadingEntries(true);
      const allEntries = await entryService.getUserEntries(user.uid, false);
      const currentTripEntryIds = new Set(tripEntries.map(entry => entry.id));
      
      const available = allEntries.filter(entry => 
        !currentTripEntryIds.has(entry.id) && 
        (entry.tripId !== tripId || entry.isStandalone)
      );

      setAvailableEntries(available);
    } catch (error) {
      console.error('Error loading available entries:', error);
      toast.error('Failed to load available entries');
    } finally {
      setIsLoadingEntries(false);
    }
  }, [user, tripId, tripEntries]);


  React.useEffect(() => {
    loadTripData();
  }, [loadTripData]);

  React.useEffect(() => {
    if (showAttachModal) {
      loadAvailableEntries();
    }
  }, [showAttachModal, loadAvailableEntries]);

  const handleFavoriteToggle = async () => {
    if (!trip || isTogglingFavorite) return;

    setIsTogglingFavorite(true);
    try {
      await tripService.toggleTripFavorite(trip.id);
      setTrip((prev) => (prev ? { ...prev, isFavorite: !prev.isFavorite } : null));
      toast.success(trip.isFavorite ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  const handleEntryFavoriteToggle = async (entryId: string) => {
    try {
      await entryService.toggleFavorite(entryId);
      setTripEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId ? { ...entry, isFavorite: !entry.isFavorite } : entry
        )
      );
      toast.success('Entry updated!');
    } catch (error) {
      console.error('Error toggling entry favorite:', error);
      toast.error('Failed to update entry');
    }
  };

  const handleEntryDelete = () => {
    loadTripData();
  };

  const handleAttachEntry = async () => {
    if (!selectedEntryId || !trip) {
      toast.error('Please select an entry to attach');
      return;
    }

    try {
      await tripService.addEntryToTrip(selectedEntryId, trip.id);
      
      const attachedEntry = availableEntries.find(entry => entry.id === selectedEntryId);
      if (attachedEntry) {
        setTripEntries(prev => [attachedEntry, ...prev]);
        setTrip(prev => prev ? {
          ...prev,
          totalEntries: prev.totalEntries + 1
        } : null);
      }

      setSelectedEntryId('');
      setShowAttachModal(false);
      toast.success('Entry attached to trip!');
    } catch (error) {
      console.error('Error attaching entry to trip:', error);
      toast.error('Failed to attach entry');
    }
  };

  const filteredEntries = React.useMemo(() => {
    if (!searchQuery.trim()) return availableEntries;

    const query = searchQuery.toLowerCase();
    return availableEntries.filter(entry => 
      entry.title.toLowerCase().includes(query) ||
      entry.location.toLowerCase().includes(query) ||
      entry.country.toLowerCase().includes(query) ||
      entry.content.toLowerCase().includes(query) ||
      entry.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  }, [availableEntries, searchQuery]);

  const getEntryIcon = (type: string) => {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'active':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'planned':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'active':
        return '✈️';
      case 'planned':
        return '📅';
      case 'draft':
        return '📝';
      default:
        return '📝';
    }
  };

  const formatDateRange = () => {
    if (!trip?.startDate) return 'Date not set';

    const start = format(new Date(trip.startDate), 'MMM d, yyyy');

    if (!trip.endDate) {
      return `Starting ${start}`;
    }

    const end = format(new Date(trip.endDate), 'MMM d, yyyy');

    if (trip.startDate === trip.endDate) {
      return start;
    }

    return `${start} - ${end}`;
  };

  const calculateDuration = () => {
    if (!trip?.startDate || !trip?.endDate) return null;

    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays === 1 ? '1 day' : `${diffDays} days`;
  };

  if (isLoading) {
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
              The trip you're looking for doesn't exist or may have been removed.
            </p>
            <Button onClick={() => router.push('/dashboard')} className="bg-gold hover:bg-gold/90">
              Back to Dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const isOwner = user && user.uid === trip.uid;

  return (
    <div className="min-h-screen flex flex-col parchment-texture">
      <Navbar />

      <main className="flex-1 pt-16 sm:pt-20 lg:pt-24 pb-8 sm:pb-12 lg:pb-16">
        <div className="container mx-auto px-3 sm:px-6 lg:px-8">
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.back()}
                className="border-gold/30 bg-transparent h-8 w-8 sm:h-9 sm:w-9"
              >
                <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
              <div className="flex-1">
                <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                  <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-deepbrown">
                    {trip.name}
                  </h1>
                  <Badge className={getStatusColor(trip.status)}>
                    <span className="mr-1">{getStatusIcon(trip.status)}</span>
                    {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-deepbrown/70">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gold" />
                    <span>{formatDateRange()}</span>
                    {calculateDuration() && (
                      <>
                        <span>•</span>
                        <span>{calculateDuration()}</span>
                      </>
                    )}
                  </div>
                  {trip.countriesVisited && trip.countriesVisited.length > 0 && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gold" />
                      <span>
                        {trip.countriesVisited.length === 1
                          ? trip.countriesVisited[0]
                          : `${trip.countriesVisited.length} countries`}
                      </span>
                    </div>
                  )}
                  {trip.totalEntries > 0 && (
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-gold" />
                      <span>
                        {trip.totalEntries} {trip.totalEntries === 1 ? 'entry' : 'entries'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5 sm:gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleFavoriteToggle}
                  disabled={isTogglingFavorite}
                  className="border-gold/30 bg-transparent h-8 w-8 sm:h-9 sm:w-9"
                >
                  <Heart
                    className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${trip.isFavorite ? 'fill-red-500 text-red-500' : 'text-deepbrown'}`}
                  />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="border-gold/30 bg-transparent h-8 w-8 sm:h-9 sm:w-9"
                >
                  <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                {isOwner && (
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/edit-trip/${trip.id}`)}
                    className="border-gold/30 bg-transparent"
                  >
                    <Edit3 className="mr-2 h-4 w-4" />
                    Edit Trip
                  </Button>
                )}
              </div>
            </div>

            {trip.coverImageUrl && (
              <div className="relative h-48 sm:h-64 lg:h-80 rounded-xl sm:rounded-2xl overflow-hidden mb-4 sm:mb-6">
                <img
                  src={trip.coverImageUrl}
                  alt={trip.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 sm:gap-8">
            <div className="space-y-8">
              {trip.description && (
                <Card className="border-gold/20 bg-parchment-light">
                  <CardHeader className="pb-3 sm:pb-4">
                    <CardTitle className="text-lg sm:text-xl text-deepbrown">
                      About This Trip
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm sm:text-base">
                    <p className="text-deepbrown/80 leading-relaxed whitespace-pre-wrap">
                      {trip.description}
                    </p>
                  </CardContent>
                </Card>
              )}

              <div>
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h2 className="font-display text-xl sm:text-2xl font-semibold text-deepbrown">
                    Trip Entries
                    {tripEntries.length > 0 && (
                      <span className="text-base sm:text-lg font-normal text-deepbrown/70 ml-1.5 sm:ml-2">
                        ({tripEntries.length})
                      </span>
                    )}
                  </h2>
                  {isOwner && (
                    <div className="flex gap-2">
                      <AnimatedButton 
                        animationType="glow" 
                        onClick={() => setShowAttachModal(true)}
                        variant="outline"
                        className="border-gold/30 bg-transparent"
                      >
                        <Link className="mr-2 h-4 w-4" />
                        Attach Entry
                      </AnimatedButton>
                      <AnimatedButton 
                        animationType="glow" 
                        onClick={() => router.push('/entry/new')}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Entry
                      </AnimatedButton>
                    </div>
                  )}
                </div>

                {tripEntries.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tripEntries.map((entry, index) => (
                      <EntryCard
                        key={entry.id}
                        id={entry.id}
                        title={entry.title}
                        location={`${entry.location}, ${entry.country}`}
                        timestamp={entry.timestamp}
                        excerpt={entry.content.substring(0, 150) + '...'}
                        imageUrl={entry.mediaUrls[0] || '/placeholder.svg?height=400&width=600'}
                        index={index}
                        type={entry.type}
                        isFavorite={entry.isFavorite}
                        isDraft={entry.isDraft}
                        onFavoriteToggle={() => handleEntryFavoriteToggle(entry.id)}
                        onDelete={handleEntryDelete}
                        entryIcon={getEntryIcon(entry.type)}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="border-gold/20 bg-parchment-light">
                    <CardContent className="text-center py-8 sm:py-12">
                      <BookOpen className="h-12 w-12 sm:h-16 sm:w-16 text-gold/50 mx-auto mb-3 sm:mb-4" />
                      <h3 className="font-display text-lg sm:text-xl font-medium text-deepbrown mb-1.5 sm:mb-2">
                        No entries yet
                      </h3>
                      <p className="text-sm sm:text-base text-deepbrown/70 mb-4 sm:mb-6">
                        Start documenting your adventure by adding your first entry
                      </p>
                      {isOwner && (
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <AnimatedButton 
                            animationType="glow" 
                            onClick={() => setShowAttachModal(true)}
                            variant="outline"
                            className="border-gold/30 bg-transparent"
                          >
                            <Link className="mr-2 h-4 w-4" />
                            Attach Existing Entry
                          </AnimatedButton>
                          <AnimatedButton 
                            animationType="glow" 
                            onClick={() => router.push('/entry/new')}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Create New Entry
                          </AnimatedButton>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

<Dialog open={showAttachModal} onOpenChange={setShowAttachModal}>
                  <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle className="text-deepbrown">Attach Existing Entry</DialogTitle>
                      <DialogDescription className="text-deepbrown/70">
                        Select an entry from your existing entries to attach to this trip.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 flex-1 overflow-hidden">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-deepbrown/50" />
                        <Input
                          placeholder="Search entries..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 border-gold/30 focus-visible:ring-gold"
                        />
                      </div>

                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                        {isLoadingEntries ? (
                          <div className="text-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-gold mx-auto mb-2" />
                            <p className="text-sm text-deepbrown/70">Loading entries...</p>
                          </div>
                        ) : filteredEntries.length > 0 ? (
                          filteredEntries.map((entry) => (
                            <div
                              key={entry.id}
                              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                selectedEntryId === entry.id
                                  ? 'border-gold bg-gold/5'
                                  : 'border-gold/20 hover:border-gold/50 hover:bg-parchment-light'
                              }`}
                              onClick={() => setSelectedEntryId(entry.id)}
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                                  <img
                                    src={entry.mediaUrls?.[0] || '/placeholder.svg?height=100&width=100'}
                                    alt={entry.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    {getEntryIcon(entry.type)}
                                    <h4 className="font-medium text-deepbrown truncate">{entry.title}</h4>
                                  </div>
                                  <p className="text-xs text-deepbrown/70 mb-1">
                                    {entry.location}, {entry.country}
                                  </p>
                                  <div className="flex items-center gap-3 text-xs text-deepbrown/60">
                                    <span>{format(new Date(entry.timestamp), 'MMM d, yyyy')}</span>
                                    <span>•</span>
                                    <span className="capitalize">{entry.type}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8">
                            <BookOpen className="h-12 w-12 text-gold/30 mx-auto mb-3" />
                            <p className="text-deepbrown/70 text-sm">
                              {availableEntries.length === 0
                                ? "You don't have any available entries to attach. Create a new entry first!"
                                : "No entries match your search."}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <DialogFooter className="gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowAttachModal(false);
                          setSelectedEntryId('');
                          setSearchQuery('');
                        }}
                        className="border-gold/30"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAttachEntry}
                        disabled={!selectedEntryId}
                        className="bg-gold hover:bg-gold/90"
                      >
                        <Link className="mr-2 h-4 w-4" />
                        Attach Entry
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {trip.dayLogs && trip.dayLogs.length > 0 && (
                <div>
                  <h2 className="font-display text-xl sm:text-2xl font-semibold text-deepbrown mb-4 sm:mb-6">
                    Daily Timeline
                  </h2>
                  <div className="space-y-4">
                    {trip.dayLogs.map((dayLog) => (
                      <Card key={dayLog.id} className="border-gold/20 bg-parchment-light">
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="font-display text-base sm:text-lg font-medium text-deepbrown">
                                {format(new Date(dayLog.date), 'EEEE, MMMM d, yyyy')}
                              </h3>
                              <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-deepbrown/70 mt-0.5 sm:mt-1">
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  <span>
                                    {dayLog.location}, {dayLog.country}
                                  </span>
                                </div>
                                {dayLog.totalEntries > 0 && (
                                  <div className="flex items-center gap-1">
                                    <BookOpen className="h-3 w-3" />
                                    <span>
                                      {dayLog.totalEntries}{' '}
                                      {dayLog.totalEntries === 1 ? 'entry' : 'entries'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          {dayLog.description && (
                            <p className="text-deepbrown/80 leading-relaxed">
                              {dayLog.description}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <Card className="border-gold/20 bg-parchment-light">
                <CardHeader>
                  <CardTitle className="text-lg text-deepbrown">Trip Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-deepbrown/70">Status</span>
                    <Badge className={getStatusColor(trip.status)} variant="outline">
                      {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-deepbrown/70">Duration</span>
                    <span className="font-medium">{calculateDuration() || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-deepbrown/70">Total Entries</span>
                    <span className="font-medium">{trip.totalEntries}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-deepbrown/70">Countries</span>
                    <span className="font-medium">{trip.countriesVisited?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-deepbrown/70">Daily Logs</span>
                    <span className="font-medium">{trip.dayLogs?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-deepbrown/70">Locations</span>
                    <span className="font-medium">{trip.locationCount || 0}</span>
                  </div>
                </CardContent>
              </Card>

              {trip.companions && trip.companions.length > 0 && (
                <Card className="border-gold/20 bg-parchment-light">
                  <CardHeader>
                    <CardTitle className="text-lg text-deepbrown flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Travel Companions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {trip.companions.map((companion, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gold" />
                          <span className="text-deepbrown">{companion}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {trip.countriesVisited && trip.countriesVisited.length > 0 && (
                <Card className="border-gold/20 bg-parchment-light">
                  <CardHeader>
                    <CardTitle className="text-lg text-deepbrown flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Countries Visited
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {trip.countriesVisited.map((country, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="bg-gold/10 text-deepbrown border border-gold/30"
                        >
                          {country}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {trip.tags && trip.tags.length > 0 && (
                <Card className="border-gold/20 bg-parchment-light">
                  <CardHeader>
                    <CardTitle className="text-lg text-deepbrown flex items-center gap-2">
                      <Plane className="h-5 w-5" />
                      Trip Tags
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {trip.tags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="bg-blue/10 text-deepbrown border border-blue/30"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {trip.recentEntries && trip.recentEntries.length > 0 && (
                <Card className="border-gold/20 bg-parchment-light">
                  <CardHeader>
                    <CardTitle className="text-lg text-deepbrown">Recent Entries</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {trip.recentEntries.slice(0, 3).map((entry) => (
                        <motion.div
                          key={entry.id}
                          className="flex items-center gap-3 p-2 hover:bg-parchment rounded-lg transition-colors cursor-pointer"
                          whileHover={{ x: 3 }}
                          onClick={() => router.push(`/entry/${entry.id}`)}
                        >
                          <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                            {getEntryIcon(entry.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-deepbrown truncate">
                              {entry.title}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-deepbrown/70">
                              <span>{entry.location}</span>
                              <span>•</span>
                              <span>{format(new Date(entry.timestamp), 'MMM d')}</span>
                            </div>
                          </div>
                        </motion.div>
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
                      onClick={() => router.push('/entry/new')}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Entry
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start border-gold/30 bg-transparent"
                      onClick={() => router.push(`/edit-trip/${trip.id}`)}
                    >
                      <Edit3 className="mr-2 h-4 w-4" />
                      Edit Trip
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start border-gold/30 bg-transparent"
                      onClick={() => router.push('/map')}
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      View on Map
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Card className="border-gold/20 bg-parchment-light">
                <CardHeader>
                  <CardTitle className="text-lg text-deepbrown">Trip Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <span className="text-deepbrown/70">Created:</span>
                    <span className="ml-2 font-medium">
                      {format(new Date(trip.createdAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                  {trip.updatedAt && trip.updatedAt !== trip.createdAt && (
                    <div className="text-sm">
                      <span className="text-deepbrown/70">Last updated:</span>
                      <span className="ml-2 font-medium">
                        {format(new Date(trip.updatedAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
