import { motion } from 'framer-motion';

export default function CompassComponent() {
  return (
    <div className="absolute bottom-8 right-8 w-20 h-20 opacity-70 pointer-events-none">
      <motion.div
        initial={{ rotate: 0 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        className="w-full h-full"
      >
        <svg width="80" height="80" viewBox="0 0 80 80" className="text-gray-600">
          <defs>
            <radialGradient id="compassGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.1" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.3" />
            </radialGradient>
          </defs>
          <circle
            cx="40"
            cy="40"
            r="35"
            fill="url(#compassGradient)"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.5"
          />
          <path
            d="M40 5 L44 35 L75 40 L44 45 L40 75 L36 45 L5 40 L36 35 Z"
            fill="currentColor"
            fillOpacity="0.2"
            stroke="currentColor"
            strokeWidth="0.5"
          />
          <path
            d="M40 15 L42 38 L65 40 L42 42 L40 65 L38 42 L15 40 L38 38 Z"
            fill="currentColor"
            fillOpacity="0.3"
          />
          <circle cx="40" cy="40" r="4" fill="currentColor" />
          <text
            x="40"
            y="12"
            textAnchor="middle"
            fontSize="10"
            fill="currentColor"
            fontWeight="bold"
          >
            N
          </text>
        </svg>
      </motion.div>
    </div>
  );
}