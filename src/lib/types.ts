export interface UserProfile {
    uid: string
    first_name: string
    last_name: string
    username: string
    email: string
    avatarUrl?: string
    coverPhotoUrl?: string
    bio: string
    location?: string
    website?: string
    socialLinks?: {
      twitter?: string
      instagram?: string
      linkedin?: string
      github?: string
    }
    interests?: string[]
    languagesSpoken?: string[]
    favoritePlaces?: string[]
    stats: {
      entries: number
      countries: number
      continents: number
      badges: number
      totalPhotos?: number
      totalTrips?: number
      activeDays?: number
    }
    badges: Badge[]
    createdAt: string
    updatedAt?: string
    favorites: string[] // Entry IDs
  }
  
  export interface Entry {
    id: string
    tripId?: string
    dayLogId?: string
    uid: string
    title: string
    content: string
    timestamp: string
    location: string
    country: string
    coordinates: {
      lat: number
      lng: number
    }
    mediaUrls: string[]
    tags?: string[]
    type: "journal" | "photo" | "map" | "artifact" | "event"
    createdAt: string
    updatedAt?: string
    isDraft?: boolean
    isFavorite?: boolean
    isStandalone?: boolean
  }

  export interface Trip {
    id: string
    uid: string
    name: string
    description?: string
    startDate: string
    endDate?: string
    coverImageUrl?: string
    status: "draft" | "planned" | "active" | "completed"
    dayLogIDs: string[]
    entryIDs: string[]
    totalEntries: number
    createdAt: string
    updatedAt?: string
    isFavorite?: boolean
    countriesVisited: string[]
    companions: string[]
    tags?: string[]
  }

  export interface DayLog {
    id: string
    tripId: string
    uid: string
    date: string
    location: string
    country: string
    coordinates: { lat: number; lng: number }
    description?: string
    entryIds: string[]
    totalEntries: number
    createdAt: string
    updatedAt?: string
  }
  
  export interface TimelineEvent {
    id: string
    uid: string
    title: string
    timestamp: string
    location: string
    country: string
    type: "journal" | "photo" | "map" | "artifact" | "event"
    createdAt: string
    tripId?: string
    dayLogId?: string
  }
  
  export interface Badge {
    id: string
    name: string
    description: string
    icon: string
    awardedAt: string
  }
  
  export interface Comment {
    id: string
    entryId: string
    uid: string
    username: string
    avatarUrl?: string
    content: string
    createdAt: string
  }
  
  export interface Like {
    id: string
    entryId: string
    uid: string
    createdAt: string
  }
  
  export interface Notification {
    id: string
    uid: string
    type: "comment" | "like" | "follow" | "badge" | "system"
    message: string
    link?: string
    read: boolean
    createdAt: string
  }
  
  export interface Follow {
    followerId: string
    followingId: string
    createdAt: string
  }
  
  export interface UserSettings {
    uid: string
    theme: "light" | "dark" | "auto"
    emailNotifications: boolean
    pushNotifications: boolean
    language: string
    createdAt: string
    updatedAt?: string
  }
  
  export interface MapLocation {
    id: string
    uid?: string
    name: string
    lat: number
    lng: number
    type: "visited" | "planned" | "favorite"
    tripId?: string
    dayLogId?: string
    entryId?: string
    isCustom?: boolean // true if custom add, false if from entry/trip/daylog
  }
  
  export interface ExportedEntry {
    id: string
    entryId: string
    uid: string
    format: "pdf" | "markdown" | "html"
    shared: boolean
    createdAt: string
  }
  
  export interface Feedback {
    id: string
    uid?: string
    email?: string
    message: string
    rating?: number // 1–5
    createdAt: string
  }
  
  export interface SystemLog {
    id: string
    level: "info" | "warn" | "error"
    message: string
    details?: string
    createdAt: string
  }
  
  export interface UserStats {
    totalEntries: number
    countriesVisited: number
    continents: number
    latestEntryDate: string | null
    totalPhotos: number
    totalTrips: number
    activeDays: number
  }

  export interface CreateTripData {
    name: string
    description?: string
    startDate: string
    endDate?: string
    status?: "draft" | "planned" | "active" | "completed"
    tags?: string[]
    coverImageUrl?: string
  }
  
  export interface CreateDayLogData {
    tripId: string
    date: string
    location: string
    country: string
    coordinates: { lat: number; lng: number }
    description?: string
  }
  
  export interface CreateEntryData {
    title: string
    content: string
    timestamp: string
    location: string
    country: string
    coordinates: { lat: number; lng: number }
    tags?: string[]
    type: "journal" | "photo" | "map" | "artifact" | "event"
    isDraft?: boolean
    tripId?: string
    dayLogId?: string
    isStandalone?: boolean
  }
  
  export interface TripWithDetails extends Trip {
    dayLogs: DayLog[]
    recentEntries: Entry[]
    locationCount: number
  }
  
  export interface DayLogWithEntries extends DayLog {
    entries: Entry[]
  }
  
  export interface EntryWithTripInfo extends Entry {
    tripName?: string
    dayLogDate?: string
  }