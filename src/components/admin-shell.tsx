import {
  EyeOff,
  LayoutDashboard,
  Medal,
  Megaphone,
  PlusCircle,
} from "lucide-react";
import Link from "next/link";

import { SignOutButton } from "@/components/auth-buttons";
import type { WarWeek } from "@/db/schema";
import { warWeekThemeStyle } from "@/lib/theme";

const SECTIONS = [
  { label: "Overview", icon: LayoutDashboard, href: "/admin" },
  { label: "Points Entries", icon: PlusCircle, href: "/admin/points" },
  { label: "Standings visibility", icon: EyeOff, href: null },
  { label: "Announcements", icon: Megaphone, href: null },
  { label: "Awards", icon: Medal, href: null },
] as const;

export type AdminSection = (typeof SECTIONS)[number]["label"];

/** Desktop frame for every Organizer page: header, side nav, content. */
export function AdminShell({
  warWeek,
  email,
  current,
  children,
}: {
  warWeek: WarWeek;
  email: string;
  current: AdminSection;
  children: React.ReactNode;
}) {
  return (
    <div
      style={warWeekThemeStyle(warWeek)}
      className="bg-background text-foreground flex min-h-dvh flex-col font-sans"
    >
      <header className="border-border flex items-center gap-4 border-b px-6 py-3">
        <Link href="/admin" className="font-bold">
          War Week {warWeek.edition.toUpperCase()} admin
        </Link>
        <span className="text-foreground/60 text-sm">{warWeek.storyTheme}</span>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <Link
            href={`/${warWeek.edition}`}
            className="text-primary underline-offset-4 hover:underline"
          >
            View public site
          </Link>
          <span className="text-foreground/70">{email}</span>
          <SignOutButton />
        </div>
      </header>
      <div className="flex flex-1">
        <nav
          aria-label="Admin sections"
          className="border-border w-56 shrink-0 border-r p-3"
        >
          <ul className="flex flex-col gap-1">
            {SECTIONS.map(({ label, icon: Icon, href }) => {
              const content = (
                <>
                  <Icon aria-hidden className="size-4" />
                  <span className="flex-1">{label}</span>
                  {!href && <span className="text-xs">Soon</span>}
                </>
              );
              const base =
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm";
              return (
                <li key={label}>
                  {label === current ? (
                    <Link
                      href={href!}
                      aria-current="page"
                      className={`${base} bg-primary/10 text-primary font-medium`}
                    >
                      {content}
                    </Link>
                  ) : href ? (
                    <Link href={href} className={`${base} hover:bg-muted`}>
                      {content}
                    </Link>
                  ) : (
                    <span className={`${base} text-foreground/50`}>
                      {content}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}

/** Shown to a signed-in Jahnel Group user who isn't on the allowlist. */
export function AdminRefused({
  warWeek,
  email,
}: {
  warWeek: WarWeek;
  email: string;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold">Organizers only</h1>
      <p className="text-foreground/70">
        {email} is not an Organizer for War Week {warWeek.edition.toUpperCase()}
        . Ask an Organizer to add you to the allowlist if you should have
        access.
      </p>
      <div className="flex items-center gap-3">
        <Link
          href={`/${warWeek.edition}`}
          className="text-primary underline underline-offset-4"
        >
          Go to War Week {warWeek.edition.toUpperCase()}
        </Link>
        <SignOutButton />
      </div>
    </main>
  );
}
