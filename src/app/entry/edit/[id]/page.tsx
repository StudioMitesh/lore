'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import EditEntryPage from '@/pages/EditEntryPage';

export default function EditEntry() {
  return (
    <ProtectedRoute>
      <EditEntryPage />
    </ProtectedRoute>
  );
}

