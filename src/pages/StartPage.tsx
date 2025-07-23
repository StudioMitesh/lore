import { Link } from 'react-router-dom';
import { AnimatedButton } from '@/components/ui/animated-button';
import { motion } from 'framer-motion';

const StartPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center parchment-texture text-center">
      <motion.h1 className="text-5xl font-display text-gold mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        Welcome to Lore
      </motion.h1>
      <p className="text-deepbrown/80 text-lg mb-8 max-w-md">
        Sign in to start exploring and documenting your adventures.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link to="/login">
          <AnimatedButton animationType="glow">Login</AnimatedButton>
        </Link>
        <Link to="/register">
          <AnimatedButton animationType="float">Register</AnimatedButton>
        </Link>
      </div>
    </div>
  );
};

export default StartPage;