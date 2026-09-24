"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Re-renders the current route's server components about every 10 seconds while
 * the tab is visible, so Standings update without a manual refresh.
 */
const INTERVAL_MS = 10_000;

export function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [router]);

  return null;
}
