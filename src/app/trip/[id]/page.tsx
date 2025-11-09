'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import TripDisplayPage from '@/pages/TripDisplayPage';

export default function TripDisplay() {
  return (
    <ProtectedRoute>
      <TripDisplayPage />
    </ProtectedRoute>
  );
}

