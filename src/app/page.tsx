'use client';

import { useAuth } from '@/context/useAuth';
import LandingPage from '@/pages/LandingPage';
import StartPage from '@/pages/StartPage';

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center parchment-texture">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  return user ? <LandingPage /> : <StartPage />;
}

