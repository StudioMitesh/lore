"use client"
import { motion } from "framer-motion"
import { format } from "date-fns"
import { MapPin, Calendar, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

interface EntryCardProps {
  id: string
  title: string
  location: string
  date: Date
  excerpt: string
  imageUrl?: string
  className?: string
  index?: number
}

export function EntryCard({ id, title, location, date, excerpt, imageUrl, className, index = 0 }: EntryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.1,
        duration: 0.5,
        ease: "easeOut",
      }}
    >
      <Card
        className={cn(
          "overflow-hidden transition-all duration-300 hover:shadow-lg border-gold/20 bg-parchment-light",
          className,
        )}
      >
        <div className="relative">
          {imageUrl && (
            <div className="h-48 overflow-hidden">
              <img
                src={imageUrl || "/placeholder.svg"}
                alt={title}
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              />
            </div>
          )}
          <CardHeader className={cn(imageUrl ? "pt-4" : "")}>
            <CardTitle className="font-display text-xl text-deepbrown">{title}</CardTitle>
            <CardDescription className="flex items-center gap-1 text-deepbrown/70">
              <MapPin className="h-3.5 w-3.5" /> {location}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-deepbrown/80 line-clamp-3">{excerpt}</p>
          </CardContent>
          <CardFooter className="flex justify-between items-center border-t border-gold/10 pt-3">
            <div className="flex items-center text-xs text-deepbrown/60">
              <Calendar className="h-3.5 w-3.5 mr-1" />
              {format(date, "MMM d, yyyy")}
            </div>
            <motion.button whileHover={{ x: 3 }} whileTap={{ scale: 0.95 }} className="text-gold hover:text-gold-dark">
              <ChevronRight className="h-5 w-5" />
            </motion.button>
          </CardFooter>
        </div>
      </Card>
    </motion.div>
  )
}
