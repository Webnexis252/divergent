"use client";

import { useEffect, useRef } from "react";

type PollingOptions = {
  /** Delay between runs while things are changing. */
  intervalMs: number;
  /** Upper bound the delay backs off to while nothing changes. Defaults to intervalMs (no backoff). */
  maxIntervalMs?: number;
  enabled?: boolean;
  /** Changing this restarts polling immediately (e.g. the selected channel). */
  resetKey?: unknown;
};

/**
 * Runs `task` now and then repeatedly, but the repeats only happen while the
 * tab is visible: a hidden tab makes no further requests, and the task runs as
 * soon as the tab is shown again. If `task` resolves to `false` ("nothing changed") the delay grows by
 * half each time up to `maxIntervalMs`; any other result resets it.
 *
 * At scale this is most of the polling load: a student who leaves a tab open in
 * the background no longer costs a request every few seconds.
 */
export function usePolling(
  task: () => Promise<boolean | void> | boolean | void,
  { intervalMs, maxIntervalMs = intervalMs, enabled = true, resetKey }: PollingOptions,
) {
  const taskRef = useRef(task);
  useEffect(() => {
    taskRef.current = task;
  });

  useEffect(() => {
    if (!enabled) return;
    let timer: number | undefined;
    let delay = intervalMs;
    let inFlight = false;
    let cancelled = false;
    // A function, so the check is re-read after the await below
    const isHidden = () => document.visibilityState === "hidden";

    // The first run happens even in a background tab, so the page is ready when
    // it's shown; only the repeats pause while hidden
    const run = async (initial = false) => {
      window.clearTimeout(timer);
      if (cancelled || inFlight || (!initial && isHidden())) return;
      inFlight = true;
      let result: boolean | void = undefined;
      try {
        result = await taskRef.current();
      } catch {
        // A failed run counts as "no change"; the next one retries
        result = false;
      }
      inFlight = false;
      if (cancelled) return;
      delay = result === false ? Math.min(Math.round(delay * 1.5), maxIntervalMs) : intervalMs;
      if (!isHidden()) timer = window.setTimeout(run, delay);
    };

    const onVisibilityChange = () => {
      if (!isHidden()) {
        delay = intervalMs;
        run();
      } else {
        window.clearTimeout(timer);
      }
    };

    run(true);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled, intervalMs, maxIntervalMs, resetKey]);
}
