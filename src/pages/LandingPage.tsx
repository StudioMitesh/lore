"use client"
import { motion } from "framer-motion"
import { ArrowRight, Map, BookOpen, Globe } from "lucide-react"
import { Navbar } from "@/components/Navbar"
import { AnimatedButton } from "@/components/ui/animated-button"

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col parchment-texture">
      <Navbar />

      <main className="flex-1">
        <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
          <div className="container relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <h1 className="font-display text-4xl md:text-6xl font-bold text-deepbrown mb-6">
                  Document Your Journey, <br />
                  <span className="text-gold">Preserve Your Adventures</span>
                </h1>
                <p className="text-lg md:text-xl text-deepbrown/80 mb-8">
                  Lore helps you capture and organize your travel memories with beautiful maps, rich storytelling
                  tools, and a personal travel journal.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <AnimatedButton size="lg" animationType="glow">
                    Start Mapping
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </AnimatedButton>
                  <AnimatedButton size="lg" variant="outline" className="border-gold/30">
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
            transition={{ duration: 120, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
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
            transition={{ duration: 180, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
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
          <div className="container">
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
                  title: "Interactive Maps",
                  description: "Pin your adventures on beautiful, interactive maps with custom markers and routes.",
                },
                {
                  icon: BookOpen,
                  title: "Rich Storytelling",
                  description:
                    "Create detailed entries with text, photos, and location data to tell your travel stories.",
                },
                {
                  icon: Globe,
                  title: "Travel Timeline",
                  description: "Organize your adventures chronologically and by location for easy browsing.",
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
                  <h3 className="font-display text-xl font-medium text-deepbrown mb-2">{feature.title}</h3>
                  <p className="text-deepbrown/80">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="font-display text-3xl md:text-4xl font-bold text-deepbrown mb-4">
                  Your Personal Travel Atlas
                </h2>
                <p className="text-deepbrown/80 mb-6">
                  Lore transforms your travel memories into a beautiful, interactive atlas that you can revisit
                  anytime. Add rich details, photos, and stories to each location you visit.
                </p>
                <ul className="space-y-3 mb-8">
                  {[
                    "Create custom maps with your travel routes",
                    "Add detailed journal entries with rich text and media",
                    "Organize trips by date, location, or custom categories",
                    "Share your adventures with friends and family",
                  ].map((item, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + index * 0.1, duration: 0.4 }}
                      viewport={{ once: true }}
                      className="flex items-start"
                    >
                      <svg
                        className="h-5 w-5 text-gold mr-2 mt-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-deepbrown/80">{item}</span>
                    </motion.li>
                  ))}
                </ul>
                <AnimatedButton animationType="glow">
                  Explore Features
                  <ArrowRight className="ml-2 h-4 w-4" />
                </AnimatedButton>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="aspect-[4/3] rounded-2xl overflow-hidden border-8 border-deepbrown/10 shadow-xl">
                  <img
                    src="/placeholder.svg?height=600&width=800"
                    alt="Lore App Preview"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-parchment-dark rounded-full border-4 border-gold/20 flex items-center justify-center shadow-lg">
                  <svg viewBox="0 0 24 24" className="h-12 w-12 text-gold">
                    <path
                      fill="currentColor"
                      d="M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z"
                    />
                  </svg>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-forest text-white">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
                  Start Documenting Your Adventures Today
                </h2>
                <p className="text-white/80 mb-8">
                  Join thousands of travelers who use Lore to create beautiful, interactive travel journals.
                </p>
                <AnimatedButton
                  size="lg"
                  className="bg-gold hover:bg-gold-dark text-white border-gold-dark"
                  animationType="wax-stamp"
                >
                  Create Your First Map
                  <ArrowRight className="ml-2 h-5 w-5" />
                </AnimatedButton>
              </motion.div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
