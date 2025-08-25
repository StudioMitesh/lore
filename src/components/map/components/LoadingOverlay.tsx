import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  isLoading: boolean;
  isUpdatingMarkers: boolean;
}

export default function LoadingOverlay({ isLoading, isUpdatingMarkers }: LoadingOverlayProps) {
  return (
    <>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm z-20">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600 font-medium">Loading your map...</p>
            <p className="text-gray-400 text-sm mt-1">Preparing markers and routes</p>
          </div>
        </div>
      )}

      {isUpdatingMarkers && !isLoading && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-blue-500/90 text-white px-4 py-2 rounded-full text-sm font-medium z-20 backdrop-blur-sm">
          <Loader2 className="h-4 w-4 inline mr-2 animate-spin" />
          Updating markers...
        </div>
      )}
    </>
  );
}