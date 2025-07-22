"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Save, ImageIcon, MapPin, Calendar, X } from "lucide-react"
import { Navbar } from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { AnimatedButton } from "@/components/ui/animated-button"

export default function NewEntryPage() {
  const [images, setImages] = React.useState<string[]>(["/placeholder.svg?height=400&width=600"])

  const handleAddImage = () => {
    setImages([...images, "/placeholder.svg?height=400&width=600"])
  }

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  return (
    <div className="min-h-screen flex flex-col parchment-texture">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-4xl">
          <div className="flex justify-between items-center mb-8">
            <h1 className="font-display text-3xl font-bold text-deepbrown">Create New Entry</h1>
            <AnimatedButton animationType="wax-stamp">
              <Save className="mr-2 h-4 w-4" />
              Save Lore
            </AnimatedButton>
          </div>

          <div className="space-y-8">
            <Card className="border-gold/20 bg-parchment-light">
              <CardHeader>
                <CardTitle className="text-xl text-deepbrown">Entry Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Enter a title for your adventure"
                    className="bg-parchment border-gold/30"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-deepbrown/50" />
                      <Input
                        id="location"
                        placeholder="Where did you go?"
                        className="pl-9 bg-parchment border-gold/30"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-deepbrown/50" />
                      <Input id="date" type="date" className="pl-9 bg-parchment border-gold/30" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-gold/20 bg-parchment-light">
              <CardHeader>
                <CardTitle className="text-xl text-deepbrown">Your Story</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Tell your adventure story..."
                  className="min-h-[200px] bg-parchment border-gold/30"
                />
              </CardContent>
            </Card>

            <Card className="border-gold/20 bg-parchment-light">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl text-deepbrown">Photos</CardTitle>
                <Button variant="outline" size="sm" className="border-gold/30 bg-transparent" onClick={handleAddImage}>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Add Photo
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {images.map((image, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="relative group"
                    >
                      <img
                        src={image || "/placeholder.svg"}
                        alt={`Travel photo ${index + 1}`}
                        className="w-full h-40 object-cover rounded-lg border border-gold/20"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-gold/20 bg-parchment-light">
              <CardHeader>
                <CardTitle className="text-xl text-deepbrown">Map Location</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] bg-parchment-dark map-texture rounded-lg border border-gold/20 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-8 w-8 text-gold mx-auto mb-2" />
                    <p className="text-deepbrown/70">Click on the map to set your location</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-4">
              <Button variant="outline" className="border-gold/30 bg-transparent">
                Save as Draft
              </Button>
              <AnimatedButton animationType="wax-stamp">
                <Save className="mr-2 h-4 w-4" />
                Save Lore
              </AnimatedButton>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
