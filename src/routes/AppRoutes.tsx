import { Routes, Route, useLocation } from 'react-router-dom';
import LandingPage from '../pages/LandingPage';
import Dashboard from '../pages/Dashboard';
import MapPage from '../pages/MapPage';
import NewEntryPage from '../pages/NewEntryPage';
import ProfilePage from '../pages/ProfilePage';
import { AnimatePresence, motion } from 'framer-motion';

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  in: {
    opacity: 1,
    y: 0,
  },
  out: {
    opacity: 0,
    y: -20,
  },
};

const pageTransition = {
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
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageWrapper><LandingPage /></PageWrapper>} />
        <Route path="/dashboard" element={<PageWrapper><Dashboard /></PageWrapper>} />
        <Route path="/map" element={<PageWrapper><MapPage /></PageWrapper>} />
        <Route path="/new-entry" element={<PageWrapper><NewEntryPage /></PageWrapper>} />
        <Route path="/profile" element={<PageWrapper><ProfilePage /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
};

export default AppRoutes;
