import { motion } from 'framer-motion';
import type { TripWithDetails } from '@/lib/types';

interface SelectedTripComponentProps {
  trips: TripWithDetails[];
  selectedTripId?: string;
}

export default function SelectedTripComponent({ trips, selectedTripId }: SelectedTripComponentProps) {
  if (!selectedTripId) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute top-4 right-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-3 z-10 shadow-lg backdrop-blur-sm"
    >
      <div className="text-sm font-bold">
        🎯 Viewing: {trips.find((t) => t.id === selectedTripId)?.name}
      </div>
    </motion.div>
  );
}