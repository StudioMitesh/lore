"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { addDoc, collection } from "firebase/firestore"
import { db } from "@/api/firebase"
import { useAuth } from "@/context/AuthContext"
import { type Entry } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export function AddEntryForm() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [entry, setEntry] = useState({
    title: "",
    content: "",
    date: "",
    location: "",
    country: "",
    coordinates: { lat: 0, lng: 0 },
    mediaUrls: [],
    tags: [],
    type: "journal" as Entry["type"],
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEntry({ ...entry, [e.target.name]: e.target.value })
  }

  const handleSubmit = async () => {
    if (!user) return
    setLoading(true)
    const newEntry: Entry = {
      ...entry,
      id: "",
      uid: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await addDoc(collection(db, "entries"), newEntry)
    setLoading(false)
    navigate("/dashboard")
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input name="title" value={entry.title} onChange={handleChange} />
      </div>
      <div>
        <Label htmlFor="location">Location</Label>
        <Input name="location" value={entry.location} onChange={handleChange} />
      </div>
      <div>
        <Label htmlFor="country">Country</Label>
        <Input name="country" value={entry.country} onChange={handleChange} />
      </div>
      <div>
        <Label htmlFor="date">Date</Label>
        <Input type="date" name="date" value={entry.date} onChange={handleChange} />
      </div>
      <div>
        <Label htmlFor="content">Story</Label>
        <Textarea name="content" value={entry.content} onChange={handleChange} />
      </div>
      <Button onClick={handleSubmit} disabled={loading}>{loading ? "Saving..." : "Save Entry"}</Button>
    </div>
  )
}
