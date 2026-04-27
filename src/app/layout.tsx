import type { Metadata, Viewport } from "next";
import "./globals.css";
import CustomCursor from "@/components/CustomCursor";
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
            <CustomCursor />
            <div className="flex min-h-screen flex-col">
              <div className="flex-1">{children}</div>
              <GlobalAppFooter />
            </div>
          </AuthProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
