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
  { label: "Overview", icon: LayoutDashboard, ready: true },
  { label: "Points Entries", icon: PlusCircle, ready: false },
  { label: "Standings visibility", icon: EyeOff, ready: false },
  { label: "Announcements", icon: Megaphone, ready: false },
  { label: "Awards", icon: Medal, ready: false },
];

/** Desktop frame for every Organizer page: header, side nav, content. */
export function AdminShell({
  warWeek,
  email,
  children,
}: {
  warWeek: WarWeek;
  email: string;
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
            {SECTIONS.map(({ label, icon: Icon, ready }) => (
              <li
                key={label}
                aria-current={label === "Overview" ? "page" : undefined}
                className={
                  label === "Overview"
                    ? "bg-primary/10 text-primary flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium"
                    : "text-foreground/50 flex items-center gap-2 rounded-md px-3 py-2 text-sm"
                }
              >
                <Icon aria-hidden className="size-4" />
                <span className="flex-1">{label}</span>
                {!ready && <span className="text-xs">Soon</span>}
              </li>
            ))}
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
