'use client';
import { motion } from 'framer-motion';
import { ArrowRight, Map, BookOpen, Globe } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { AnimatedButton } from '@/components/ui/animated-button';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex flex-col parchment-texture relative overflow-hidden">
      <Navbar />

      <main className="flex-1">
        <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <h1 className="font-display text-4xl md:text-6xl font-bold text-deepbrown mb-6">
                  Document Your Journey, <br />
                  <span className="text-gold">Preserve Your Adventures</span>
                </h1>
                <p className="text-lg md:text-xl text-deepbrown/80 mb-8">
                  Lore helps you capture and organize your travel memories with beautiful maps, rich
                  storytelling tools, and a personal travel journal.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <AnimatedButton
                    onClick={() => router.push('/dashboard')}
                    size="lg"
                    animationType="glow"
                  >
                    Start Mapping
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </AnimatedButton>
                  <AnimatedButton
                    onClick={() => router.push('/profile')}
                    size="lg"
                    variant="outline"
                    className="border-gold/30"
                  >
                    View My Lore
                  </AnimatedButton>
                </div>
              </motion.div>
            </div>
          </div>

          <motion.div
            className="absolute top-1/2 -right-24 w-64 h-64 opacity-10"
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{
              duration: 120,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'linear',
            }}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full text-deepbrown">
              <circle cx="50" cy="50" r="49" stroke="currentColor" strokeWidth="0.5" fill="none" />
              <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="0.3" fill="none" />
              <path d="M50,10 L50,90 M10,50 L90,50" stroke="currentColor" strokeWidth="0.2" />
              <path d="M50,10 L55,15 L45,15 Z" fill="currentColor" />
              <path d="M90,50 L85,55 L85,45 Z" fill="currentColor" />
              <path d="M50,90 L45,85 L55,85 Z" fill="currentColor" />
              <path d="M10,50 L15,45 L15,55 Z" fill="currentColor" />
            </svg>
          </motion.div>

          <motion.div
            className="absolute -bottom-16 -left-16 w-64 h-64 opacity-10"
            initial={{ rotate: 0 }}
            animate={{ rotate: -360 }}
            transition={{
              duration: 180,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'linear',
            }}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full text-deepbrown">
              <circle cx="50" cy="50" r="49" stroke="currentColor" strokeWidth="0.5" fill="none" />
              <path d="M20,20 L80,80 M20,80 L80,20" stroke="currentColor" strokeWidth="0.2" />
              <path
                d="M50,10 A40,40 0 0,1 90,50 A40,40 0 0,1 50,90 A40,40 0 0,1 10,50 A40,40 0 0,1 50,10"
                stroke="currentColor"
                strokeWidth="0.3"
                fill="none"
              />
            </svg>
          </motion.div>
        </section>

        <section className="py-16 md:py-24 bg-parchment-dark">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-deepbrown mb-4">
                Capture Your Adventures
              </h2>
              <p className="max-w-2xl mx-auto text-deepbrown/80">
                Lore provides everything you need to document your travels in style.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Map,
                  title: 'Interactive Maps',
                  description:
                    'Pin your adventures on beautiful, interactive maps with custom markers and routes.',
                },
                {
                  icon: BookOpen,
                  title: 'Rich Storytelling',
                  description:
                    'Create detailed entries with text, photos, and location data to tell your travel stories.',
                },
                {
                  icon: Globe,
                  title: 'Travel Timeline',
                  description:
                    'Organize your adventures chronologically and by location for easy browsing.',
                },
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  viewport={{ once: true }}
                  className="bg-parchment rounded-2xl p-6 shadow-md border border-gold/20"
                >
                  <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-gold" />
                  </div>
                  <h3 className="font-display text-xl font-medium text-deepbrown mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-deepbrown/80">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
