'use client';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MapPin } from 'lucide-react';

interface MapPinProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  label?: string;
  showLabel?: boolean;
  delay?: number;
}

export function MapPinComponent({
  className,
  size = 'md',
  color = '#d4af37',
  label,
  showLabel = false,
  delay = 0,
}: MapPinProps) {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <motion.div
      className={cn('relative flex flex-col items-center', className)}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 15,
        delay: delay,
      }}
    >
      <motion.div whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }} className="cursor-pointer">
        <MapPin
          className={cn(sizeMap[size], 'drop-shadow-md')}
          color={color}
          fill={color}
          fillOpacity={0.7}
        />
      </motion.div>
      {showLabel && label && (
        <motion.div
          className="absolute -bottom-6 whitespace-nowrap bg-parchment px-2 py-0.5 rounded-md text-xs font-medium shadow-md"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay + 0.2 }}
        >
          {label}
        </motion.div>
      )}
    </motion.div>
  );
}
