'use client';

import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Heart, MapPin, Calendar, Users, Camera, Plane } from 'lucide-react';
import { type Trip } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TripCardProps {
  trip: Trip;
  index: number;
  onClick: () => void;
  onFavoriteToggle: () => void;
}

export function TripCard({ trip, index, onClick, onFavoriteToggle }: TripCardProps) {
  const getStatusColor = (status: Trip['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'active':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'planned':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: Trip['status']) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'active':
        return '✈️';
      case 'planned':
        return '📅';
      case 'draft':
        return '📝';
      default:
        return '📝';
    }
  };

  const formatDateRange = () => {
    if (!trip.startDate) return 'Date not set';

    const start = format(new Date(trip.startDate), 'MMM d, yyyy');

    if (!trip.endDate) {
      return `Starting ${start}`;
    }

    const end = format(new Date(trip.endDate), 'MMM d, yyyy');

    if (trip.startDate === trip.endDate) {
      return start;
    }

    return `${start} - ${end}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="group cursor-pointer"
      onClick={onClick}
    >
      <div className="bg-parchment-light rounded-2xl border border-gold/20 overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-gold/40">
        <div className="relative aspect-[16/9] overflow-hidden">
          {trip.coverImageUrl ? (
            <img
              src={trip.coverImageUrl}
              alt={trip.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gold/20 to-forest/20 flex items-center justify-center">
              <Plane className="w-12 h-12 text-gold/60" />
            </div>
          )}

          <div className="absolute top-3 left-3">
            <Badge className={`${getStatusColor(trip.status)} font-medium`}>
              <span className="mr-1">{getStatusIcon(trip.status)}</span>
              {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
            </Badge>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 h-8 w-8 bg-white/80 backdrop-blur-sm hover:bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onFavoriteToggle();
            }}
          >
            <Heart
              className={`h-4 w-4 ${trip.isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
            />
          </Button>

          {trip.totalEntries > 0 && (
            <div className="absolute bottom-3 right-3 bg-black/60 text-white px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
              {trip.totalEntries} {trip.totalEntries === 1 ? 'entry' : 'entries'}
            </div>
          )}
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-lg font-semibold text-deepbrown truncate group-hover:text-gold transition-colors">
                {trip.name}
              </h3>
              {trip.description && (
                <p className="text-sm text-deepbrown/70 mt-1 line-clamp-2">{trip.description}</p>
              )}
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-deepbrown/70">
              <Calendar className="h-4 w-4 text-gold" />
              <span>{formatDateRange()}</span>
            </div>

            {trip.countriesVisited && trip.countriesVisited.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-deepbrown/70">
                <MapPin className="h-4 w-4 text-gold" />
                <span>
                  {trip.countriesVisited.length === 1
                    ? trip.countriesVisited[0]
                    : `${trip.countriesVisited.length} countries`}
                </span>
              </div>
            )}

            {trip.dayLogIDs && trip.dayLogIDs.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-deepbrown/70">
                <Users className="h-4 w-4 text-gold" />
                <span>
                  {trip.dayLogIDs.length} {trip.dayLogIDs.length === 1 ? 'day' : 'days'}
                </span>
              </div>
            )}
          </div>

          {trip.tags && trip.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {trip.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="bg-gold/10 text-deepbrown border border-gold/30 text-xs"
                >
                  {tag}
                </Badge>
              ))}
              {trip.tags.length > 3 && (
                <Badge
                  variant="secondary"
                  className="bg-gold/10 text-deepbrown border border-gold/30 text-xs"
                >
                  +{trip.tags.length - 3} more
                </Badge>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-gold/10">
            <div className="text-xs text-deepbrown/50">
              {trip.updatedAt ? (
                <>Updated {format(new Date(trip.updatedAt), 'MMM d, yyyy')}</>
              ) : (
                <>Created {format(new Date(trip.createdAt), 'MMM d, yyyy')}</>
              )}
            </div>

            <div className="flex items-center gap-1 text-xs text-deepbrown/70">
              <Camera className="h-3 w-3" />
              <span>View Details</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
