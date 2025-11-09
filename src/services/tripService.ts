import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  type Trip,
  type DayLog,
  type Entry,
  type CreateTripData,
  type CreateDayLogData,
  type TripWithDetails,
  type DayLogWithEntries,
} from '@/lib/types';

class TripService {
  private readonly TRIPS_COLLECTION = 'trips';
  private readonly DAYLOGS_COLLECTION = 'dayLogs';
  private readonly ENTRIES_COLLECTION = 'entries';

  async createTrip(uid: string, tripData: CreateTripData): Promise<string> {
    try {
      const now = new Date().toISOString();
      const docRef = await addDoc(collection(db, this.TRIPS_COLLECTION), {
        ...tripData,
        uid,
        status: tripData.status || 'draft',
        dayLogIds: [],
        entryIds: [],
        totalEntries: 0,
        countriesVisited: [],
        createdAt: now,
        updatedAt: now,
        isFavorite: false,
        tags: tripData.tags || [],
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating trip:', error);
      throw new Error('Failed to create trip');
    }
  }

  async updateTrip(tripId: string, updates: Partial<CreateTripData>): Promise<void> {
    try {
      const tripRef = doc(db, this.TRIPS_COLLECTION, tripId);
      await updateDoc(tripRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating trip:', error);
      throw new Error('Failed to update trip');
    }
  }

  async deleteTrip(tripId: string): Promise<void> {
    try {
      const batch = writeBatch(db);

      const dayLogsQuery = query(
        collection(db, this.DAYLOGS_COLLECTION),
        where('tripId', '==', tripId)
      );
      const dayLogsSnapshot = await getDocs(dayLogsQuery);

      dayLogsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      const entriesQuery = query(
        collection(db, this.ENTRIES_COLLECTION),
        where('tripId', '==', tripId)
      );
      const entriesSnapshot = await getDocs(entriesQuery);

      entriesSnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          tripId: null,
          dayLogId: null,
          isStandalone: true,
          updatedAt: new Date().toISOString(),
        });
      });

      batch.delete(doc(db, this.TRIPS_COLLECTION, tripId));

      await batch.commit();
    } catch (error) {
      console.error('Error deleting trip:', error);
      throw new Error('Failed to delete trip');
    }
  }

  async getUserTrips(uid: string): Promise<Trip[]> {
    try {
      const q = query(
        collection(db, this.TRIPS_COLLECTION),
        where('uid', '==', uid),
        orderBy('updatedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as Trip
      );
    } catch (error) {
      console.error('Error fetching trips:', error);
      throw new Error('Failed to fetch trips');
    }
  }

  async getTrip(tripId: string): Promise<Trip | null> {
    try {
      const tripDoc = await getDoc(doc(db, this.TRIPS_COLLECTION, tripId));
      if (!tripDoc.exists()) return null;

      return {
        id: tripDoc.id,
        ...tripDoc.data(),
      } as Trip;
    } catch (error) {
      console.error('Error fetching trip:', error);
      throw new Error('Failed to fetch trip');
    }
  }

  async getTripWithDetails(tripId: string): Promise<TripWithDetails | null> {
    try {
      const trip = await this.getTrip(tripId);
      if (!trip) return null;

      const dayLogs = await this.getTripDayLogs(tripId);
      const recentEntries = await this.getTripRecentEntries(tripId, 5);

      return {
        ...trip,
        dayLogs,
        recentEntries,
        locationCount: new Set(dayLogs.map((dl) => `${dl.location}, ${dl.country}`)).size,
      };
    } catch (error) {
      console.error('Error fetching trip with details:', error);
      throw new Error('Failed to fetch trip details');
    }
  }

  async createDayLog(dayLogData: CreateDayLogData): Promise<string> {
    try {
      const now = new Date().toISOString();
      const batch = writeBatch(db);

      const dayLogRef = doc(collection(db, this.DAYLOGS_COLLECTION));
      batch.set(dayLogRef, {
        ...dayLogData,
        entryIds: [],
        totalEntries: 0,
        createdAt: now,
        updatedAt: now,
      });

      const tripRef = doc(db, this.TRIPS_COLLECTION, dayLogData.tripId);
      batch.update(tripRef, {
        dayLogIds: increment(1),
        updatedAt: now,
      });

      await batch.commit();
      return dayLogRef.id;
    } catch (error) {
      console.error('Error creating day log:', error);
      throw new Error('Failed to create day log');
    }
  }

  async getTripDayLogs(tripId: string): Promise<DayLog[]> {
    try {
      const q = query(
        collection(db, this.DAYLOGS_COLLECTION),
        where('tripId', '==', tripId),
        orderBy('date', 'asc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as DayLog
      );
    } catch (error) {
      console.error('Error fetching day logs:', error);
      throw new Error('Failed to fetch day logs');
    }
  }

  async getDayLogWithEntries(dayLogId: string): Promise<DayLogWithEntries | null> {
    try {
      const dayLogDoc = await getDoc(doc(db, this.DAYLOGS_COLLECTION, dayLogId));
      if (!dayLogDoc.exists()) return null;

      const dayLog = { id: dayLogDoc.id, ...dayLogDoc.data() } as DayLog;

      const entriesQuery = query(
        collection(db, this.ENTRIES_COLLECTION),
        where('dayLogId', '==', dayLogId),
        orderBy('timestamp', 'asc')
      );
      const entriesSnapshot = await getDocs(entriesQuery);
      const entries = entriesSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as Entry
      );

      return {
        ...dayLog,
        entries,
      };
    } catch (error) {
      console.error('Error fetching day log with entries:', error);
      throw new Error('Failed to fetch day log with entries');
    }
  }

  async getTripEntries(tripId: string): Promise<Entry[]> {
    try {
      const q = query(
        collection(db, this.ENTRIES_COLLECTION),
        where('tripId', '==', tripId),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as Entry
      );
    } catch (error) {
      console.error('Error fetching trip entries:', error);
      throw new Error('Failed to fetch trip entries');
    }
  }

  async getTripRecentEntries(tripId: string, limit: number = 5): Promise<Entry[]> {
    try {
      const entries = await this.getTripEntries(tripId);
      return entries.slice(0, limit);
    } catch (error) {
      console.error('Error fetching recent trip entries:', error);
      throw new Error('Failed to fetch recent trip entries');
    }
  }

  async addEntryToTrip(entryId: string, tripId: string, dayLogId?: string): Promise<void> {
    try {
      const batch = writeBatch(db);

      const entryRef = doc(db, this.ENTRIES_COLLECTION, entryId);
      batch.update(entryRef, {
        tripId,
        dayLogId: dayLogId || null,
        isStandalone: false,
        updatedAt: new Date().toISOString(),
      });

      const tripRef = doc(db, this.TRIPS_COLLECTION, tripId);
      batch.update(tripRef, {
        totalEntries: increment(1),
        updatedAt: new Date().toISOString(),
      });

      if (dayLogId) {
        const dayLogRef = doc(db, this.DAYLOGS_COLLECTION, dayLogId);
        batch.update(dayLogRef, {
          totalEntries: increment(1),
          updatedAt: new Date().toISOString(),
        });
      }

      await batch.commit();
    } catch (error) {
      console.error('Error adding entry to trip:', error);
      throw new Error('Failed to add entry to trip');
    }
  }

  async removeEntryFromTrip(entryId: string): Promise<void> {
    try {
      const entryDoc = await getDoc(doc(db, this.ENTRIES_COLLECTION, entryId));
      if (!entryDoc.exists()) throw new Error('Entry not found');

      const entry = entryDoc.data() as Entry;
      const batch = writeBatch(db);

      batch.update(entryDoc.ref, {
        tripId: null,
        dayLogId: null,
        isStandalone: true,
        updatedAt: new Date().toISOString(),
      });

      if (entry.tripId) {
        const tripRef = doc(db, this.TRIPS_COLLECTION, entry.tripId);
        batch.update(tripRef, {
          totalEntries: increment(-1),
          updatedAt: new Date().toISOString(),
        });
      }

      if (entry.dayLogId) {
        const dayLogRef = doc(db, this.DAYLOGS_COLLECTION, entry.dayLogId);
        batch.update(dayLogRef, {
          totalEntries: increment(-1),
          updatedAt: new Date().toISOString(),
        });
      }

      await batch.commit();
    } catch (error) {
      console.error('Error removing entry from trip:', error);
      throw new Error('Failed to remove entry from trip');
    }
  }

  async toggleTripFavorite(tripId: string): Promise<void> {
    try {
      const tripRef = doc(db, this.TRIPS_COLLECTION, tripId);
      const tripDoc = await getDoc(tripRef);

      if (!tripDoc.exists()) {
        throw new Error('Trip not found');
      }

      const currentTrip = tripDoc.data() as Trip;
      await updateDoc(tripRef, {
        isFavorite: !currentTrip.isFavorite,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error toggling trip favorite:', error);
      throw new Error('Failed to toggle trip favorite');
    }
  }

  async updateTripComputedFields(tripId: string): Promise<void> {
    try {
      const entries = await this.getTripEntries(tripId);
      const countries = new Set(entries.map((entry) => entry.country));

      const tripRef = doc(db, this.TRIPS_COLLECTION, tripId);
      await updateDoc(tripRef, {
        entryIds: entries.map((e) => e.id),
        totalEntries: entries.length,
        countriesVisited: Array.from(countries),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating trip computed fields:', error);
      throw new Error('Failed to update trip computed fields');
    }
  }

  async searchTrips(uid: string, searchTerm: string): Promise<Trip[]> {
    try {
      // basic client-side search - could be improved with proper search service
      const trips = await this.getUserTrips(uid);

      const searchLower = searchTerm.toLowerCase();
      return trips.filter(
        (trip) =>
          trip.name.toLowerCase().includes(searchLower) ||
          trip.description?.toLowerCase().includes(searchLower) ||
          trip.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
      );
    } catch (error) {
      console.error('Error searching trips:', error);
      throw new Error('Failed to search trips');
    }
  }

  async getTripsByStatus(uid: string, status: Trip['status']): Promise<Trip[]> {
    try {
      const q = query(
        collection(db, this.TRIPS_COLLECTION),
        where('uid', '==', uid),
        where('status', '==', status),
        orderBy('updatedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as Trip
      );
    } catch (error) {
      console.error('Error fetching trips by status:', error);
      throw new Error('Failed to fetch trips by status');
    }
  }
}

export const tripService = new TripService();
