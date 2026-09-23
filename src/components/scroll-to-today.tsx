"use client";

import { useEffect } from "react";

/** Scrolls the element with `targetId` into view once, on first render. */
export function ScrollToToday({ targetId }: { targetId: string }) {
  useEffect(() => {
    document.getElementById(targetId)?.scrollIntoView({ block: "start" });
  }, [targetId]);

  return null;
}
