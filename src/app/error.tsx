"use client";

import { useEffect } from "react";
import { AlertTriangle, Home, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { logger } from "@/lib/logger";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error using our new structured logger
    logger.error("Global Error Caught", error, { digest: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center bg-black px-4 text-white">
      <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#111] p-8 shadow-2xl">
        <div className="pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full bg-[var(--danger)] opacity-20 blur-3xl" />
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[rgba(255,61,0,0.15)] ring-8 ring-[rgba(255,61,0,0.05)]">
            <AlertTriangle className="h-10 w-10 text-[var(--danger)]" />
          </div>
          
          <h1 className="mb-3 text-2xl font-bold tracking-tight">Something went wrong!</h1>
          <p className="mb-8 text-sm text-[var(--text-muted)]">
            We&apos;ve encountered an unexpected error. Our team has been notified and is looking into it.
          </p>

          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <Button
              onClick={() => reset()}
              variant="secondary"
              className="flex-1 gap-2 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              <RefreshCcw className="h-4 w-4" />
              Try Again
            </Button>
            <Link href="/" className="flex-1">
              <Button className="w-full gap-2 bg-white text-black hover:bg-white/90">
                <Home className="h-4 w-4" />
                Go Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
