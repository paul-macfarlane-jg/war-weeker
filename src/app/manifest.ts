import type { MetadataRoute } from "next";

import { APP_BACKGROUND_COLOR, APP_THEME_COLOR } from "@/lib/pwa";

/** Served at `/manifest.webmanifest`; makes War Weeker installable. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "War Weeker",
    short_name: "War Weeker",
    description: "One place to follow War Week.",
    start_url: "/",
    display: "standalone",
    theme_color: APP_THEME_COLOR,
    background_color: APP_BACKGROUND_COLOR,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
