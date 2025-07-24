"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Link, useLocation } from "react-router-dom"
import { Menu, Map, BookOpen, User, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { AnimatedButton } from "@/components/ui/animated-button"
import { signOut } from "firebase/auth"
import { auth } from "../api/firebase"
import { useNavigate } from "react-router-dom"


export function Navbar() {
  const [isScrolled, setIsScrolled] = React.useState(false)
  const location = useLocation()
  const pathname = location.pathname
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await signOut(auth)
      navigate("/login")
    } catch (err) {
      console.error("Logout error:", err)
    }
  }


  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navItems = [
    { name: "Map", href: "/map", icon: Map },
    { name: "Entries", href: "/dashboard", icon: BookOpen },
    { name: "Profile", href: "/profile", icon: User },
  ]

  return (
    <header
    className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled ? "bg-parchment/95 backdrop-blur-sm shadow-md py-2" : "bg-transparent py-4",
    )}
    >
    <div className="container mx-auto flex flex-row items-center justify-between px-4">
        <Link to={"/"} className="flex items-center gap-2">
        <span className="font-display text-xl font-medium text-deepbrown">Lore</span>
        </Link>

        <nav className="hidden md:flex flex-row items-center gap-6">
        {navItems.map((item) => {
            const isActive = pathname === item.href

            return (
            <Link
                key={item.name}
                to={item.href}
                className={cn(
                "relative flex items-center gap-1.5 font-medium transition-colors",
                isActive ? "text-gold" : "text-deepbrown hover:text-gold",
                )}
            >
                <item.icon className="h-4 w-4" />
                <span>{item.name}</span>
                {isActive && (
                <motion.div
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gold"
                    layoutId="navbar-indicator"
                />
                )}
            </Link>
            )
        })}

        <AnimatedButton animationType="glow" className="ml-4">
            <Plus className="mr-1 h-4 w-4" />
            New Entry
        </AnimatedButton>

        <Button onClick={handleLogout} variant="outline" className="ml-4 border-gold/30">
            Log Out
        </Button>

        </nav>

        <Sheet>
        <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle menu</span>
            </Button>
        </SheetTrigger>
        <SheetContent side="right" className="bg-parchment">
            <nav className="flex flex-col gap-4 mt-8">
            {navItems.map((item) => {
                const isActive = pathname === item.href

                return (
                <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                    "flex items-center gap-3 px-4 py-2 rounded-lg font-medium transition-colors",
                    isActive ? "bg-gold/10 text-gold" : "text-deepbrown hover:bg-gold/5 hover:text-gold",
                    )}
                >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                </Link>
                )
            })}

            <AnimatedButton className="mt-4 w-full" animationType="glow">
                <Plus className="mr-2 h-4 w-4" />
                New Entry
            </AnimatedButton>

            <Button onClick={handleLogout} variant="outline" className="mt-4 border-gold/30">
                Log Out
            </Button>

            </nav>
        </SheetContent>
        </Sheet>
    </div>
    </header>
  )
}
