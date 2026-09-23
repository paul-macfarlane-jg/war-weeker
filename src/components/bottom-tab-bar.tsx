"use client";

import { Home, ListChecks, Menu, Newspaper, Trophy } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function tabsFor(edition: string) {
  return [
    { label: "Home", href: `/${edition}`, icon: Home },
    { label: "Schedule", href: `/${edition}/schedule`, icon: ListChecks },
    { label: "Leaderboard", href: `/${edition}/leaderboard`, icon: Trophy },
    { label: "News", href: `/${edition}/news`, icon: Newspaper },
    {
      label: "More",
      href: `/${edition}/more`,
      icon: Menu,
      // Pages reached from the More tab keep it highlighted.
      subpaths: [`/${edition}/competitions`, `/${edition}/teams`],
    },
  ];
}

export function BottomTabBar({ edition }: { edition: string }) {
  const pathname = usePathname();
  const tabs = tabsFor(edition);

  return (
    <nav
      aria-label="Primary"
      className="border-border bg-background fixed inset-x-0 bottom-0 z-50 border-t pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex items-stretch justify-around">
        {tabs.map(({ label, href, icon: Icon, subpaths = [] }) => {
          const active =
            pathname === href ||
            subpaths.some(
              (path) => pathname === path || pathname.startsWith(`${path}/`),
            );
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
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
