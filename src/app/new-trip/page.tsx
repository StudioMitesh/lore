'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import NewTripPage from '@/pages/NewTripPage';

export default function NewTrip() {
  return (
    <ProtectedRoute>
      <NewTripPage />
    </ProtectedRoute>
  );
}

