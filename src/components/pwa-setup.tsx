"use client";

import { useEffect } from "react";

import { captureInstallPrompt } from "@/lib/install-prompt";

/** Registers the service worker and captures Chrome's install prompt. */
export function PwaSetup() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Not installable without it, but the site itself still works.
      });
    }
    return captureInstallPrompt();
  }, []);

  return null;
}
