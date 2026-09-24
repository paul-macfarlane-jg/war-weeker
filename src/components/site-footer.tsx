import Link from "next/link";

import { REPO_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * Quiet credit line shown on every page. Colors come from the surrounding
 * themed wrapper, so it follows the active War Week's Appearance Theme.
 */
export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "text-foreground/70 flex items-center justify-center gap-3 px-4 py-6 text-xs",
        className,
      )}
    >
      <span>© {new Date().getFullYear()} Jahnel Group</span>
      <Link
        href="/about"
        className="hover:text-foreground underline underline-offset-4"
      >
        About
      </Link>
      <a
        href={REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-foreground underline underline-offset-4"
      >
        GitHub
      </a>
    </footer>
  );
}
