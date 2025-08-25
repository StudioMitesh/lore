import { useState } from 'react';
import { motion } from 'framer-motion';
import { Route } from 'lucide-react';
import type { MapLocation, TripWithDetails } from '@/lib/types';

interface LegendComponentProps {
  locations: MapLocation[];
  trips: TripWithDetails[];
  currentPosition: { lat: number; lng: number } | null;
  interactive: boolean;
}

export default function LegendComponent({ 
  trips, 
  currentPosition, 
  interactive 
}: LegendComponentProps) {
  const [legendExpanded, setLegendExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="absolute top-20 left-4 bg-white/95 backdrop-blur-sm border-2 border-gray-200 rounded-xl p-4 z-10 shadow-lg max-w-xs"
    >
      <div
        className="cursor-pointer" 
        onClick={() => setLegendExpanded(!legendExpanded)}
      >
        <div className="text-sm font-bold text-gray-800 pb-2 border-b border-gray-200">
          Map Legend {legendExpanded ? '▼' : '▶'}
        </div>
      </div>
      
      {legendExpanded && (
        <div className="space-y-3 pt-2">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-[#d4af37] border-2 border-white shadow-sm"></div>
              <span className="text-xs text-gray-700">Completed/Visited</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-[#4c6b54] border-2 border-white shadow-sm"></div>
              <span className="text-xs text-gray-700">Active/Planned</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-[#b22222] border-2 border-white shadow-sm"></div>
              <span className="text-xs text-gray-700">Draft/Favorite</span>
            </div>
          </div>
          
          {trips.length > 0 && (
            <>
              <hr className="border-gray-200 my-3" />
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Route className="w-4 h-4 text-gray-600" />
                  <span className="text-xs text-gray-700">Trip Routes</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm">🚀</span>
                  <span className="text-xs text-gray-700">Trip Start</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm">🏁</span>
                  <span className="text-xs text-gray-700">Trip End</span>
                </div>
              </div>
            </>
          )}
          
          {currentPosition && (
            <>
              <hr className="border-gray-200 my-3" />
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-sm animate-pulse"></div>
                <span className="text-xs text-gray-700">Your Location</span>
              </div>
            </>
          )}
          
          <hr className="border-gray-200 my-3" />
          <div className="text-xs text-gray-500 italic">
            💡 {interactive ? "Click locations for details" : "Hover & click for info"}
          </div>
        </div>
      )}
    </motion.div>
  );
}