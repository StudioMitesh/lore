import {
  collection,
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
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import {
  type Entry,
  type CreateEntryData,
  type EntryWithTripInfo,
  type UserStats,
} from '@/lib/types';
import { tripService } from './tripService';

class EntryService {
  private readonly ENTRIES_COLLECTION = 'entries';
  private readonly TIMELINE_COLLECTION = 'timelineEvents';

  async createEntry(uid: string, entryData: CreateEntryData, files?: File[]): Promise<string> {
    try {
      const mediaUrls: string[] = [];
      if (files && files.length > 0) {
        console.log('Uploading files:', files);

        const uploadPromises = files.map(async (file) => {
          const fileRef = ref(storage, `entries/${uid}/${Date.now()}_${file.name}`);
          console.log('Uploading to:', fileRef.fullPath);
          const snapshot = await uploadBytes(fileRef, file);
          console.log('Upload complete for:', file.name);
          const url = await getDownloadURL(snapshot.ref);
          console.log('Got download URL:', url);
          return url;
        });

        const urls = await Promise.all(uploadPromises);
        mediaUrls.push(...urls);
        console.log('All media URLs:', mediaUrls);
      }

      const now = new Date().toISOString();
      const batch = writeBatch(db);

      const entryRef = doc(collection(db, this.ENTRIES_COLLECTION));
      const entryDoc = {
        ...entryData,
        uid,
        mediaUrls,
        createdAt: now,
        updatedAt: now,
        isFavorite: false,
        isDraft: entryData.isDraft ?? false,
        isStandalone: !entryData.tripId,
      };

      batch.set(entryRef, entryDoc);

      if (!entryData.isDraft) {
        const timelineRef = doc(collection(db, this.TIMELINE_COLLECTION));
        batch.set(timelineRef, {
          id: entryRef.id,
          uid,
          title: entryData.title,
          timestamp: entryData.timestamp,
          location: entryData.location,
          country: entryData.country,
          type: entryData.type,
          tripId: entryData.tripId || null,
          dayLogId: entryData.dayLogId || null,
          createdAt: now,
        });

        if (entryData.tripId) {
          const tripRef = doc(db, 'trips', entryData.tripId);
          batch.update(tripRef, {
            totalEntries: increment(1),
            updatedAt: now,
          });
        }

        if (entryData.dayLogId) {
          const dayLogRef = doc(db, 'dayLogs', entryData.dayLogId);
          batch.update(dayLogRef, {
            totalEntries: increment(1),
            updatedAt: now,
          });
        }
      }

      await batch.commit();
      return entryRef.id;
    } catch (error) {
      console.error('Error creating entry:', error);
      throw new Error('Failed to create entry');
    }
  }

  async updateEntry(
    entryId: string,
    updates: Partial<CreateEntryData>,
    newFiles?: File[]
  ): Promise<void> {
    try {
      const entryRef = doc(db, this.ENTRIES_COLLECTION, entryId);
      const entryDoc = await getDoc(entryRef);

      if (!entryDoc.exists()) {
        throw new Error('Entry not found');
      }

      const currentEntry = entryDoc.data() as Entry;
      const mediaUrls = [...(currentEntry.mediaUrls || [])];

      if (newFiles && newFiles.length > 0) {
        const uploadPromises = newFiles.map(async (file) => {
          const fileRef = ref(storage, `entries/${currentEntry.uid}/${Date.now()}_${file.name}`);
          const snapshot = await uploadBytes(fileRef, file);
          return getDownloadURL(snapshot.ref);
        });
        const newUrls = await Promise.all(uploadPromises);
        mediaUrls.push(...newUrls);
      }

      const updateData: any = {
        ...updates,
        mediaUrls,
        updatedAt: new Date().toISOString(),
      };

      if (updates.timestamp) {
        updateData.date = updates.timestamp.split('T')[0];
      }

      await updateDoc(entryRef, updateData);

      if (!currentEntry.isDraft && !updates.isDraft) {
        try {
          const timelineQuery = query(
            collection(db, this.TIMELINE_COLLECTION),
            where('id', '==', entryId)
          );
          const timelineSnapshot = await getDocs(timelineQuery);

          if (!timelineSnapshot.empty) {
            const timelineDoc = timelineSnapshot.docs[0];
            await updateDoc(timelineDoc.ref, {
              title: updates.title || currentEntry.title,
              timestamp: updates.timestamp || currentEntry.timestamp,
              location: updates.location || currentEntry.location,
              country: updates.country || currentEntry.country,
              type: updates.type || currentEntry.type,
            });
          }
        } catch (timelineError) {
          console.warn('Failed to update timeline event:', timelineError);
        }
      }
    } catch (error) {
      console.error('Error updating entry:', error);
      throw new Error('Failed to update entry');
    }
  }

  async deleteEntry(entryId: string): Promise<void> {
    try {
      const entryRef = doc(db, this.ENTRIES_COLLECTION, entryId);
      const entryDoc = await getDoc(entryRef);

      if (!entryDoc.exists()) {
        throw new Error('Entry not found');
      }

      const entry = entryDoc.data() as Entry;
      const batch = writeBatch(db);

      if (entry.mediaUrls && entry.mediaUrls.length > 0) {
        const deletePromises = entry.mediaUrls.map(async (url) => {
          try {
            const fileRef = ref(storage, url);
            await deleteObject(fileRef);
          } catch (error) {
            console.warn('Failed to delete file:', url, error);
          }
        });
        await Promise.all(deletePromises);
      }

      batch.delete(entryRef);

      const timelineQuery = query(
        collection(db, this.TIMELINE_COLLECTION),
        where('id', '==', entryId)
      );
      const timelineSnapshot = await getDocs(timelineQuery);
      timelineSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      if (entry.tripId) {
        const tripRef = doc(db, 'trips', entry.tripId);
        batch.update(tripRef, {
          totalEntries: increment(-1),
          updatedAt: new Date().toISOString(),
        });
      }

      if (entry.dayLogId) {
        const dayLogRef = doc(db, 'dayLogs', entry.dayLogId);
        batch.update(dayLogRef, {
          totalEntries: increment(-1),
          updatedAt: new Date().toISOString(),
        });
      }

      await batch.commit();
    } catch (error) {
      console.error('Error deleting entry:', error);
      throw new Error('Failed to delete entry');
    }
  }

  async getUserEntries(uid: string, includeDrafts = true): Promise<Entry[]> {
    try {
      let q = query(
        collection(db, this.ENTRIES_COLLECTION),
        where('uid', '==', uid),
        orderBy('timestamp', 'desc')
      );

      if (!includeDrafts) {
        q = query(
          collection(db, this.ENTRIES_COLLECTION),
          where('uid', '==', uid),
          where('isDraft', '!=', true),
          orderBy('timestamp', 'desc')
        );
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as Entry
      );
    } catch (error) {
      console.error('Error fetching entries:', error);
      throw new Error('Failed to fetch entries');
    }
  }

  async getUserEntriesWithTripInfo(
    uid: string,
    includeDrafts = true
  ): Promise<EntryWithTripInfo[]> {
    try {
      const entries = await this.getUserEntries(uid, includeDrafts);

      const entriesWithTripInfo: EntryWithTripInfo[] = [];

      for (const entry of entries) {
        let tripName: string | undefined;
        let dayLogDate: string | undefined;

        if (entry.tripId) {
          try {
            const trip = await tripService.getTrip(entry.tripId);
            tripName = trip?.name;
          } catch (error) {
            console.warn(`Failed to fetch trip ${entry.tripId}:`, error);
          }
        }

        if (entry.dayLogId) {
          try {
            const dayLogDoc = await getDoc(doc(db, 'dayLogs', entry.dayLogId));
            if (dayLogDoc.exists()) {
              dayLogDate = dayLogDoc.data().date;
            }
          } catch (error) {
            console.warn(`Failed to fetch day log ${entry.dayLogId}:`, error);
          }
        }

        entriesWithTripInfo.push({
          ...entry,
          tripName,
          dayLogDate,
        });
      }

      return entriesWithTripInfo;
    } catch (error) {
      console.error('Error fetching entries with trip info:', error);
      throw new Error('Failed to fetch entries with trip info');
    }
  }

  async getEntry(entryId: string): Promise<Entry | null> {
    try {
      const entryDoc = await getDoc(doc(db, this.ENTRIES_COLLECTION, entryId));
      if (!entryDoc.exists()) return null;

      return {
        id: entryDoc.id,
        ...entryDoc.data(),
      } as Entry;
    } catch (error) {
      console.error('Error fetching entry:', error);
      throw new Error('Failed to fetch entry');
    }
  }

  async getStandaloneEntries(uid: string): Promise<Entry[]> {
    try {
      const q = query(
        collection(db, this.ENTRIES_COLLECTION),
        where('uid', '==', uid),
        where('isStandalone', '==', true),
        where('isDraft', '!=', true),
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
      console.error('Error fetching standalone entries:', error);
      throw new Error('Failed to fetch standalone entries');
    }
  }

  async getFavoriteEntries(uid: string): Promise<Entry[]> {
    try {
      const q = query(
        collection(db, this.ENTRIES_COLLECTION),
        where('uid', '==', uid),
        where('isFavorite', '==', true),
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
      console.error('Error fetching favorite entries:', error);
      throw new Error('Failed to fetch favorite entries');
    }
  }

  async getDraftEntries(uid: string): Promise<Entry[]> {
    try {
      const q = query(
        collection(db, this.ENTRIES_COLLECTION),
        where('uid', '==', uid),
        where('isDraft', '==', true),
        orderBy('createdAt', 'desc')
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
      console.error('Error fetching draft entries:', error);
      throw new Error('Failed to fetch draft entries');
    }
  }

  async toggleFavorite(entryId: string): Promise<void> {
    try {
      const entryRef = doc(db, this.ENTRIES_COLLECTION, entryId);
      const entryDoc = await getDoc(entryRef);

      if (!entryDoc.exists()) {
        throw new Error('Entry not found');
      }

      const currentEntry = entryDoc.data() as Entry;
      await updateDoc(entryRef, {
        isFavorite: !currentEntry.isFavorite,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw new Error('Failed to toggle favorite');
    }
  }

  async searchEntries(uid: string, searchTerm: string): Promise<Entry[]> {
    try {
      // basic client-side search, can be improved with proper full-text search service
      const entries = await this.getUserEntries(uid, false);

      const searchLower = searchTerm.toLowerCase();
      return entries.filter(
        (entry) =>
          entry.title.toLowerCase().includes(searchLower) ||
          entry.content.toLowerCase().includes(searchLower) ||
          entry.location.toLowerCase().includes(searchLower) ||
          entry.country.toLowerCase().includes(searchLower) ||
          entry.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
      );
    } catch (error) {
      console.error('Error searching entries:', error);
      throw new Error('Failed to search entries');
    }
  }

  async getEntriesByLocation(uid: string, location: string): Promise<Entry[]> {
    try {
      const q = query(
        collection(db, this.ENTRIES_COLLECTION),
        where('uid', '==', uid),
        where('location', '==', location),
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
      console.error('Error fetching entries by location:', error);
      throw new Error('Failed to fetch entries by location');
    }
  }

  async getEntriesByDateRange(uid: string, startDate: string, endDate: string): Promise<Entry[]> {
    try {
      const q = query(
        collection(db, this.ENTRIES_COLLECTION),
        where('uid', '==', uid),
        where('timestamp', '>=', startDate),
        where('timestamp', '<=', endDate),
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
      console.error('Error fetching entries by date range:', error);
      throw new Error('Failed to fetch entries by date range');
    }
  }

  async convertEntryToTrip(entryId: string, tripName: string): Promise<string> {
    try {
      const entry = await this.getEntry(entryId);
      if (!entry) throw new Error('Entry not found');

      const tripId = await tripService.createTrip(entry.uid, {
        name: tripName,
        description: `Trip created from entry: ${entry.title}`,
        startDate: entry.timestamp.split('T')[0],
        status: 'completed',
      });

      await tripService.addEntryToTrip(entryId, tripId);

      return tripId;
    } catch (error) {
      console.error('Error converting entry to trip:', error);
      throw new Error('Failed to convert entry to trip');
    }
  }

  async publishDraft(entryId: string): Promise<void> {
    try {
      const entryRef = doc(db, this.ENTRIES_COLLECTION, entryId);
      const entryDoc = await getDoc(entryRef);

      if (!entryDoc.exists()) {
        throw new Error('Entry not found');
      }

      const entry = entryDoc.data() as Entry;
      if (!entry.isDraft) {
        throw new Error('Entry is not a draft');
      }

      const batch = writeBatch(db);
      const now = new Date().toISOString();

      batch.update(entryRef, {
        isDraft: false,
        updatedAt: now,
      });

      const timelineRef = doc(collection(db, this.TIMELINE_COLLECTION));
      batch.set(timelineRef, {
        id: entryId,
        uid: entry.uid,
        title: entry.title,
        timestamp: entry.timestamp,
        location: entry.location,
        country: entry.country,
        type: entry.type,
        tripId: entry.tripId || null,
        dayLogId: entry.dayLogId || null,
        createdAt: now,
      });

      if (entry.tripId) {
        const tripRef = doc(db, 'trips', entry.tripId);
        batch.update(tripRef, {
          totalEntries: increment(1),
          updatedAt: now,
        });
      }

      if (entry.dayLogId) {
        const dayLogRef = doc(db, 'dayLogs', entry.dayLogId);
        batch.update(dayLogRef, {
          totalEntries: increment(1),
          updatedAt: now,
        });
      }

      await batch.commit();
    } catch (error) {
      console.error('Error publishing draft:', error);
      throw new Error('Failed to publish draft');
    }
  }

  async getUserStats(uid: string): Promise<UserStats> {
    try {
      const [entries, trips] = await Promise.all([
        this.getUserEntries(uid, false),
        tripService.getUserTrips(uid),
      ]);

      const countries = new Set(entries.map((entry) => entry.country));
      const totalPhotos = entries.reduce((sum, entry) => sum + (entry.mediaUrls?.length || 0), 0);
      const activeDates = new Set(entries.map((entry) => entry.timestamp.split('T')[0]));
      const continentMap: { [key: string]: string } = {
        'United States': 'North America',
        Canada: 'North America',
        Mexico: 'North America',
        Peru: 'South America',
        Brazil: 'South America',
        Argentina: 'South America',
        Japan: 'Asia',
        China: 'Asia',
        India: 'Asia',
        Thailand: 'Asia',
        Tanzania: 'Africa',
        Morocco: 'Africa',
        'South Africa': 'Africa',
        France: 'Europe',
        Germany: 'Europe',
        Norway: 'Europe',
        Greece: 'Europe',
        'United Kingdom': 'Europe',
        Australia: 'Oceania',
        'New Zealand': 'Oceania',
      };

      const continents = new Set(
        Array.from(countries).map((country) => continentMap[country] || 'Unknown')
      );

      return {
        totalEntries: entries.length,
        countriesVisited: countries.size,
        continents: continents.size,
        latestEntryDate: entries.length > 0 ? entries[0].timestamp : null,
        totalPhotos,
        totalTrips: trips.length,
        activeDays: activeDates.size,
      };
    } catch (error) {
      console.error('Error calculating user stats:', error);
      throw new Error('Failed to calculate user stats');
    }
  }

  async getMapLocations(uid: string): Promise<any[]> {
    try {
      const entries = await this.getUserEntries(uid, false);

      return entries
        .map((entry) => ({
          id: entry.id,
          name: entry.location,
          lat: entry.coordinates.lat,
          lng: entry.coordinates.lng,
          type: 'visited' as const,
          tripId: entry.tripId,
          dayLogId: entry.dayLogId,
          entryId: entry.id,
          isCustom: false,
          entry,
        }))
        .filter((location) => location.lat !== 0 || location.lng !== 0);
    } catch (error) {
      console.error('Error fetching map locations:', error);
      throw new Error('Failed to fetch map locations');
    }
  }
}

export const entryService = new EntryService();
