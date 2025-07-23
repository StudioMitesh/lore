export interface LorePoint {
    id: string
    title: string
    description: string
    coordinates: {
      lat: number
      lng: number
    }
    imageUrl?: string
    createdBy: string
    tags: string[]
    createdAt: string
  }
  
  export interface UserProfile {
    uid: string
    displayName: string
    avatarUrl?: string
    role: "explorer" | "admin"
    favorites: string[]
    createdAt: string
  }
  