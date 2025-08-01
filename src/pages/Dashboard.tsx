'use client';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
    Search,
    Plus,
    MapPin,
    Calendar,
    Filter,
    Heart,
    BookOpen,
    Camera,
    Map,
    Archive,
    Loader2,
    Plane,
    MapIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EntryCard } from '@/components/ui/entry-card';
import { TripCard } from '@/components/ui/trip-card';
import { AnimatedButton } from '@/components/ui/animated-button';
import { type Entry, type Trip, type EntryWithTripInfo, type UserStats } from '@/lib/types';
import { entryService } from '@/services/entryService';
import { tripService } from '@/services/tripService';
import { useAuth } from '@/context/useAuth';
import { toast } from 'sonner';

export default function Dashboard() {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();

    const [entries, setEntries] = useState<EntryWithTripInfo[]>([]);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [standaloneEntries, setStandaloneEntries] = useState<Entry[]>([]);
    const [favoriteEntries, setFavoriteEntries] = useState<Entry[]>([]);
    const [draftEntries, setDraftEntries] = useState<Entry[]>([]);
    const [stats, setStats] = useState<UserStats>({
        totalEntries: 0,
        countriesVisited: 0,
        continents: 0,
        latestEntryDate: null,
        totalPhotos: 0,
        totalTrips: 0,
        activeDays: 0,
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    const loadData = useCallback(async () => {
        if (!user) return;

        try {
            setIsLoading(true);

            const [allEntriesWithTripInfo, userTrips, standalone, favorites, drafts, userStats] =
                await Promise.all([
                    entryService.getUserEntriesWithTripInfo(user.uid, false),
                    tripService.getUserTrips(user.uid),
                    entryService.getStandaloneEntries(user.uid),
                    entryService.getFavoriteEntries(user.uid),
                    entryService.getDraftEntries(user.uid),
                    entryService.getUserStats(user.uid),
                ]);

            setEntries(allEntriesWithTripInfo);
            setTrips(userTrips);
            setStandaloneEntries(standalone);
            setFavoriteEntries(favorites);
            setDraftEntries(drafts);
            setStats(userStats);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    const handleSearch = async () => {
        if (!user || !searchTerm.trim()) {
            loadData();
            return;
        }

        try {
            setIsLoading(true);
            const [entryResults, tripResults] = await Promise.all([
                entryService.searchEntries(user.uid, searchTerm),
                tripService.searchTrips(user.uid, searchTerm),
            ]);

            const entriesWithTripInfo: EntryWithTripInfo[] = [];
            for (const entry of entryResults) {
                let tripName: string | undefined;
                if (entry.tripId) {
                    try {
                        const trip = await tripService.getTrip(entry.tripId);
                        tripName = trip?.name;
                    } catch (error) {
                        console.warn(`Failed to fetch trip ${entry.tripId}:`, error);
                    }
                }
                entriesWithTripInfo.push({ ...entry, tripName });
            }

            setEntries(entriesWithTripInfo);
            setTrips(tripResults);
        } catch (error) {
            console.error('Error searching:', error);
            toast.error('Search failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFavoriteToggle = async (entryId: string) => {
        try {
            await entryService.toggleFavorite(entryId);
            loadData();
            toast.success('Entry updated!');
        } catch (error) {
            console.error('Error toggling favorite:', error);
            toast.error('Failed to update entry');
        }
    };

    const handleTripFavoriteToggle = async (tripId: string) => {
        try {
            await tripService.toggleTripFavorite(tripId);
            loadData();
            toast.success('Trip updated!');
        } catch (error) {
            console.error('Error toggling trip favorite:', error);
            toast.error('Failed to update trip');
        }
    };

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
            case 'event':
                return <Calendar className="h-4 w-4" />;
            default:
                return <BookOpen className="h-4 w-4" />;
        }
    };

    const getRecentEntries = () => {
        return entries.slice(0, 6);
    };

    const getRecentTrips = () => {
        return trips.slice(0, 4);
    };

    const getRecentLocations = () => {
        const uniqueLocations = entries.reduce((acc, entry) => {
            const key = `${entry.location}, ${entry.country}`;
            if (!acc.find((item) => `${item.location}, ${item.country}` === key)) {
                acc.push(entry);
            }
            return acc;
        }, [] as EntryWithTripInfo[]);

        return uniqueLocations.slice(0, 4);
    };

    useEffect(() => {
        if (user && !authLoading) {
            loadData();
        }
    }, [user, authLoading, loadData]);

    useEffect(() => {
        if (searchTerm === '') {
            loadData();
        }
    }, [loadData, searchTerm]);

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen flex flex-col parchment-texture">
                <Navbar />
                <main className="flex-1 pt-24 pb-16 flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-gold mx-auto mb-4" />
                        <p className="text-deepbrown/70">Loading your adventures...</p>
                    </div>
                </main>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col parchment-texture">
                <Navbar />
                <main className="flex-1 pt-24 pb-16 flex items-center justify-center">
                    <div className="text-center">
                        <h2 className="font-display text-2xl font-bold text-deepbrown mb-4">
                            Welcome to Your Travel Journal
                        </h2>
                        <p className="text-deepbrown/70 mb-6">
                            Please sign in to access your adventures and create new entries.
                        </p>
                        <Button
                            onClick={() => navigate('/login')}
                            className="bg-gold hover:bg-gold/90"
                        >
                            Sign In
                        </Button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col parchment-texture">
            <Navbar />
            <main className="flex-1 pt-16 sm:pt-20 lg:pt-24 pb-8 sm:pb-12 lg:pb-16">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 sm:mb-8">
                        <div className="w-full md:w-auto">
                            <h1 className="font-display text-2xl sm:text-3xl font-bold text-deepbrown">
                                Your Adventures
                            </h1>
                            <p className="text-sm sm:text-base text-deepbrown/70">
                                {stats.totalEntries > 0
                                    ? `${stats.totalEntries} entries across ${stats.totalTrips} trips in ${stats.countriesVisited} countries`
                                    : 'Start documenting your travel memories'}
                            </p>
                        </div>
                        <div className="flex gap-2 sm:gap-3 w-full md:w-auto justify-start md:justify-end">
                            <AnimatedButton
                                animationType="glow"
                                className="shrink-0 text-sm sm:text-base"
                                onClick={() => navigate('/new-trip')}
                            >
                                <Plane className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                New Trip
                            </AnimatedButton>
                            <AnimatedButton
                                animationType="glow"
                                className="shrink-0 text-sm sm:text-base"
                                onClick={() => navigate('/entry/new')}
                            >
                                <Plus className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                New Entry
                            </AnimatedButton>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 sm:gap-6 lg:gap-8">
                        <div className="space-y-4 sm:space-y-6">
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full">
                                <div className="relative flex-1 w-full">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-deepbrown/50" />
                                    <Input
                                        placeholder="Search entries and trips..."
                                        className="pl-9 bg-parchment-light border-gold/30 text-sm sm:text-base"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    />
                                </div>
                                <div className="flex gap-1.5 sm:gap-2 justify-end sm:justify-start">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="border-gold/30 bg-transparent h-9 w-9 sm:h-10 sm:w-10"
                                        onClick={handleSearch}
                                    >
                                        <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                        <span className="sr-only">Search</span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="border-gold/30 bg-transparent h-9 w-9 sm:h-10 sm:w-10"
                                    >
                                        <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                        <span className="sr-only">Filter by date</span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="border-gold/30 bg-transparent h-9 w-9 sm:h-10 sm:w-10"
                                    >
                                        <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                        <span className="sr-only">Filter by location</span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="border-gold/30 bg-transparent h-9 w-9 sm:h-10 sm:w-10"
                                    >
                                        <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                        <span className="sr-only">More filters</span>
                                    </Button>
                                </div>
                            </div>

                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="bg-parchment-dark border border-gold/20 w-full overflow-x-auto flex-nowrap scrollbar-none">
                                    <TabsTrigger
                                        value="overview"
                                        className="text-sm sm:text-base whitespace-nowrap"
                                    >
                                        Overview
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="trips"
                                        className="text-sm sm:text-base whitespace-nowrap"
                                    >
                                        Trips ({trips.length})
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="entries"
                                        className="text-sm sm:text-base whitespace-nowrap"
                                    >
                                        All Entries ({entries.length})
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="standalone"
                                        className="text-sm sm:text-base whitespace-nowrap"
                                    >
                                        Solo Entries ({standaloneEntries.length})
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="favorites"
                                        className="text-sm sm:text-base whitespace-nowrap"
                                    >
                                        Favorites ({favoriteEntries.length})
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="drafts"
                                        className="text-sm sm:text-base whitespace-nowrap"
                                    >
                                        Drafts ({draftEntries.length})
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="overview" className="mt-6">
                                    <div className="space-y-8">
                                        {trips.length > 0 && (
                                            <div>
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="font-display text-xl font-medium text-deepbrown">
                                                        Recent Trips
                                                    </h3>
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => setActiveTab('trips')}
                                                        className="text-gold hover:text-gold/80"
                                                    >
                                                        View All
                                                    </Button>
                                                </div>
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                    {getRecentTrips().map((trip, index) => (
                                                        <TripCard
                                                            key={trip.id}
                                                            trip={trip}
                                                            index={index}
                                                            onClick={() =>
                                                                navigate(`/trip/${trip.id}`)
                                                            }
                                                            onFavoriteToggle={() =>
                                                                handleTripFavoriteToggle(trip.id)
                                                            }
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {entries.length > 0 && (
                                            <div>
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="font-display text-xl font-medium text-deepbrown">
                                                        Recent Entries
                                                    </h3>
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => setActiveTab('entries')}
                                                        className="text-gold hover:text-gold/80"
                                                    >
                                                        View All
                                                    </Button>
                                                </div>
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                    {getRecentEntries().map((entry, index) => (
                                                        <EntryCard
                                                            key={entry.id}
                                                            id={entry.id}
                                                            title={entry.title}
                                                            location={`${entry.location}, ${entry.country}`}
                                                            timestamp={entry.timestamp}
                                                            excerpt={
                                                                entry.content.substring(0, 150) +
                                                                '...'
                                                            }
                                                            imageUrl={
                                                                entry.mediaUrls[0] ||
                                                                '/placeholder.svg?height=400&width=600'
                                                            }
                                                            index={index}
                                                            type={entry.type}
                                                            isFavorite={entry.isFavorite}
                                                            onFavoriteToggle={() =>
                                                                handleFavoriteToggle(entry.id)
                                                            }
                                                            entryIcon={getEntryIcon(entry.type)}
                                                            tripName={entry.tripName}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {trips.length === 0 && entries.length === 0 && (
                                            <div className="text-center py-12">
                                                <Plane className="h-16 w-16 text-gold/50 mx-auto mb-4" />
                                                <h3 className="font-display text-xl font-medium text-deepbrown mb-2">
                                                    No adventures yet
                                                </h3>
                                                <p className="text-deepbrown/70 mb-6">
                                                    Start your journey by creating your first trip
                                                    or entry
                                                </p>
                                                <div className="flex gap-3 justify-center">
                                                    <AnimatedButton
                                                        animationType="glow"
                                                        onClick={() => navigate('/new-trip')}
                                                    >
                                                        <Plane className="mr-2 h-4 w-4" />
                                                        Create Trip
                                                    </AnimatedButton>
                                                    <AnimatedButton
                                                        animationType="glow"
                                                        onClick={() => navigate('/entry/new')}
                                                    >
                                                        <Plus className="mr-2 h-4 w-4" />
                                                        Create Entry
                                                    </AnimatedButton>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>

                                <TabsContent value="trips" className="mt-6">
                                    {trips.length > 0 ? (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {trips.map((trip, index) => (
                                                <TripCard
                                                    key={trip.id}
                                                    trip={trip}
                                                    index={index}
                                                    onClick={() => navigate(`/trip/${trip.id}`)}
                                                    onFavoriteToggle={() =>
                                                        handleTripFavoriteToggle(trip.id)
                                                    }
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <Plane className="h-16 w-16 text-gold/50 mx-auto mb-4" />
                                            <h3 className="font-display text-xl font-medium text-deepbrown mb-2">
                                                No trips yet
                                            </h3>
                                            <p className="text-deepbrown/70 mb-6">
                                                Create your first trip to organize your travel
                                                memories
                                            </p>
                                            <AnimatedButton
                                                animationType="glow"
                                                onClick={() => navigate('/new-trip')}
                                            >
                                                <Plane className="mr-2 h-4 w-4" />
                                                Create First Trip
                                            </AnimatedButton>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="entries" className="mt-6">
                                    {entries.length > 0 ? (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {entries.map((entry, index) => (
                                                <EntryCard
                                                    key={entry.id}
                                                    id={entry.id}
                                                    title={entry.title}
                                                    location={`${entry.location}, ${entry.country}`}
                                                    timestamp={entry.timestamp}
                                                    excerpt={
                                                        entry.content.substring(0, 150) + '...'
                                                    }
                                                    imageUrl={
                                                        entry.mediaUrls[0] ||
                                                        '/placeholder.svg?height=400&width=600'
                                                    }
                                                    index={index}
                                                    type={entry.type}
                                                    isFavorite={entry.isFavorite}
                                                    onFavoriteToggle={() =>
                                                        handleFavoriteToggle(entry.id)
                                                    }
                                                    entryIcon={getEntryIcon(entry.type)}
                                                    tripName={entry.tripName}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <BookOpen className="h-16 w-16 text-gold/50 mx-auto mb-4" />
                                            <h3 className="font-display text-xl font-medium text-deepbrown mb-2">
                                                No entries yet
                                            </h3>
                                            <p className="text-deepbrown/70 mb-6">
                                                Start your journey by creating your first travel
                                                entry
                                            </p>
                                            <AnimatedButton
                                                animationType="glow"
                                                onClick={() => navigate('/entry/new')}
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                Create First Entry
                                            </AnimatedButton>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="standalone" className="mt-6">
                                    {standaloneEntries.length > 0 ? (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {standaloneEntries.map((entry, index) => (
                                                <EntryCard
                                                    key={entry.id}
                                                    id={entry.id}
                                                    title={entry.title}
                                                    location={`${entry.location}, ${entry.country}`}
                                                    timestamp={entry.timestamp}
                                                    excerpt={
                                                        entry.content.substring(0, 150) + '...'
                                                    }
                                                    imageUrl={
                                                        entry.mediaUrls[0] ||
                                                        '/placeholder.svg?height=400&width=600'
                                                    }
                                                    index={index}
                                                    type={entry.type}
                                                    isFavorite={entry.isFavorite}
                                                    onFavoriteToggle={() =>
                                                        handleFavoriteToggle(entry.id)
                                                    }
                                                    entryIcon={getEntryIcon(entry.type)}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <BookOpen className="h-16 w-16 text-gold/50 mx-auto mb-4" />
                                            <h3 className="font-display text-xl font-medium text-deepbrown mb-2">
                                                No solo entries
                                            </h3>
                                            <p className="text-deepbrown/70 mb-6">
                                                Solo entries are individual memories not part of a
                                                trip
                                            </p>
                                            <AnimatedButton
                                                animationType="glow"
                                                onClick={() => navigate('/entry/new')}
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                Create Solo Entry
                                            </AnimatedButton>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="favorites" className="mt-6">
                                    {favoriteEntries.length > 0 ? (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {favoriteEntries.map((entry, index) => (
                                                <EntryCard
                                                    key={entry.id}
                                                    id={entry.id}
                                                    title={entry.title}
                                                    location={`${entry.location}, ${entry.country}`}
                                                    timestamp={entry.timestamp}
                                                    excerpt={
                                                        entry.content.substring(0, 150) + '...'
                                                    }
                                                    imageUrl={
                                                        entry.mediaUrls[0] ||
                                                        '/placeholder.svg?height=400&width=600'
                                                    }
                                                    index={index}
                                                    type={entry.type}
                                                    isFavorite={true}
                                                    onFavoriteToggle={() =>
                                                        handleFavoriteToggle(entry.id)
                                                    }
                                                    entryIcon={getEntryIcon(entry.type)}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <Heart className="h-16 w-16 text-gold/50 mx-auto mb-4" />
                                            <h3 className="font-display text-xl font-medium text-deepbrown mb-2">
                                                No favorites yet
                                            </h3>
                                            <p className="text-deepbrown/70">
                                                Mark your special memories as favorites to find them
                                                easily
                                            </p>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="drafts" className="mt-6">
                                    {draftEntries.length > 0 ? (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {draftEntries.map((entry, index) => (
                                                <EntryCard
                                                    key={entry.id}
                                                    id={entry.id}
                                                    title={entry.title || 'Untitled Draft'}
                                                    location={
                                                        entry.location
                                                            ? `${entry.location}, ${entry.country}`
                                                            : 'Location not set'
                                                    }
                                                    timestamp={entry.createdAt || entry.timestamp}
                                                    excerpt={
                                                        entry.content
                                                            ? entry.content.substring(0, 150) +
                                                              '...'
                                                            : 'No content yet'
                                                    }
                                                    imageUrl={
                                                        entry.mediaUrls[0] ||
                                                        '/placeholder.svg?height=400&width=600'
                                                    }
                                                    index={index}
                                                    type={entry.type}
                                                    isFavorite={entry.isFavorite}
                                                    onFavoriteToggle={() =>
                                                        handleFavoriteToggle(entry.id)
                                                    }
                                                    entryIcon={getEntryIcon(entry.type)}
                                                    isDraft={true}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <Archive className="h-16 w-16 text-gold/50 mx-auto mb-4" />
                                            <h3 className="font-display text-xl font-medium text-deepbrown mb-2">
                                                No drafts found
                                            </h3>
                                            <p className="text-deepbrown/70">
                                                Your saved drafts will appear here
                                            </p>
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-parchment-light rounded-2xl border border-gold/20 p-5">
                                <h3 className="font-display text-lg font-medium text-deepbrown mb-4">
                                    Adventure Statistics
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-deepbrown/70">Total Trips</span>
                                        <span className="font-display font-medium">
                                            {stats.totalTrips}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-deepbrown/70">Total Entries</span>
                                        <span className="font-display font-medium">
                                            {stats.totalEntries}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-deepbrown/70">Countries Visited</span>
                                        <span className="font-display font-medium">
                                            {stats.countriesVisited}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-deepbrown/70">Continents</span>
                                        <span className="font-display font-medium">
                                            {stats.continents}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-deepbrown/70">Active Days</span>
                                        <span className="font-display font-medium">
                                            {stats.activeDays}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-deepbrown/70">Total Photos</span>
                                        <span className="font-display font-medium">
                                            {stats.totalPhotos}
                                        </span>
                                    </div>
                                    {stats.latestEntryDate && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-deepbrown/70">Latest Entry</span>
                                            <span className="font-display font-medium">
                                                {format(
                                                    new Date(stats.latestEntryDate),
                                                    'MMM d, yyyy'
                                                )}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {getRecentLocations().length > 0 && (
                                <div className="bg-parchment-light rounded-2xl border border-gold/20 p-5">
                                    <h3 className="font-display text-lg font-medium text-deepbrown mb-4">
                                        Recent Locations
                                    </h3>
                                    <div className="space-y-3">
                                        {getRecentLocations().map((entry) => (
                                            <motion.div
                                                key={entry.id}
                                                className="flex items-center gap-3 p-2 hover:bg-parchment rounded-lg transition-colors cursor-pointer"
                                                whileHover={{ x: 3 }}
                                                onClick={() => navigate(`/entry/${entry.id}`)}
                                            >
                                                <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                                                    <MapPin className="h-4 w-4 text-gold" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-deepbrown truncate">
                                                        {entry.location}
                                                    </p>
                                                    <div className="flex items-center gap-1 text-xs text-deepbrown/70">
                                                        <span>{entry.country}</span>
                                                        {entry.tripName && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="text-gold">
                                                                    {entry.tripName}
                                                                </span>
                                                            </>
                                                        )}
                                                        <span>•</span>
                                                        <span>
                                                            {format(
                                                                new Date(entry.timestamp),
                                                                'MMM d, yyyy'
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-gold/70">
                                                    {getEntryIcon(entry.type)}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {trips.length > 0 && (
                                <div className="bg-parchment-light rounded-2xl border border-gold/20 p-5">
                                    <h3 className="font-display text-lg font-medium text-deepbrown mb-4">
                                        Trip Status
                                    </h3>
                                    <div className="space-y-3">
                                        {Object.entries(
                                            trips.reduce(
                                                (acc, trip) => {
                                                    acc[trip.status] = (acc[trip.status] || 0) + 1;
                                                    return acc;
                                                },
                                                {} as Record<string, number>
                                            )
                                        ).map(([status, count]) => (
                                            <div
                                                key={status}
                                                className="flex justify-between items-center"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className={`w-2 h-2 rounded-full ${
                                                            status === 'completed'
                                                                ? 'bg-green-500'
                                                                : status === 'active'
                                                                  ? 'bg-blue-500'
                                                                  : status === 'planned'
                                                                    ? 'bg-yellow-500'
                                                                    : 'bg-gray-500'
                                                        }`}
                                                    />
                                                    <span className="text-deepbrown/70 capitalize">
                                                        {status}
                                                    </span>
                                                </div>
                                                <span className="font-display font-medium">
                                                    {count}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {entries.length > 0 && (
                                <div className="bg-parchment-light rounded-2xl border border-gold/20 p-5">
                                    <h3 className="font-display text-lg font-medium text-deepbrown mb-4">
                                        Entry Types
                                    </h3>
                                    <div className="space-y-3">
                                        {Object.entries(
                                            entries.reduce(
                                                (acc, entry) => {
                                                    acc[entry.type] = (acc[entry.type] || 0) + 1;
                                                    return acc;
                                                },
                                                {} as Record<string, number>
                                            )
                                        ).map(([type, count]) => (
                                            <div
                                                key={type}
                                                className="flex justify-between items-center"
                                            >
                                                <div className="flex items-center gap-2">
                                                    {getEntryIcon(type)}
                                                    <span className="text-deepbrown/70 capitalize">
                                                        {type}
                                                    </span>
                                                </div>
                                                <span className="font-display font-medium">
                                                    {count}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="bg-parchment-light rounded-2xl border border-gold/20 p-5">
                                <h3 className="font-display text-lg font-medium text-deepbrown mb-4">
                                    Quick Actions
                                </h3>
                                <div className="space-y-2">
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start border-gold/30 bg-transparent"
                                        onClick={() => navigate('/new-trip')}
                                    >
                                        <Plane className="mr-2 h-4 w-4" />
                                        New Trip
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start border-gold/30 bg-transparent"
                                        onClick={() => navigate('/entry/new')}
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        New Entry
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start border-gold/30 bg-transparent"
                                        onClick={() => navigate('/map')}
                                    >
                                        <MapIcon className="mr-2 h-4 w-4" />
                                        View Map
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start border-gold/30 bg-transparent"
                                        onClick={() => setActiveTab('favorites')}
                                    >
                                        <Heart className="mr-2 h-4 w-4" />
                                        Favorites
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
