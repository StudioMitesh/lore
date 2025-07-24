"use client"

import { useEffect, useState } from "react"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { motion } from "framer-motion"
import { Settings, Download, Share2, Save } from "lucide-react"

import { db } from "../api/firebase"
import { useAuth } from "../context/AuthContext"
import { type UserProfile } from "../lib/types"

import { Navbar } from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileCard } from "@/components/ui/profile-card"
import { LoreTimeline } from "@/components/ui/lore-timeline"
import { EntryCard } from "@/components/ui/entry-card"
import { AnimatedButton } from "@/components/ui/animated-button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { StatCard } from "@/components/StatCard"

export default function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState<Partial<UserProfile>>({})

  useEffect(() => {
    if (!user) return

    const fetchProfile = async () => {
      const profileRef = doc(db, "profiles", user.uid)
      const snap = await getDoc(profileRef)

      if (snap.exists()) {
        const data = snap.data() as UserProfile
        setProfile(data)
        setFormData(data)
      }
    }

    fetchProfile()
  }, [user])

  const handleChange = (field: keyof UserProfile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleNestedChange = (group: string, key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [group]: {
        ...(prev as any)[group],
        [key]: value
      }
    }))
  }

  const handleArrayChange = (field: keyof UserProfile, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value.split(',').map(item => item.trim())
    }))
  }

  const handleSave = async () => {
    if (!user) return
    const ref = doc(db, "profiles", user.uid)
    await updateDoc(ref, {
      ...formData,
      updatedAt: new Date().toISOString(),
    })
    setProfile(formData as UserProfile)
    setEditMode(false)
  }

  if (!profile) return <div className="p-10 text-center">Loading profile...</div>

  return (
    <div className="min-h-screen flex flex-col parchment-texture">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
            {/* Profile Column */}
            <div className="space-y-6">
              <ProfileCard
                name={`${profile.first_name} ${profile.last_name}`}
                username={profile.username}
                avatarUrl={profile.avatarUrl || "/placeholder.svg"}
                bio={profile.bio}
                stats={profile.stats}
              />

              <div className="flex flex-col gap-3">
                {!editMode ? (
                  <Button variant="outline" className="w-full justify-start" onClick={() => setEditMode(true)}>
                    <Settings className="mr-2 h-4 w-4" /> Edit Profile
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full justify-start" onClick={handleSave}>
                    <Save className="mr-2 h-4 w-4" /> Save Changes
                  </Button>
                )}

                <AnimatedButton className="w-full justify-start" animationType="glow">
                  <Download className="mr-2 h-4 w-4" />
                  Export My Lore
                </AnimatedButton>
                <Button variant="outline" className="w-full justify-start">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Profile
                </Button>
              </div>

              {/* Editable Fields */}
              {editMode && (
                <div className="space-y-4 mt-6">
                  <Input value={formData.first_name || ""} onChange={e => handleChange("first_name", e.target.value)} placeholder="First Name" />
                  <Input value={formData.last_name || ""} onChange={e => handleChange("last_name", e.target.value)} placeholder="Last Name" />
                  <Input value={formData.username || ""} onChange={e => handleChange("username", e.target.value)} placeholder="Username" />
                  <Input value={formData.email || ""} disabled placeholder="Email" />
                  <Textarea value={formData.bio || ""} onChange={e => handleChange("bio", e.target.value)} placeholder="Bio" />
                  <Input value={formData.location || ""} onChange={e => handleChange("location", e.target.value)} placeholder="Location" />
                  <Input value={formData.website || ""} onChange={e => handleChange("website", e.target.value)} placeholder="Website" />

                  {/* Social Links */}
                  <h4 className="text-sm text-muted-foreground mt-4">Social Links</h4>
                  {["twitter", "instagram", "linkedin", "github"].map((platform) => (
                    <Input
                      key={platform}
                      placeholder={`${platform.charAt(0).toUpperCase() + platform.slice(1)} URL`}
                      value={formData.socialLinks?.[platform as keyof typeof formData.socialLinks] || ""}
                      onChange={(e) => handleNestedChange("socialLinks", platform, e.target.value)}
                    />
                  ))}

                  {/* Array Fields */}
                  <h4 className="text-sm text-muted-foreground mt-4">Lists (comma-separated)</h4>
                  <Input
                    placeholder="Interests (comma-separated)"
                    value={(formData.interests || []).join(", ")}
                    onChange={(e) => handleArrayChange("interests", e.target.value)}
                  />
                  <Input
                    placeholder="Languages Spoken (comma-separated)"
                    value={(formData.languagesSpoken || []).join(", ")}
                    onChange={(e) => handleArrayChange("languagesSpoken", e.target.value)}
                  />
                  <Input
                    placeholder="Favorite Places (comma-separated)"
                    value={(formData.favoritePlaces || []).join(", ")}
                    onChange={(e) => handleArrayChange("favoritePlaces", e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Main Content Column */}
            <div className="space-y-8">
              <Tabs defaultValue="entries" className="w-full">
                <TabsList className="bg-parchment-dark border border-gold/20">
                  <TabsTrigger value="entries">Recent Entries</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="stats">Travel Stats</TabsTrigger>
                </TabsList>

                <TabsContent value="entries" className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <EntryCard
                      id="temp"
                      title="Placeholder Entry"
                      location="Unknown"
                      date={new Date()}
                      excerpt="This is a placeholder for a real entry."
                      imageUrl="/placeholder.svg"
                      index={0}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="timeline" className="mt-6">
                  <div className="bg-parchment-light rounded-2xl border border-gold/20 p-6">
                    <h3 className="font-display text-xl font-medium text-deepbrown mb-6">Your Travel Timeline</h3>
                    <LoreTimeline entries={[]} />
                  </div>
                </TabsContent>

                <TabsContent value="stats" className="mt-6">
                  <div className="bg-parchment-light rounded-2xl border border-gold/20 p-6">
                    <h3 className="font-display text-xl font-medium text-deepbrown mb-6">Travel Statistics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <StatCard label="Total Entries" value={profile.stats.entries} />
                      <StatCard label="Countries" value={profile.stats.countries} />
                      <StatCard label="Continents" value={profile.stats.continents} />
                    </div>

                    <h4 className="font-display text-lg font-medium text-deepbrown mb-4">Travel Badges</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {profile.badges?.slice(0, 4).map((badge, i) => (
                        <motion.div
                          key={badge.id}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.1 }}
                          className="bg-parchment p-3 rounded-xl border border-gold/10 text-center"
                        >
                          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gold/10 flex items-center justify-center">
                            <span className="text-2xl" role="img" aria-label={badge.name}>
                              {badge.icon}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-deepbrown">{badge.description}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
