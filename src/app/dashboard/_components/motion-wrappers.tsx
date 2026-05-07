"use client";

import { motion, useInView, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef } from "react";
import type { ReactNode } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

export const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

export const fadeLeft = {
  hidden: { opacity: 0, x: -16 },
  show: { opacity: 1, x: 0 },
};

export const fadeRight = {
  hidden: { opacity: 0, x: 16 },
  show: { opacity: 1, x: 0 },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1 },
};

export const stagger = {
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
};

export const staggerFast = {
  show: { transition: { staggerChildren: 0.05, delayChildren: 0 } },
};

export function PageTransition({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.28, ease }}
    >
      {children}
    </motion.div>
  );
}

export function RevealSection({
  children,
  className,
  delay = 0,
  variant = fadeUp,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: typeof fadeUp;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      animate={inView ? "show" : "hidden"}
      className={className}
      initial="hidden"
      transition={reduceMotion ? { duration: 0 } : { duration: 0.38, ease, delay }}
      variants={reduceMotion ? { hidden: { opacity: 1 }, show: { opacity: 1 } } : variant}
    >
      {children}
    </motion.div>
  );
}

export function StaggerGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      animate={inView ? "show" : "hidden"}
      className={className}
      initial="hidden"
      variants={reduceMotion ? undefined : stagger}
    >
      {children}
    </motion.div>
  );
}

export function AnimCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.32, ease }}
      variants={fadeUp}
      whileHover={reduceMotion ? undefined : { y: -3 }}
    >
      {children}
    </motion.div>
  );
}

export function ParallaxHero({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : 48]);
  const smoothY = useSpring(y, { stiffness: 90, damping: 22 });

  return (
    <motion.div ref={ref} className={className} style={{ y: smoothY }}>
      {children}
    </motion.div>
  );
}

export function ParallaxImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [reduceMotion ? 0 : -18, reduceMotion ? 0 : 18]);
  const smoothY = useSpring(y, { stiffness: 80, damping: 20 });

  return (
    <div ref={ref} className={className}>
      <motion.img alt={alt} className="h-full w-full object-contain" src={src} style={{ y: smoothY }} />
    </div>
  );
}

export function FloatPulse({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      animate={{ y: [0, -8, 0] }}
      className={className}
      transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

export function AnimHeading({
  children,
  className,
  as: Tag = "h2",
}: {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const reduceMotion = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const Component = motion[Tag as keyof typeof motion] as typeof motion.h2;

  return (
    <Component
      ref={ref}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: reduceMotion ? 0 : 10 }}
      className={className}
      initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.3, ease }}
    >
      {children}
    </Component>
  );
}

export function AnimStat({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.98 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.32, ease }}
      viewport={{ once: true }}
      whileInView={{ opacity: 1, scale: 1 }}
    >
      {children}
    </motion.div>
  );
}

export function GlowRing({
  children,
  color = "#38c1ff",
  className,
}: {
  children: ReactNode;
  color?: string;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={
        reduceMotion
          ? undefined
          : { boxShadow: [`0 0 0 0px ${color}35`, `0 0 0 10px ${color}00`] }
      }
      className={className}
      transition={{ duration: 2.3, repeat: Infinity, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
