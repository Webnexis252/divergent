import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Divergent Classes — Student Portal",
    short_name: "Divergent",
    description: "Your premium learning portal for design, development, and creative careers.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f7f5f4",
    theme_color: "#38c1ff",
    orientation: "portrait-primary",
    scope: "/",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    categories: ["education", "productivity"],
  };
}
