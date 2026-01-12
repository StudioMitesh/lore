'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import LoraAgent from '@/pages/LoraAgent';

export default function LoraPage() {
  return (
    <ProtectedRoute>
      <LoraAgent />
    </ProtectedRoute>
  );
}

