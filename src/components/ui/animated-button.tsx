"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import type { VariantProps } from "class-variance-authority"

interface AnimatedButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  animationType?: "glow" | "float" | "wax-stamp"
  asChild?: boolean
  children: React.ReactNode
}

export function AnimatedButton({
  animationType = "glow",
  className,
  children,
  variant,
  size,
  asChild = false,
  ...props
}: AnimatedButtonProps) {
const animations = {
    glow: {
        rest: {
        scale: 1,
        transition: { duration: 0.2, ease: "easeInOut" as const },
        },
        hover: {
        scale: 1.02,
        transition: { duration: 0.2, ease: "easeInOut" as const },
        },
        tap: {
        scale: 0.98,
        transition: { duration: 0.1 },
        },
    },
    float: {
        rest: {
        y: 0,
        transition: { duration: 0.2, ease: "easeInOut" as const },
        },
        hover: {
        y: -5,
        transition: { duration: 0.2, ease: "easeInOut" as const },
        },
        tap: {
        y: 0,
        transition: { duration: 0.1 },
        },
    },
     "wax-stamp": {
        rest: {
            scale: 1,
            backgroundColor: "var(--gold)",
            transition: { duration: 0.2, ease: "easeInOut" as const },
        },
        hover: {
            scale: 1.02,
            backgroundColor: "var(--gold-dark)",
            transition: { duration: 0.2, ease: "easeInOut" as const },
        },
        tap: {
            scale: 0.95,
            transition: {
            duration: 0.1,
            type: "spring" as const,
            stiffness: 400,
            damping: 15,
            },
        },
    },
}

  const currentAnimation = animations[animationType]

  return (
    <motion.div
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      animate="rest"
      variants={currentAnimation}
      className="inline-block"
    >
      <Button
        variant={variant}
        size={size}
        className={cn(
          animationType === "glow" && "transition-shadow hover:shadow-[0_0_15px_rgba(212,175,55,0.6)]",
          animationType === "wax-stamp" && "bg-gold hover:bg-gold-dark text-white border-gold-dark",
          className
        )}
        asChild={asChild}
        {...props}
      >
        {children}
      </Button>
    </motion.div>
  )
}
