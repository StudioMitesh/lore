'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import EntryDisplayPage from '@/pages/EntryDisplayPage';

export default function EntryDisplay() {
  return (
    <ProtectedRoute>
      <EntryDisplayPage />
    </ProtectedRoute>
  );
}

