import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest (public in src/lib/supabase/middleware.ts) so
// phones can install the app to the home screen. Icons come from public/icons;
// regenerate the PNGs from public/icons/icon.svg if the mark changes.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Job Journey",
    short_name: "Job Journey",
    description: "Manage and map your job search end to end.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f1f4f8",
    theme_color: "#0482ff",
    categories: ["productivity", "business"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Today", url: "/today", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Pipeline", url: "/pipeline", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
