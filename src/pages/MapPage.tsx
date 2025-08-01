'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    ChevronRight,
    ChevronLeft,
    Grid,
    MapPin,
    Plus,
    Loader2,
    Route,
    Search,
} from 'lucide-react';
import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    addDoc,
    deleteDoc,
    getDocs,
    orderBy,
} from 'firebase/firestore';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { db } from '@/api/firebase';
import { useAuth } from '@/context/useAuth';
import {
    type Entry,
    type MapLocationWithDetails,
    type Trip,
    type TripWithDetails,
    type TripRoute,
} from '@/lib/types';
import {
    getAutocompleteSuggestions,
    getPlaceDetails,
    getPlaceDetailsFromPlaceId,
} from '@/services/geocoding';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapViewer } from '@/components/MapViewer';
import { LocationModal } from '@/components/LocationModal';
import { AnimatedButton } from '@/components/ui/animated-button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface MapStats {
    totalCountries: number;
    totalCities: number;
    totalDistance: number;
    totalEntries: number;
    favoriteDestination?: string;
}

export default function MapPage() {
    const { user } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [trips, setTrips] = useState<TripWithDetails[]>([]);
    const [standaloneEntries, setStandaloneEntries] = useState<Entry[]>([]);
    const [customLocations, setCustomLocations] = useState<MapLocationWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showLocationDialog, setShowLocationDialog] = useState(false);
    const [selectedTrip, setSelectedTrip] = useState<string>('');

    const [locationSearchQuery, setLocationSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ description: string; placeId: string }[]>(
        []
    );
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [isAddingLocation, setIsAddingLocation] = useState(false);

    const [selectedLocation, setSelectedLocation] = useState<MapLocationWithDetails | null>(null);
    const [showLocationModal, setShowLocationModal] = useState(false);

    const [newLocation, setNewLocation] = useState({
        name: '',
        type: 'visited' as 'visited' | 'planned' | 'favorite',
        coordinates: { lat: 0, lng: 0 },
        tripId: '',
        description: '',
    });

    const [_tripRoutes, setTripRoutes] = useState<TripRoute[]>([]);
    const [mapStats, setMapStats] = useState<MapStats | null>(null);
    const [showMapStats, _setShowMapStats] = useState(false);

    const handleARViewClick = () => {
        toast.info('AR mode coming soon!', {
            description:
                'This feature is currently in development and will be available in a future update.',
        });
    };

    const performSearch = async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            setShowSearchResults(false);
            return;
        }

        setIsSearching(true);

        try {
            const results = await getAutocompleteSuggestions(query);
            setSearchResults(results);
            setShowSearchResults(results.length > 0);
        } catch (error) {
            console.error('Search failed:', error);
            setSearchResults([]);
            setShowSearchResults(false);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearchInput = (value: string) => {
        setLocationSearchQuery(value);

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            performSearch(value);
        }, 300);
    };

    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleSearchResultSelect = async (result: { description: string; placeId: string }) => {
        try {
            const placeDetails = await getPlaceDetailsFromPlaceId(result.placeId);

            if (!placeDetails.coordinates) {
                throw new Error('No coordinates found for this place');
            }

            const { lat, lng } = placeDetails.coordinates;

            setNewLocation((prev) => ({
                ...prev,
                coordinates: { lat, lng },
                name:
                    prev.name ||
                    placeDetails.name ||
                    `Location ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            }));

            setLocationSearchQuery(placeDetails.name);
            setShowSearchResults(false);
        } catch (error) {
            console.error('Failed to navigate to search result:', error);
            toast.error('Failed to get location details');
        }
    };

    const handleLocationSelect = async (location: {
        lat: number;
        lng: number;
        address?: string;
    }) => {
        try {
            const placeDetails = await getPlaceDetails(location.lat, location.lng);
            setNewLocation((prev) => ({
                ...prev,
                coordinates: { lat: location.lat, lng: location.lng },
                name:
                    prev.name ||
                    placeDetails.name ||
                    `Location ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`,
            }));
        } catch (error) {
            console.error('Geocoding failed:', error);
            setNewLocation((prev) => ({
                ...prev,
                coordinates: { lat: location.lat, lng: location.lng },
                name:
                    prev.name || `Location ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`,
            }));
        }
    };

    useEffect(() => {
        if (!user) return;

        setIsLoading(true);

        const unsubscribeTrips = onSnapshot(
            query(collection(db, 'trips'), where('uid', '==', user.uid)),
            async (snapshot) => {
                const tripsData = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Trip[];

                const tripsWithDetails: TripWithDetails[] = [];
                for (const trip of tripsData) {
                    const entriesSnapshot = await getDocs(
                        query(
                            collection(db, 'entries'),
                            where('tripId', '==', trip.id),
                            where('isDraft', '!=', true)
                        )
                    );

                    const recentEntries = entriesSnapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    })) as Entry[];

                    const locationCount = new Set(
                        recentEntries
                            .filter((e) => e.coordinates?.lat && e.coordinates?.lng)
                            .map((e) => `${e.coordinates.lat},${e.coordinates.lng}`)
                    ).size;

                    tripsWithDetails.push({
                        ...trip,
                        dayLogs: [],
                        recentEntries: recentEntries.slice(0, 5),
                        locationCount,
                    });
                }

                setTrips(tripsWithDetails);
            }
        );

        const unsubscribeStandalone = onSnapshot(
            query(
                collection(db, 'entries'),
                where('uid', '==', user.uid),
                where('isStandalone', '==', true),
                where('isDraft', '!=', true)
            ),
            (snapshot) => {
                setStandaloneEntries(
                    snapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    })) as Entry[]
                );
            }
        );

        const unsubscribeCustom = onSnapshot(
            query(
                collection(db, 'mapLocations'),
                where('uid', '==', user.uid),
                where('isCustom', '==', true)
            ),
            (snapshot) => {
                setCustomLocations(
                    snapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    })) as MapLocationWithDetails[]
                );
                setIsLoading(false);
            }
        );

        return () => {
            unsubscribeTrips();
            unsubscribeStandalone();
            unsubscribeCustom();
        };
    }, [user]);

    useEffect(() => {
        const processTripsIntoRoutes = async () => {
            if (!trips.length) {
                setTripRoutes([]);
                setMapStats(null);
                return;
            }

            const routes: TripRoute[] = [];

            for (const trip of trips) {
                try {
                    const tripEntries = await getDocs(
                        query(
                            collection(db, 'entries'),
                            where('tripId', '==', trip.id),
                            where('isDraft', '!=', true),
                            orderBy('timestamp', 'asc')
                        )
                    );

                    const entries = tripEntries.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    })) as Entry[];

                    const uniqueLocations = new Map<string, Entry>();
                    entries
                        .filter((entry) => entry.coordinates?.lat && entry.coordinates?.lng)
                        .forEach((entry) => {
                            const key = `${entry.coordinates.lat.toFixed(6)},${entry.coordinates.lng.toFixed(6)}`;
                            if (
                                !uniqueLocations.has(key) ||
                                new Date(entry.timestamp) >
                                    new Date(uniqueLocations.get(key)!.timestamp)
                            ) {
                                uniqueLocations.set(key, entry);
                            }
                        });

                    const locations: MapLocationWithDetails[] = Array.from(uniqueLocations.values())
                        .sort(
                            (a, b) =>
                                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                        )
                        .map((entry) => ({
                            id: `trip-${trip.id}-${entry.id}`,
                            uid: entry.uid,
                            name: entry.location || entry.title,
                            lat: entry.coordinates.lat,
                            lng: entry.coordinates.lng,
                            type: 'visited' as const,
                            tripId: trip.id,
                            trip,
                            entry,
                            isCustom: false,
                        }));

                    if (locations.length > 0) {
                        let totalDistance = 0;
                        for (let i = 1; i < locations.length; i++) {
                            const prev = locations[i - 1];
                            const curr = locations[i];

                            const R = 6371; // Earth's radius in km
                            const dLat = ((curr.lat - prev.lat) * Math.PI) / 180;
                            const dLon = ((curr.lng - prev.lng) * Math.PI) / 180;
                            const a =
                                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                                Math.cos((prev.lat * Math.PI) / 180) *
                                    Math.cos((curr.lat * Math.PI) / 180) *
                                    Math.sin(dLon / 2) *
                                    Math.sin(dLon / 2);
                            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                            totalDistance += R * c;
                        }

                        routes.push({
                            tripId: trip.id,
                            tripName: trip.name,
                            locations,
                            status: trip.status,
                            totalDistance: Math.round(totalDistance),
                            totalDuration: 0, // You can calculate this based on entry timestamps if needed
                        });
                    }
                } catch (error) {
                    console.error(`Error processing trip ${trip.id}:`, error);
                }
            }

            setTripRoutes(routes);
            calculateMapStats(routes);
        };

        processTripsIntoRoutes();
    }, [trips]);

    const calculateMapStats = (routes: TripRoute[]) => {
        const allLocations = routes.flatMap((route) => route.locations);
        const countries = new Set(allLocations.map((loc) => loc.entry?.country).filter(Boolean));
        const cities = new Set(allLocations.map((loc) => loc.name));

        const locationCounts = new Map<string, number>();
        allLocations.forEach((loc) => {
            const key = loc.entry?.country || loc.name;
            locationCounts.set(key, (locationCounts.get(key) || 0) + 1);
        });

        const favoriteDestination = Array.from(locationCounts.entries()).sort(
            (a, b) => b[1] - a[1]
        )[0]?.[0];

        setMapStats({
            totalCountries: countries.size,
            totalCities: cities.size,
            totalDistance: routes.reduce((sum, route) => sum + (route.totalDistance || 0), 0),
            totalEntries: allLocations.length,
            favoriteDestination,
        });
    };

    const handleLocationClick = (location: MapLocationWithDetails) => {
        setSelectedLocation(location);
        setShowLocationModal(true);
    };

    const handleAddLocation = async () => {
        if (!user || !newLocation.name.trim() || !newLocation.coordinates.lat) {
            toast.error('Please fill in all required fields and select a location');
            return;
        }

        setIsAddingLocation(true);
        try {
            const locationData = {
                uid: user.uid,
                name: newLocation.name.trim(),
                lat: newLocation.coordinates.lat,
                lng: newLocation.coordinates.lng,
                type: newLocation.type,
                tripId: newLocation.tripId || undefined,
                description: newLocation.description?.trim() || undefined,
                isCustom: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            await addDoc(collection(db, 'mapLocations'), locationData);

            toast.success(`Custom location "${newLocation.name}" added successfully!`);
            setShowLocationDialog(false);

            setNewLocation({
                name: '',
                type: 'visited',
                coordinates: { lat: 0, lng: 0 },
                tripId: '',
                description: '',
            });
            setLocationSearchQuery('');
        } catch (error) {
            console.error('Error adding location:', error);
            toast.error('Failed to add location. Please try again.');
        } finally {
            setIsAddingLocation(false);
        }
    };

    const handleRemoveLocation = async (locationId: string) => {
        try {
            await deleteDoc(doc(db, 'mapLocations', locationId));
            toast.success('Location removed');
        } catch (error) {
            console.error('Error removing location:', error);
            toast.error('Failed to remove location');
        }
    };

    const getAllMapLocations = (): MapLocationWithDetails[] => {
        const locations: MapLocationWithDetails[] = [];
        const processedLocations = new Set<string>();

        trips.forEach((trip) => {
            const tripLocations = new Map<string, Entry>();

            trip.recentEntries.forEach((entry) => {
                if (entry.coordinates?.lat && entry.coordinates?.lng) {
                    const key = `${entry.coordinates.lat.toFixed(6)},${entry.coordinates.lng.toFixed(6)}`;

                    if (
                        !tripLocations.has(key) ||
                        (tripLocations.get(key) &&
                            new Date(entry.timestamp) > new Date(tripLocations.get(key)!.timestamp))
                    ) {
                        tripLocations.set(key, entry);
                    }
                }
            });

            tripLocations.forEach((entry) => {
                const locationKey = `${entry.coordinates.lat},${entry.coordinates.lng}`;
                if (!processedLocations.has(locationKey)) {
                    locations.push({
                        id: `trip-${trip.id}-${entry.id}`,
                        uid: user?.uid || '',
                        name: entry.location || entry.title,
                        lat: entry.coordinates.lat,
                        lng: entry.coordinates.lng,
                        type:
                            trip.status === 'completed'
                                ? 'visited'
                                : trip.status === 'planned'
                                  ? 'planned'
                                  : 'visited',
                        tripId: trip.id,
                        trip,
                        entry,
                        isCustom: false,
                    });
                    processedLocations.add(locationKey);
                }
            });
        });

        standaloneEntries.forEach((entry) => {
            if (entry.coordinates?.lat && entry.coordinates?.lng) {
                const locationKey = `${entry.coordinates.lat},${entry.coordinates.lng}`;
                if (!processedLocations.has(locationKey)) {
                    locations.push({
                        id: `standalone-${entry.id}`,
                        uid: user?.uid || '',
                        name: entry.location || entry.title,
                        lat: entry.coordinates.lat,
                        lng: entry.coordinates.lng,
                        type: 'visited',
                        entry,
                        isCustom: false,
                    });
                    processedLocations.add(locationKey);
                }
            }
        });

        customLocations.forEach((location) => {
            const locationKey = `${location.lat},${location.lng}`;
            if (!processedLocations.has(locationKey)) {
                const trip = location.tripId
                    ? trips.find((t) => t.id === location.tripId)
                    : undefined;
                locations.push({
                    ...location,
                    trip,
                });
                processedLocations.add(locationKey);
            }
        });

        return locations;
    };

    const handleTripSelection = (tripId: string) => {
        const newSelectedTrip = selectedTrip === tripId ? '' : tripId;
        setSelectedTrip(newSelectedTrip);

        if (newSelectedTrip) {
            const tripLocations = getAllMapLocations().filter(
                (loc) => loc.tripId === newSelectedTrip
            );
            if (tripLocations.length > 0) {
                console.log(
                    `Focusing on trip: ${trips.find((t) => t.id === newSelectedTrip)?.name}`
                );
            }
        }
    };

    const getLocationsByType = (type: string) => {
        if (type === 'trips') {
            return trips.map((trip) => ({
                id: trip.id,
                name: trip.name,
                type: 'trip' as const,
                trip,
                locationCount: trip.locationCount,
                status: trip.status,
            }));
        }
        return getAllMapLocations().filter((loc) => loc.type === type);
    };

    const getTripColor = (status: string) => {
        switch (status) {
            case 'completed':
                return '#d4af37';
            case 'active':
                return '#4c6b54';
            case 'planned':
                return '#b22222';
            case 'draft':
                return '#8B7355';
            default:
                return '#d4af37';
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col parchment-texture">
                <Navbar />
                <main className="flex-1 pt-16 flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-gold mx-auto mb-4" />
                        <p className="text-deepbrown/70">Loading your map...</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col parchment-texture">
            <Navbar />

            <main className="flex-1 pt-16">
                <div className="flex h-[calc(100vh-4rem)]">
                    <motion.div
                        className="bg-parchment-light border-r border-gold/20 h-full overflow-y-auto"
                        initial={{ width: 350 }}
                        animate={{ width: sidebarOpen ? 350 : 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="p-4">
                            {showMapStats && mapStats && (
                                <Card className="border-gold/20 bg-parchment-light mb-4 gap-2 py-4">
                                    <CardHeader>
                                        <CardTitle className="text-md text-deepbrown">
                                            Your Travel Stats
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-gold">
                                                    {mapStats.totalCountries}
                                                </div>
                                                <div className="text-xs text-deepbrown/70">
                                                    Countries
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-gold">
                                                    {mapStats.totalCities}
                                                </div>
                                                <div className="text-xs text-deepbrown/70">
                                                    Cities
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-gold">
                                                    {(mapStats.totalDistance / 1000).toFixed(0)}k
                                                </div>
                                                <div className="text-xs text-deepbrown/70">
                                                    KM Traveled
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-gold">
                                                    {mapStats.totalEntries}
                                                </div>
                                                <div className="text-xs text-deepbrown/70">
                                                    Entries
                                                </div>
                                            </div>
                                        </div>
                                        {mapStats.favoriteDestination && (
                                            <div className="text-center pt-2 border-t border-gold/20">
                                                <div className="text-sm text-deepbrown/70">
                                                    Favorite Destination
                                                </div>
                                                <div className="font-medium text-deepbrown">
                                                    {mapStats.favoriteDestination}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-display text-xl font-medium text-deepbrown">
                                    Travel Map
                                </h2>
                                <div className="flex gap-2">
                                    <Dialog
                                        open={showLocationDialog}
                                        onOpenChange={setShowLocationDialog}
                                    >
                                        <DialogTrigger asChild>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-gold/30 bg-transparent"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-[100vw] w-full max-h-[90vh] bg-parchment border border-gold/20 shadow-2xl overflow-y-auto">
                                            <DialogHeader>
                                                <DialogTitle className="font-display text-xl text-deepbrown">
                                                    Add Custom Location
                                                </DialogTitle>
                                                <p className="text-sm text-deepbrown/70 mt-1">
                                                    Create a custom location marker for places you
                                                    want to remember or plan to visit
                                                </p>
                                            </DialogHeader>

                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <Label
                                                            htmlFor="location-name"
                                                            className="text-deepbrown font-medium"
                                                        >
                                                            Location Name *
                                                        </Label>
                                                        <Input
                                                            id="location-name"
                                                            placeholder="Enter a memorable name for this location"
                                                            value={newLocation.name}
                                                            onChange={(e) =>
                                                                setNewLocation((prev) => ({
                                                                    ...prev,
                                                                    name: e.target.value,
                                                                }))
                                                            }
                                                            className="bg-parchment border-gold/30 focus:border-gold/50"
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label
                                                            htmlFor="location-type"
                                                            className="text-deepbrown font-medium"
                                                        >
                                                            Location Type
                                                        </Label>
                                                        <Select
                                                            value={newLocation.type}
                                                            onValueChange={(value: any) =>
                                                                setNewLocation((prev) => ({
                                                                    ...prev,
                                                                    type: value,
                                                                }))
                                                            }
                                                        >
                                                            <SelectTrigger className="bg-parchment border-gold/30 focus:border-gold/50">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-parchment border-gold/30">
                                                                <SelectItem value="visited">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-3 h-3 rounded-full bg-[#d4af37]"></div>
                                                                        <span>
                                                                            Visited - Places I've
                                                                            been to
                                                                        </span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="planned">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-3 h-3 rounded-full bg-[#4c6b54]"></div>
                                                                        <span>
                                                                            Planned - Places I want
                                                                            to visit
                                                                        </span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="favorite">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-3 h-3 rounded-full bg-[#b22222]"></div>
                                                                        <span>
                                                                            Favorite - Special
                                                                            places to remember
                                                                        </span>
                                                                    </div>
                                                                </SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label
                                                            htmlFor="trip-assignment"
                                                            className="text-deepbrown font-medium"
                                                        >
                                                            Assign to Trip (Optional)
                                                        </Label>
                                                        <Select
                                                            value={newLocation.tripId}
                                                            onValueChange={(value) =>
                                                                setNewLocation((prev) => ({
                                                                    ...prev,
                                                                    tripId: value,
                                                                }))
                                                            }
                                                        >
                                                            <SelectTrigger className="bg-parchment border-gold/30 focus:border-gold/50">
                                                                <SelectValue placeholder="Select a trip..." />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-parchment border-gold/30">
                                                                <SelectItem value="none">
                                                                    <span className="text-deepbrown/70">
                                                                        No trip - Standalone
                                                                        location
                                                                    </span>
                                                                </SelectItem>
                                                                {trips.map((trip) => (
                                                                    <SelectItem
                                                                        key={trip.id}
                                                                        value={trip.id}
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            <div
                                                                                className="w-3 h-3 rounded-full"
                                                                                style={{
                                                                                    backgroundColor:
                                                                                        getTripColor(
                                                                                            trip.status
                                                                                        ),
                                                                                }}
                                                                            ></div>
                                                                            <span>{trip.name}</span>
                                                                            <Badge
                                                                                variant="outline"
                                                                                className="ml-auto text-xs"
                                                                            >
                                                                                {trip.status}
                                                                            </Badge>
                                                                        </div>
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label className="text-deepbrown font-medium">
                                                            Location Description (Optional)
                                                        </Label>
                                                        <Textarea
                                                            placeholder="Add notes about this location, why it's special, or what you plan to do there..."
                                                            className="bg-parchment border-gold/30 focus:border-gold/50 min-h-[80px] resize-none"
                                                            value={newLocation.description || ''}
                                                            onChange={(e) =>
                                                                setNewLocation((prev) => ({
                                                                    ...prev,
                                                                    description: e.target.value,
                                                                }))
                                                            }
                                                        />
                                                    </div>

                                                    {newLocation.coordinates.lat !== 0 && (
                                                        <div className="space-y-2">
                                                            <Label className="text-deepbrown font-medium">
                                                                Coordinates
                                                            </Label>
                                                            <div className="bg-parchment-dark border border-gold/20 rounded-lg p-3">
                                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                                    <div>
                                                                        <span className="text-deepbrown/70">
                                                                            Latitude:
                                                                        </span>
                                                                        <p className="font-mono text-deepbrown">
                                                                            {newLocation.coordinates.lat.toFixed(
                                                                                6
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-deepbrown/70">
                                                                            Longitude:
                                                                        </span>
                                                                        <p className="font-mono text-deepbrown">
                                                                            {newLocation.coordinates.lng.toFixed(
                                                                                6
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="space-y-2">
                                                        <Label className="text-deepbrown font-medium">
                                                            Search & Set Location
                                                        </Label>
                                                        <div className="relative">
                                                            <Popover
                                                                open={showSearchResults}
                                                                onOpenChange={setShowSearchResults}
                                                            >
                                                                <PopoverTrigger asChild>
                                                                    <div>
                                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-deepbrown/50" />
                                                                        <Input
                                                                            placeholder="Search for a place or click on the map"
                                                                            className="pl-9 bg-parchment border-gold/30 focus:border-gold/50"
                                                                            value={
                                                                                locationSearchQuery
                                                                            }
                                                                            onChange={(e) => {
                                                                                handleSearchInput(
                                                                                    e.target.value
                                                                                );
                                                                                if (
                                                                                    e.target.value
                                                                                ) {
                                                                                    setShowSearchResults(
                                                                                        true
                                                                                    );
                                                                                }
                                                                            }}
                                                                            onFocus={() => {
                                                                                if (
                                                                                    locationSearchQuery &&
                                                                                    searchResults.length >
                                                                                        0
                                                                                ) {
                                                                                    setShowSearchResults(
                                                                                        true
                                                                                    );
                                                                                }
                                                                            }}
                                                                            onBlur={() => {
                                                                                setTimeout(
                                                                                    () =>
                                                                                        setShowSearchResults(
                                                                                            false
                                                                                        ),
                                                                                    200
                                                                                );
                                                                            }}
                                                                        />
                                                                        {isSearching && (
                                                                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gold" />
                                                                        )}
                                                                    </div>
                                                                </PopoverTrigger>
                                                                <PopoverContent
                                                                    className="w-full p-0 bg-parchment border border-gold/20 rounded-lg mt-1"
                                                                    align="start"
                                                                    onOpenAutoFocus={(e: {
                                                                        preventDefault: () => void;
                                                                    }) => e.preventDefault()}
                                                                >
                                                                    <div className="max-h-60 overflow-y-auto">
                                                                        {searchResults.length ===
                                                                            0 &&
                                                                        locationSearchQuery &&
                                                                        !isSearching ? (
                                                                            <div className="p-2 text-center text-deepbrown/70">
                                                                                No results found for
                                                                                "
                                                                                {
                                                                                    locationSearchQuery
                                                                                }
                                                                                "
                                                                            </div>
                                                                        ) : (
                                                                            searchResults.map(
                                                                                (result, index) => (
                                                                                    <div
                                                                                        key={`${result.placeId}-${index}`}
                                                                                        className="p-3 hover:bg-parchment-dark cursor-pointer border-b border-gold/20 last:border-b-0 transition-colors"
                                                                                        onMouseDown={(
                                                                                            e
                                                                                        ) =>
                                                                                            e.preventDefault()
                                                                                        }
                                                                                        onClick={() =>
                                                                                            handleSearchResultSelect(
                                                                                                result
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        <div className="text-sm font-medium text-deepbrown">
                                                                                            {
                                                                                                result.description
                                                                                            }
                                                                                        </div>
                                                                                    </div>
                                                                                )
                                                                            )
                                                                        )}
                                                                    </div>
                                                                </PopoverContent>
                                                            </Popover>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-deepbrown font-medium">
                                                            Select Location on Map
                                                        </Label>
                                                        <p className="text-xs text-deepbrown/70">
                                                            Click anywhere on the map to set the
                                                            exact coordinates for your custom
                                                            location.
                                                        </p>
                                                    </div>

                                                    <div className="h-[400px] rounded-xl overflow-hidden border-2 border-gold/20 shadow-lg">
                                                        <MapViewer
                                                            locations={getAllMapLocations()}
                                                            trips={trips}
                                                            selectedTripId={selectedTrip}
                                                            onLocationClick={handleLocationClick}
                                                            enableClustering={true}
                                                            showSearch={true}
                                                            showControls={true}
                                                            onLocationSelect={handleLocationSelect}
                                                        />
                                                    </div>

                                                    {newLocation.coordinates.lat !== 0 ? (
                                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                                            <div className="flex items-start gap-3">
                                                                <MapPin className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                                                                <div className="flex-1">
                                                                    <p className="text-sm font-medium text-green-800">
                                                                        ✓ Location Set Successfully
                                                                    </p>
                                                                    <p className="text-xs text-green-700 mt-1">
                                                                        Ready to save your custom
                                                                        location marker
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                                            <div className="flex items-start gap-3">
                                                                <MapPin className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                                                                <div className="flex-1">
                                                                    <p className="text-sm font-medium text-amber-800">
                                                                        Please Select a Location
                                                                    </p>
                                                                    <p className="text-xs text-amber-700 mt-1">
                                                                        Click on the map or search
                                                                        for a place to set
                                                                        coordinates
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gold/20">
                                                <div className="flex-1 text-left">
                                                    <p className="text-xs text-deepbrown/70">
                                                        * Required fields. Custom locations help you
                                                        organize and remember important places.
                                                    </p>
                                                </div>
                                                <div className="flex gap-3">
                                                    <DialogClose asChild>
                                                        <Button
                                                            variant="outline"
                                                            className="border-gold/30 bg-transparent"
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </DialogClose>
                                                    <Button
                                                        onClick={handleAddLocation}
                                                        disabled={
                                                            !newLocation.name.trim() ||
                                                            newLocation.coordinates.lat === 0
                                                        }
                                                        className="bg-gold hover:bg-gold/90 text-deepbrown font-medium min-w-[120px]"
                                                    >
                                                        {isAddingLocation ? (
                                                            <>
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                Adding...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Plus className="mr-2 h-4 w-4" />
                                                                Add Location
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>

                            <Tabs defaultValue="trips" className="w-full">
                                <TabsList className="bg-parchment-dark border border-gold/20 w-full grid grid-cols-5">
                                    <TabsTrigger value="trips" className="text-xs px-2 py-1">
                                        Trips
                                    </TabsTrigger>
                                    <TabsTrigger value="all" className="text-xs px-2 py-1">
                                        All
                                    </TabsTrigger>
                                    <TabsTrigger value="visited" className="text-xs px-2 py-1">
                                        Visited
                                    </TabsTrigger>
                                    <TabsTrigger value="planned" className="text-xs px-2 py-1">
                                        Planned
                                    </TabsTrigger>
                                    <TabsTrigger value="custom" className="text-xs px-2 py-1">
                                        Custom
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="trips" className="mt-4 space-y-2">
                                    {trips.map((trip, index) => (
                                        <motion.div
                                            key={trip.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="flex items-center gap-3 p-3 hover:bg-parchment rounded-lg transition-colors cursor-pointer group"
                                            onClick={() => handleTripSelection(trip.id)}
                                        >
                                            <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                                                <Route
                                                    className="h-4 w-4"
                                                    color={
                                                        trip.status === 'completed'
                                                            ? '#d4af37'
                                                            : trip.status === 'active'
                                                              ? '#4c6b54'
                                                              : trip.status === 'planned'
                                                                ? '#b22222'
                                                                : '#8B7355'
                                                    }
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-deepbrown">
                                                    {trip.name}
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-deepbrown/70">
                                                    <span className="capitalize">
                                                        {trip.status}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{trip.locationCount} locations</span>
                                                    <span>•</span>
                                                    <span>{trip.totalEntries} entries</span>
                                                </div>
                                            </div>
                                            <ChevronRight
                                                className={`h-4 w-4 text-deepbrown/50 transition-transform ${
                                                    selectedTrip === trip.id ? 'rotate-90' : ''
                                                }`}
                                            />
                                        </motion.div>
                                    ))}

                                    {standaloneEntries.length > 0 && (
                                        <div className="mt-6">
                                            <h4 className="text-sm font-medium text-deepbrown/70 mb-2 px-2">
                                                Standalone Entries
                                            </h4>
                                            {standaloneEntries.map((entry, index) => (
                                                <motion.div
                                                    key={entry.id}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{
                                                        delay: (trips.length + index) * 0.05,
                                                    }}
                                                    className="flex items-center gap-3 p-3 hover:bg-parchment rounded-lg transition-colors cursor-pointer"
                                                    onClick={() =>
                                                        handleLocationClick({
                                                            id: `standalone-${entry.id}`,
                                                            uid: user?.uid || '',
                                                            name: entry.location || entry.title,
                                                            lat: entry.coordinates?.lat || 0,
                                                            lng: entry.coordinates?.lng || 0,
                                                            type: 'visited',
                                                            entry,
                                                            isCustom: false,
                                                        })
                                                    }
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-forest/10 flex items-center justify-center">
                                                        <MapPin className="h-4 w-4 text-forest" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-deepbrown">
                                                            {entry.title}
                                                        </p>
                                                        <p className="text-xs text-deepbrown/70">
                                                            {entry.location}, {entry.country}
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="all" className="mt-4 space-y-2">
                                    {getAllMapLocations().map((location, index) => (
                                        <motion.div
                                            key={location.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="flex items-center gap-3 p-3 hover:bg-parchment rounded-lg transition-colors cursor-pointer group"
                                            onClick={() => handleLocationClick(location)}
                                        >
                                            <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                                                <MapPin
                                                    className="h-4 w-4"
                                                    color={
                                                        location.type === 'visited'
                                                            ? '#d4af37'
                                                            : location.type === 'planned'
                                                              ? '#4c6b54'
                                                              : location.type === 'favorite'
                                                                ? '#b22222'
                                                                : '#8B7355'
                                                    }
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-deepbrown">
                                                    {location.name}
                                                </p>
                                                <div className="flex items-center gap-1 text-xs text-deepbrown/70">
                                                    <span className="capitalize">
                                                        {location.type}
                                                    </span>
                                                    {location.trip && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="text-gold">
                                                                {location.trip.name}
                                                            </span>
                                                        </>
                                                    )}
                                                    {location.entry && (
                                                        <>
                                                            <span>•</span>
                                                            <span>
                                                                {format(
                                                                    new Date(
                                                                        location.entry.timestamp
                                                                    ),
                                                                    'MMM d, yyyy'
                                                                )}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            {location.isCustom && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveLocation(location.id);
                                                    }}
                                                >
                                                    <ChevronRight className="h-4 w-4 text-red-500" />
                                                </Button>
                                            )}
                                        </motion.div>
                                    ))}
                                </TabsContent>

                                <TabsContent value="visited" className="mt-4 space-y-2">
                                    {getLocationsByType('visited').map((location, index) => (
                                        <motion.div
                                            key={location.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="flex items-center gap-3 p-3 hover:bg-parchment rounded-lg transition-colors cursor-pointer"
                                            onClick={() =>
                                                handleLocationClick(
                                                    location as MapLocationWithDetails
                                                )
                                            }
                                        >
                                            <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                                                <MapPin className="h-4 w-4 text-gold" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-deepbrown">
                                                    {location.name}
                                                </p>
                                                <p className="text-xs text-deepbrown/70">Visited</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </TabsContent>

                                <TabsContent value="planned" className="mt-4 space-y-2">
                                    {getLocationsByType('planned').map((location, index) => (
                                        <motion.div
                                            key={location.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="flex items-center gap-3 p-3 hover:bg-parchment rounded-lg transition-colors cursor-pointer"
                                            onClick={() =>
                                                handleLocationClick(
                                                    location as MapLocationWithDetails
                                                )
                                            }
                                        >
                                            <div className="w-8 h-8 rounded-full bg-forest/10 flex items-center justify-center">
                                                <MapPin className="h-4 w-4 text-forest" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-deepbrown">
                                                    {location.name}
                                                </p>
                                                <p className="text-xs text-deepbrown/70">Planned</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </TabsContent>

                                <TabsContent value="custom" className="mt-4 space-y-2">
                                    {customLocations.map((location, index) => (
                                        <motion.div
                                            key={location.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="flex items-center gap-3 p-3 hover:bg-parchment rounded-lg transition-colors cursor-pointer group"
                                            onClick={() => handleLocationClick(location)}
                                        >
                                            <div className="w-8 h-8 rounded-full bg-deepbrown/10 flex items-center justify-center">
                                                <MapPin
                                                    className="h-4 w-4"
                                                    color={
                                                        location.type === 'visited'
                                                            ? '#d4af37'
                                                            : location.type === 'planned'
                                                              ? '#4c6b54'
                                                              : '#b22222'
                                                    }
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-deepbrown">
                                                    {location.name}
                                                </p>
                                                <p className="text-xs text-deepbrown/70 capitalize">
                                                    {location.type}
                                                </p>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveLocation(location.id);
                                                }}
                                            >
                                                <ChevronRight className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </motion.div>
                                    ))}
                                </TabsContent>
                            </Tabs>
                        </div>
                    </motion.div>

                    <div className="flex-1 relative">
                        <Button
                            variant="outline"
                            size="icon"
                            className="absolute top-4 left-4 z-10 bg-parchment/90 backdrop-blur-sm border-gold/30"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                        >
                            {sidebarOpen ? (
                                <ChevronLeft className="h-4 w-4" />
                            ) : (
                                <ChevronRight className="h-4 w-4" />
                            )}
                        </Button>

                        <MapViewer
                            locations={getAllMapLocations()}
                            trips={trips}
                            selectedTripId={selectedTrip}
                            onLocationClick={handleLocationClick}
                        />

                        <div className="absolute bottom-6 left-6 z-10">
                            <AnimatedButton animationType="glow" onClick={handleARViewClick}>
                                <Grid className="mr-2 h-4 w-4" />
                                Toggle AR View
                            </AnimatedButton>
                        </div>
                    </div>
                </div>
            </main>

            <LocationModal
                isOpen={showLocationModal}
                onClose={() => {
                    setShowLocationModal(false);
                    setSelectedLocation(null);
                }}
                entry={selectedLocation?.entry}
                trip={selectedLocation?.trip}
                locationName={selectedLocation?.name || ''}
                coordinates={
                    selectedLocation
                        ? { lat: selectedLocation.lat, lng: selectedLocation.lng }
                        : { lat: 0, lng: 0 }
                }
                type={selectedLocation?.type}
            />
        </div>
    );
}
