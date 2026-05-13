import Link from "next/link";
import { Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Page Not Found",
};

export default function NotFound() {
  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center bg-black px-4 text-white">
      <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#111] p-8 shadow-2xl">
        {/* Decorative blob */}
        <div className="pointer-events-none absolute -top-24 left-0 h-48 w-48 rounded-full bg-(--primary-blue) opacity-20 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Large 404 */}
          <div className="mb-6 text-8xl font-extrabold tracking-tighter text-white/10 select-none">
            404
          </div>

          <h1 className="mb-3 text-2xl font-bold tracking-tight">
            Page not found
          </h1>
          <p className="mb-8 text-sm text-(--text-muted)">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved. Let&apos;s get you back on track.
          </p>

          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <Link href="/dashboard" className="flex-1">
              <Button
                variant="secondary"
                className="w-full gap-2 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <Search className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
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
