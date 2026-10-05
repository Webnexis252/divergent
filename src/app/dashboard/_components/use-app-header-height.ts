"use client";

import { useEffect, type RefObject } from "react";

/**
 * Publishes the sticky header's height as `--app-header-height` on <html>, so
 * the sticky sidebar can sit just below it instead of sliding underneath when
 * the page scrolls. Tracks resizes (wrapping, breakpoints) with ResizeObserver.
 */
export function useAppHeaderHeight(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const header = ref.current;
    if (!header) return;

    const root = document.documentElement;
    const update = () => root.style.setProperty("--app-header-height", `${header.offsetHeight}px`);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(header);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--app-header-height");
    };
  }, [ref]);
}
