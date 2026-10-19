import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { MotionProvider } from "@/components/providers/motion-provider";
import { AuthProvider } from "@/context/auth-context";
import { GlobalAppFooter } from "@/components/global-app-footer";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#38c1ff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "Divergent Classes",
    template: "%s | Divergent Classes",
  },
  description:
    "Design learning platform for structured exam prep, live classes, mentorship, community, and progress tracking.",
  applicationName: "Divergent Classes",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Divergent",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="min-h-screen">
        <MotionProvider>
          <AuthProvider>
            <div className="flex min-h-screen flex-col">
              <div className="flex-1">{children}</div>
              <GlobalAppFooter />
            </div>
          </AuthProvider>
        </MotionProvider>
        {/* Real-user page speed (Core Web Vitals) in the Vercel dashboard. Its
            script only exists on Vercel, so elsewhere (local, Amplify) it just
            fails to load and the CSP logs an error. */}
        {process.env.VERCEL ? <SpeedInsights /> : null}
      </body>
    </html>
  );
}
