'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import NewEntryPage from '@/pages/NewEntryPage';

export default function NewEntry() {
  return (
    <ProtectedRoute>
      <NewEntryPage />
    </ProtectedRoute>
  );
}

