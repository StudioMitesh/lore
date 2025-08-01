import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col parchment-texture">
                <main className="flex-1 pt-24 pb-16 flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-gold mx-auto mb-4" />
                        <p className="text-deepbrown/70">Loading...</p>
                    </div>
                </main>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};
