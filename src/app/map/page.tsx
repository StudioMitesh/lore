'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import MapPage from '@/pages/MapPage';

export default function Map() {
  return (
    <ProtectedRoute>
      <MapPage />
    </ProtectedRoute>
  );
}

