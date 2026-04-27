"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";

const FINE_POINTER_MEDIA_QUERY = "(hover: hover) and (pointer: fine)";

function subscribeToFinePointer(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const media = window.matchMedia(FINE_POINTER_MEDIA_QUERY);
  media.addEventListener("change", callback);

  return () => {
    media.removeEventListener("change", callback);
  };
}

function getFinePointerSnapshot() {
  return window.matchMedia(FINE_POINTER_MEDIA_QUERY).matches;
}

function getFinePointerServerSnapshot() {
  return false;
}

export default function CustomCursor() {
  const reduceMotion = useReducedMotion();
  const supportsFinePointer = useSyncExternalStore(
    subscribeToFinePointer,
    getFinePointerSnapshot,
    getFinePointerServerSnapshot,
  );
  const [isHovering, setIsHovering] = useState(false);
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  const springConfig = { damping: 25, stiffness: 700 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  useEffect(() => {
    if (reduceMotion || !supportsFinePointer) {
      return;
    }

    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "A" ||
        target.tagName === "BUTTON" ||
        target.closest("a") ||
        target.closest("button") ||
        target.classList.contains("cursor-pointer")
      ) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener("mousemove", moveCursor);
    window.addEventListener("mouseover", handleMouseOver);

    return () => {
      window.removeEventListener("mousemove", moveCursor);
      window.removeEventListener("mouseover", handleMouseOver);
    };
  }, [cursorX, cursorY, reduceMotion, supportsFinePointer]);

  if (!supportsFinePointer || reduceMotion) {
    return null;
  }

  return (
    <>
      <motion.div
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-3.5 w-3.5 rounded-full bg-[var(--brand-primary-strong)] mix-blend-difference"
        style={{
          translateX: cursorXSpring,
          translateY: cursorYSpring,
          left: -7,
          top: -7,
        }}
      />
      <motion.div
        className="pointer-events-none fixed left-0 top-0 z-[9998] h-8 w-8 rounded-full border border-[var(--brand-primary-strong)] opacity-40"
        style={{
          translateX: cursorXSpring,
          translateY: cursorYSpring,
          left: -16,
          top: -16,
          scale: isHovering ? 2.5 : 1,
        }}
        transition={{ type: "spring", stiffness: 250, damping: 20 }}
      />
    </>
  );
}
