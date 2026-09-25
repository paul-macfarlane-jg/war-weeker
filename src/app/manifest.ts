import type { MetadataRoute } from "next";

import {
  APP_BACKGROUND_COLOR,
  APP_DESCRIPTION,
  APP_NAME,
  APP_THEME_COLOR,
} from "@/lib/pwa";

/** Served at `/manifest.webmanifest`; makes JG War Week installable. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
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
