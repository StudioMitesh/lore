import { 
    collection, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    getDocs, 
    getDoc, 
    query, 
    where, 
    orderBy, 
  } from 'firebase/firestore'
import { 
    ref, 
    uploadBytes, 
    getDownloadURL, 
    deleteObject 
  } from 'firebase/storage'
import { db, storage } from '@/api/firebase'
import { type Entry } from '@/lib/types'

  export interface CreateEntryData {
    title: string
    content: string
    date: string
    location: string
    country: string
    coordinates: {
      lat: number
      lng: number
    }
    tags?: string[]
    type: "journal" | "photo" | "map" | "artifact"
    isDraft?: boolean
  }
  
  class EntryService {
    private readonly COLLECTION_NAME = 'entries'
  
    async createEntry(uid: string, entryData: CreateEntryData, files?: File[]): Promise<string> {
      try {
        const mediaUrls: string[] = []
        if (files && files.length > 0) {
          console.log("Uploading files:", files)
        
          const uploadPromises = files.map(async (file) => {
            const fileRef = ref(storage, `entries/${uid}/${Date.now()}_${file.name}`)
            console.log("Uploading to:", fileRef.fullPath)
            const snapshot = await uploadBytes(fileRef, file)
            console.log("Upload complete for:", file.name)
            const url = await getDownloadURL(snapshot.ref)
            console.log("Got download URL:", url)
            return url
          })
        
          const urls = await Promise.all(uploadPromises)
          mediaUrls.push(...urls)
          console.log("All media URLs:", mediaUrls)
        }        
  
        const now = new Date().toISOString()
        const docRef = await addDoc(collection(db, this.COLLECTION_NAME), {
          ...entryData,
          uid,
          mediaUrls,
          createdAt: now,
          updatedAt: now,
          isFavorite: false,
          isDraft: entryData.isDraft ?? false,
        })
  
        return docRef.id
      } catch (error) {
        console.error('Error creating entry:', error)
        throw new Error('Failed to create entry')
      }
    }
  
    async updateEntry(entryId: string, updates: Partial<CreateEntryData>, newFiles?: File[]): Promise<void> {
      try {
        const entryRef = doc(db, this.COLLECTION_NAME, entryId)
        const entryDoc = await getDoc(entryRef)
        
        if (!entryDoc.exists()) {
          throw new Error('Entry not found')
        }
  
        const currentEntry = entryDoc.data() as Entry
        const mediaUrls = [...(currentEntry.mediaUrls || [])]
  
        if (newFiles && newFiles.length > 0) {
          const uploadPromises = newFiles.map(async (file) => {
            const fileRef = ref(storage, `entries/${currentEntry.uid}/${Date.now()}_${file.name}`)
            const snapshot = await uploadBytes(fileRef, file)
            return getDownloadURL(snapshot.ref)
          })
          const newUrls = await Promise.all(uploadPromises)
          mediaUrls.push(...newUrls)
        }
  
        await updateDoc(entryRef, {
          ...updates,
          mediaUrls,
          updatedAt: new Date().toISOString()
        })
      } catch (error) {
        console.error('Error updating entry:', error)
        throw new Error('Failed to update entry')
      }
    }
  
    async deleteEntry(entryId: string): Promise<void> {
      try {
        const entryRef = doc(db, this.COLLECTION_NAME, entryId)
        const entryDoc = await getDoc(entryRef)
        
        if (!entryDoc.exists()) {
          throw new Error('Entry not found')
        }
  
        const entry = entryDoc.data() as Entry
  
        if (entry.mediaUrls && entry.mediaUrls.length > 0) {
          const deletePromises = entry.mediaUrls.map(async (url) => {
            try {
              const fileRef = ref(storage, url)
              await deleteObject(fileRef)
            } catch (error) {
              console.warn('Failed to delete file:', url, error)
            }
          })
          await Promise.all(deletePromises)
        }
  
        await deleteDoc(entryRef)
      } catch (error) {
        console.error('Error deleting entry:', error)
        throw new Error('Failed to delete entry')
      }
    }
  
    async getUserEntries(uid: string, includesDrafts = true): Promise<Entry[]> {
      try {
        let q = query(
          collection(db, this.COLLECTION_NAME),
          where('uid', '==', uid),
          orderBy('createdAt', 'desc')
        )
  
        if (!includesDrafts) {
          q = query(
            collection(db, this.COLLECTION_NAME),
            where('uid', '==', uid),
            where('isDraft', '!=', true),
            orderBy('createdAt', 'desc')
          )
        }
  
        const querySnapshot = await getDocs(q)
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Entry))
      } catch (error) {
        console.error('Error fetching entries:', error)
        throw new Error('Failed to fetch entries')
      }
    }
  
    async getEntry(entryId: string): Promise<Entry | null> {
      try {
        const entryDoc = await getDoc(doc(db, this.COLLECTION_NAME, entryId))
        if (!entryDoc.exists()) return null
        
        return {
          id: entryDoc.id,
          ...entryDoc.data()
        } as Entry
      } catch (error) {
        console.error('Error fetching entry:', error)
        throw new Error('Failed to fetch entry')
      }
    }
  
    async getFavoriteEntries(uid: string): Promise<Entry[]> {
      try {
        const q = query(
          collection(db, this.COLLECTION_NAME),
          where('uid', '==', uid),
          where('isFavorite', '==', true),
          orderBy('createdAt', 'desc')
        )
  
        const querySnapshot = await getDocs(q)
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Entry))
      } catch (error) {
        console.error('Error fetching favorite entries:', error)
        throw new Error('Failed to fetch favorite entries')
      }
    }
  
    async getDraftEntries(uid: string): Promise<Entry[]> {
      try {
        const q = query(
          collection(db, this.COLLECTION_NAME),
          where('uid', '==', uid),
          where('isDraft', '==', true),
          orderBy('createdAt', 'desc')
        )
  
        const querySnapshot = await getDocs(q)
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Entry))
      } catch (error) {
        console.error('Error fetching draft entries:', error)
        throw new Error('Failed to fetch draft entries')
      }
    }
  
    async toggleFavorite(entryId: string): Promise<void> {
      try {
        const entryRef = doc(db, this.COLLECTION_NAME, entryId)
        const entryDoc = await getDoc(entryRef)
        
        if (!entryDoc.exists()) {
          throw new Error('Entry not found')
        }
  
        const currentEntry = entryDoc.data() as Entry
        await updateDoc(entryRef, {
          isFavorite: !currentEntry.isFavorite,
          updatedAt: new Date().toISOString()
        })
      } catch (error) {
        console.error('Error toggling favorite:', error)
        throw new Error('Failed to toggle favorite')
      }
    }
  
    async searchEntries(uid: string, searchTerm: string): Promise<Entry[]> {
      try {
        // note: basic client-side search, todo fix to use a better full-text search service 
        const entries = await this.getUserEntries(uid, false)
        
        const searchLower = searchTerm.toLowerCase()
        return entries.filter(entry => 
          entry.title.toLowerCase().includes(searchLower) ||
          entry.content.toLowerCase().includes(searchLower) ||
          entry.location.toLowerCase().includes(searchLower) ||
          entry.country.toLowerCase().includes(searchLower) ||
          entry.tags?.some(tag => tag.toLowerCase().includes(searchLower))
        )
      } catch (error) {
        console.error('Error searching entries:', error)
        throw new Error('Failed to search entries')
      }
    }
  
    async getEntriesByLocation(uid: string, location: string): Promise<Entry[]> {
      try {
        const q = query(
          collection(db, this.COLLECTION_NAME),
          where('uid', '==', uid),
          where('location', '==', location),
          orderBy('createdAt', 'desc')
        )
  
        const querySnapshot = await getDocs(q)
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Entry))
      } catch (error) {
        console.error('Error fetching entries by location:', error)
        throw new Error('Failed to fetch entries by location')
      }
    }
  
    async getUserStats(uid: string): Promise<{
      totalEntries: number
      countriesVisited: number
      continents: number
      latestEntryDate: string | null
      totalPhotos: number
    }> {
      try {
        const entries = await this.getUserEntries(uid, false)
        
        const countries = new Set(entries.map(entry => entry.country))
        const totalPhotos = entries.reduce((sum, entry) => sum + (entry.mediaUrls?.length || 0), 0)
        
        // continent mapping for simplicity (probably not necessary in the end tbh)
        const continentMap: { [key: string]: string } = {
          'United States': 'North America',
          'Canada': 'North America',
          'Mexico': 'North America',
          'Peru': 'South America',
          'Brazil': 'South America',
          'Japan': 'Asia',
          'China': 'Asia',
          'India': 'Asia',
          'Tanzania': 'Africa',
          'Morocco': 'Africa',
          'France': 'Europe',
          'Germany': 'Europe',
          'Norway': 'Europe',
          'Greece': 'Europe'
        }
        
        const continents = new Set(
          Array.from(countries).map(country => continentMap[country] || 'Unknown')
        )
  
        return {
          totalEntries: entries.length,
          countriesVisited: countries.size,
          continents: continents.size,
          latestEntryDate: entries.length > 0 ? entries[0].createdAt : null,
          totalPhotos
        }
      } catch (error) {
        console.error('Error calculating user stats:', error)
        throw new Error('Failed to calculate user stats')
      }
    }
  }
  
  export const entryService = new EntryService()