"use client"
import { motion } from "framer-motion"
import { format, isValid } from "date-fns"
import {
  Heart,
  MapPin,
  Calendar,
  Eye,
  Edit3,
  MoreVertical,
  Trash2,
  Plane,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { entryService } from "@/services/entryService"
import { toast } from "sonner"

interface EntryCardProps {
  id: string
  title: string
  location: string
  timestamp: string // timestamp string
  excerpt: string
  imageUrl: string
  index: number
  type: string
  isFavorite?: boolean
  isDraft?: boolean
  tripName?: string
  dayLogDate?: string // timestamp string or undefined
  entryIcon: React.ReactNode
  onFavoriteToggle: () => void
  onDelete?: () => void
}

const safeFormatDate = (dateString: string | undefined, formatStr: string): string => {
  if (!dateString) return ""
  const parsed = new Date(dateString)
  return isValid(parsed) ? format(parsed, formatStr) : ""
}

export function EntryCard({
  id,
  title,
  location,
  timestamp,
  excerpt,
  imageUrl,
  index,
  type = "journal",
  isFavorite = false,
  isDraft = false,
  tripName,
  dayLogDate,
  entryIcon,
  onFavoriteToggle,
  onDelete,
}: EntryCardProps) {
  const navigate = useNavigate()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleCardClick = () => {
    navigate(isDraft ? `/entry/edit/${id}` : `/entry/${id}`)
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/entry/edit/${id}`)
  }

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/entry/${id}`)
  }

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation()
    onFavoriteToggle()
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true)
      await entryService.deleteEntry(id)
      toast.success("Entry deleted successfully")
      onDelete?.()
      setShowDeleteDialog(false)
    } catch (error) {
      console.error("Error deleting entry:", error)
      toast.error("Failed to delete entry")
    } finally {
      setIsDeleting(false)
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "journal":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "photo":
        return "bg-green-100 text-green-800 border-green-200"
      case "map":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "artifact":
        return "bg-orange-100 text-orange-800 border-orange-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        whileHover={{ y: -5, scale: 1.02 }}
        className="group cursor-pointer"
        onClick={handleCardClick}
      >
        <Card className="border-gold/20 bg-parchment-light hover:shadow-xl hover:border-gold/30 transition-all duration-300 overflow-hidden relative group/card">
          <div className="relative">
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-90 transition-opacity duration-300 group-hover/card:opacity-100" />

            <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
              <div className="flex gap-2">
                {isDraft && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                    Draft
                  </Badge>
                )}
                {type && (
                  <Badge variant="outline" className={getTypeColor(type)}>
                    <span className="mr-1">{entryIcon}</span>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Badge>
                )}
              </div>

              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white transition-colors duration-200"
                  onClick={handleFavorite}
                >
                  <Heart
                    className={`h-4 w-4 transition-colors ${
                      isFavorite ? "fill-red-500 text-red-500" : "text-white hover:text-red-300"
                    }`}
                  />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-parchment">
                    {!isDraft && (
                      <DropdownMenuItem onClick={handleView}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Entry
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleEdit}>
                      <Edit3 className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleDeleteClick}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="absolute bottom-3 left-3 right-3">
              <div className="flex items-center gap-2 text-white/90 text-sm mb-1">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{location}</span>
              </div>
              <div className="flex items-center gap-2 text-white/70 text-xs">
                <Calendar className="h-3 w-3" />
                <span>{safeFormatDate(timestamp, "MM dd, yyyy")}</span>
              </div>
            </div>
          </div>

          <CardContent className="p-5">
            <h3 className="font-display text-lg font-semibold text-deepbrown mb-2 line-clamp-1">
              {title}
            </h3>
            <p className="text-deepbrown/70 text-sm leading-relaxed line-clamp-3">{excerpt}</p>

            {tripName && (
              <div className="flex items-center gap-2 text-sm text-deepbrown/70 mb-2">
                <Plane className="h-3 w-3 text-gold" />
                <span className="text-gold font-medium">{tripName}</span>
                {dayLogDate && safeFormatDate(dayLogDate, "MMM d") && (
                  <>
                    <span>•</span>
                    <span>{safeFormatDate(dayLogDate, "MMM d")}</span>
                  </>
                )}
              </div>
            )}

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gold/10">
              <div className="flex items-center gap-2 text-xs text-deepbrown/50">
                {isDraft ? "Draft created" : "Published"} {safeFormatDate(timestamp, "MMM d")}
              </div>

              <motion.div
                className="flex items-center gap-1 text-gold hover:text-gold/80 text-sm font-medium"
                whileHover={{ x: 3 }}
              >
                {isDraft ? "Continue editing" : "Read more"}
                <svg
                  className="w-4 h-4 transition-transform group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{title}"? This action cannot be undone and will permanently remove the
              entry and all associated photos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="mr-2"
                >
                  <Trash2 className="h-4 w-4" />
                </motion.div>
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
