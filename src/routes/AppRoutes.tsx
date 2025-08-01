import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, type Transition } from 'framer-motion';
import LandingPage from '@/pages/LandingPage';
import StartPage from '@/pages/StartPage';
import Dashboard from '@/pages/Dashboard';
import MapPage from '@/pages/MapPage';
import NewEntryPage from '@/pages/NewEntryPage';
import ProfilePage from '@/pages/ProfilePage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import EditEntryPage from '@/pages/EditEntryPage';
import NewTripPage from '@/pages/NewTripPage';
import EditTripPage from '@/pages/EditTripPage';
import EntryDisplayPage from '@/pages/EntryDisplayPage';
import TripDisplayPage from '@/pages/TripDisplayPage';
import { useAuth } from '@/context/useAuth';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 },
};

const pageTransition: Transition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.5,
};

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
    <motion.div
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className="w-full h-full"
    >
        {children}
    </motion.div>
);

const AppRoutes = () => {
    const location = useLocation();
    const { user, loading } = useAuth();

    if (loading) return null;

    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                <Route
                    path="/"
                    element={<PageWrapper>{user ? <LandingPage /> : <StartPage />}</PageWrapper>}
                />
                <Route
                    path="/login"
                    element={
                        <PageWrapper>
                            <LoginPage />
                        </PageWrapper>
                    }
                />
                <Route
                    path="/register"
                    element={
                        <PageWrapper>
                            <RegisterPage />
                        </PageWrapper>
                    }
                />
                <Route
                    path="/dashboard"
                    element={
                        <PageWrapper>
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        </PageWrapper>
                    }
                />
                <Route
                    path="/map"
                    element={
                        <PageWrapper>
                            <ProtectedRoute>
                                <MapPage />
                            </ProtectedRoute>
                        </PageWrapper>
                    }
                />
                <Route
                    path="/entry/new"
                    element={
                        <PageWrapper>
                            <ProtectedRoute>
                                <NewEntryPage />
                            </ProtectedRoute>
                        </PageWrapper>
                    }
                />
                <Route
                    path="/entry/edit/:id"
                    element={
                        <PageWrapper>
                            <ProtectedRoute>
                                <EditEntryPage />
                            </ProtectedRoute>
                        </PageWrapper>
                    }
                />
                <Route
                    path="/profile"
                    element={
                        <PageWrapper>
                            <ProtectedRoute>
                                <ProfilePage />
                            </ProtectedRoute>
                        </PageWrapper>
                    }
                />
                <Route
                    path="/new-trip"
                    element={
                        <PageWrapper>
                            <ProtectedRoute>
                                <NewTripPage />
                            </ProtectedRoute>
                        </PageWrapper>
                    }
                />
                <Route
                    path="/edit-trip/:id"
                    element={
                        <PageWrapper>
                            <ProtectedRoute>
                                <EditTripPage />
                            </ProtectedRoute>
                        </PageWrapper>
                    }
                />
                <Route
                    path="/entry/:id"
                    element={
                        <PageWrapper>
                            <ProtectedRoute>
                                <EntryDisplayPage />
                            </ProtectedRoute>
                        </PageWrapper>
                    }
                />
                <Route
                    path="/trip/:id"
                    element={
                        <PageWrapper>
                            <ProtectedRoute>
                                <TripDisplayPage />
                            </ProtectedRoute>
                        </PageWrapper>
                    }
                />
            </Routes>
        </AnimatePresence>
    );
};

export default AppRoutes;
