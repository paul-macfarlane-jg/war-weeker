"use client";

import { Home, ListChecks, Menu, Newspaper, Trophy } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SignOutButton } from "@/components/auth-buttons";

/** The signed-in user, as shown in the navigation. */
export type NavAccount = { email: string; isOrganizer: boolean };

type Destination = {
  label: string;
  href: string;
  icon: typeof Home;
  // Pages reached from this destination that keep it highlighted.
  subpaths?: string[];
};

function destinationsFor(edition: string): Destination[] {
  return [
    { label: "Home", href: `/${edition}`, icon: Home },
    { label: "Schedule", href: `/${edition}/schedule`, icon: ListChecks },
    { label: "Leaderboard", href: `/${edition}/leaderboard`, icon: Trophy },
    { label: "News", href: `/${edition}/news`, icon: Newspaper },
    {
      label: "More",
      href: `/${edition}/more`,
      icon: Menu,
      subpaths: [`/${edition}/competitions`, `/${edition}/teams`],
    },
  ];
}

function isActive(pathname: string, destination: Destination, edition: string) {
  const { href } = destination;
  if (href === `/${edition}`) return pathname === href;
  return [href, ...(destination.subpaths ?? [])].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
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
        {destinationsFor(edition).map((destination) => {
          const { label, href, icon: Icon } = destination;
          const active = isActive(pathname, destination, edition);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2 text-xs ${
                  active ? "text-primary" : "text-foreground/60"
                }`}
              >
                <Icon className="size-5" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
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
  account,
}: {
  edition: string;
  storyTheme: string;
  account: NavAccount;
}) {
  const pathname = usePathname();

  return (
    <header className="border-border bg-background sticky top-0 z-50 hidden border-b md:block">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3">
        <Link
          href={`/${edition}`}
          className="flex shrink-0 items-baseline gap-2 whitespace-nowrap"
        >
          <span className="text-lg font-bold">
            War Week {edition.toUpperCase()}
          </span>
          <span className="text-primary text-sm">{storyTheme}</span>
        </Link>
        <nav aria-label="Primary">
          <ul className="flex items-center gap-1">
            {destinationsFor(edition).map((destination) => {
              const { label, href } = destination;
              const active = isActive(pathname, destination, edition);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground/70 hover:text-foreground"
                    }`}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="flex min-w-0 items-center gap-3 text-sm whitespace-nowrap">
          {account.isOrganizer && (
            <Link
              href="/admin"
              className="text-primary underline-offset-4 hover:underline"
            >
              Admin
            </Link>
          )}
          <span
            title={account.email}
            className="text-foreground/60 hidden max-w-56 truncate lg:inline"
          >
            {account.email}
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
