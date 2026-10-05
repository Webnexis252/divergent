"use client";

import { LazyMotion, MotionConfig } from "motion/react";

// Loaded after the page renders, keeping ~40 KB of animation code off the
// critical path. Components must use `m.*` (not `motion.*`) for this to pay off.
const loadFeatures = () => import("./motion-features").then((mod) => mod.default);

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadFeatures}>
      <MotionConfig
        reducedMotion="never"
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
