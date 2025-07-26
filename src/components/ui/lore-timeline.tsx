"use client"
import { motion } from "framer-motion"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { type TimelineEvent } from "@/lib/types"

interface LoreTimelineProps {
  entries: TimelineEvent[]
  className?: string
  onEntryClick?: (id: string) => void
}

export function LoreTimeline({ entries, className, onEntryClick }: LoreTimelineProps) {
  const sortedEntries = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const typeIcons = {
    journal: "📝",
    photo: "📷",
    artifact: "🏺",
    map: "🗺️",
  }

  return (
    <div className={cn("relative", className)}>
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gold/30" />

      <div className="space-y-4">
        {sortedEntries.map((entry, index) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative pl-12"
            onClick={() => onEntryClick?.(entry.id)}
          >
            <motion.div
              className="absolute left-2.5 top-2 w-3 h-3 rounded-full bg-gold border-2 border-parchment"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                delay: index * 0.1 + 0.2,
                type: "spring",
                stiffness: 300,
                damping: 15,
              }}
            />

            <motion.div
              className="bg-parchment-light p-3 rounded-xl border border-gold/20 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg" role="img" aria-label={entry.type}>
                  {typeIcons[entry.type]}
                </span>
                <h4 className="font-display text-base font-medium text-deepbrown">{entry.title}</h4>
              </div>
              <div className="flex justify-between text-xs text-deepbrown/70">
                <span>{entry.location}</span>
                <span>{format(entry.date, "MMM d, yyyy")}</span>
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
