"use client";

import { Home, ListChecks, Menu, Newspaper, Trophy } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function destinationsFor(edition: string) {
  return [
    { label: "Home", href: `/${edition}`, icon: Home },
    { label: "Schedule", href: `/${edition}/schedule`, icon: ListChecks },
    { label: "Leaderboard", href: `/${edition}/leaderboard`, icon: Trophy },
    { label: "News", href: `/${edition}/news`, icon: Newspaper },
    { label: "More", href: `/${edition}/more`, icon: Menu },
  ];
}

function isActive(pathname: string, href: string, edition: string) {
  if (href === `/${edition}`) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Mobile and tablet (below `md`): a fixed bottom tab bar for one-thumb use.
 */
export function BottomTabBar({ edition }: { edition: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="border-border bg-background fixed inset-x-0 bottom-0 z-50 border-t pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex items-stretch justify-around">
        {destinationsFor(edition).map(({ label, href, icon: Icon }) => (
          <li key={href} className="flex-1">
            <Link
              href={href}
              aria-current={
                isActive(pathname, href, edition) ? "page" : undefined
              }
              className={`flex flex-col items-center gap-1 py-2 text-xs ${
                isActive(pathname, href, edition)
                  ? "text-primary"
                  : "text-foreground/60"
              }`}
            >
              <Icon className="size-5" aria-hidden="true" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Desktop (`md` and wider): a sticky top header with the War Week name and
 * the same destinations as the bottom tab bar.
 */
export function TopNav({
  edition,
  storyTheme,
}: {
  edition: string;
  storyTheme: string;
}) {
  const pathname = usePathname();

  return (
    <header className="border-border bg-background sticky top-0 z-50 hidden border-b md:block">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-6 py-3">
        <Link href={`/${edition}`} className="flex items-baseline gap-2">
          <span className="text-lg font-bold">
            War Week {edition.toUpperCase()}
          </span>
          <span className="text-primary text-sm">{storyTheme}</span>
        </Link>
        <nav aria-label="Primary">
          <ul className="flex items-center gap-1">
            {destinationsFor(edition).map(({ label, href }) => (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={
                    isActive(pathname, href, edition) ? "page" : undefined
                  }
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive(pathname, href, edition)
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground/70 hover:text-foreground"
                  }`}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
