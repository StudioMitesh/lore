'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import EditTripPage from '@/pages/EditTripPage';

export default function EditTrip() {
  return (
    <ProtectedRoute>
      <EditTripPage />
    </ProtectedRoute>
  );
}

