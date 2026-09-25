import {
  BookOpen,
  EyeOff,
  LayoutDashboard,
  Medal,
  Megaphone,
  PlusCircle,
  Settings,
} from "lucide-react";
import Link from "next/link";

import { SignOutButton } from "@/components/auth-buttons";
import { SiteFooter } from "@/components/site-footer";
import { ThemeRoot } from "@/components/theme-root";
import { Toaster } from "@/components/ui/sonner";
import type { WarWeek } from "@/db/schema";
import { warWeekThemeStyle } from "@/lib/theme";

const SECTIONS = [
  { label: "Overview", icon: LayoutDashboard, href: "/admin" },
  { label: "Guide", icon: BookOpen, href: "/admin/guide" },
  { label: "Points Entries", icon: PlusCircle, href: "/admin/points" },
  { label: "Standings visibility", icon: EyeOff, href: "/admin/standings" },
  { label: "Announcements", icon: Megaphone, href: "/admin/announcements" },
  { label: "Awards", icon: Medal, href: "/admin/awards" },
  { label: "Setup", icon: Settings, href: "/admin/setup" },
] as const;

/** A section an admin page can be: only sections that have a page. */
export type AdminSection = Extract<
  (typeof SECTIONS)[number],
  { href: string }
>["label"];

/**
 * Frame for every Organizer page: header, nav and content. The nav is a
 * side column on desktop and a scrolling row on a phone.
 */
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
    <ThemeRoot
      style={warWeekThemeStyle(warWeek)}
      className="bg-background text-foreground flex min-h-dvh flex-col font-sans"
    >
      <header className="border-border flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-4 py-3 md:px-6">
        <Link href="/admin" className="font-bold">
          War Week {warWeek.edition.toUpperCase()} admin
        </Link>
        <span className="text-foreground/60 text-sm">{warWeek.storyTheme}</span>
        <div className="flex min-w-0 flex-wrap items-center gap-3 text-sm md:ml-auto">
          <Link
            href={`/${warWeek.edition}`}
            className="text-primary underline-offset-4 hover:underline"
          >
            Back to War Week {warWeek.edition.toUpperCase()}
          </Link>
          <span className="text-foreground/70 truncate">{email}</span>
          <SignOutButton />
        </div>
      </header>
      <div className="flex flex-1 flex-col md:flex-row">
        <nav
          aria-label="Admin sections"
          className="border-border shrink-0 overflow-x-auto border-b p-2 md:w-56 md:border-r md:border-b-0 md:p-3"
        >
          <ul className="flex gap-1 md:flex-col">
            {SECTIONS.map(({ label, icon: Icon, href }) => {
              const content = (
                <>
                  <Icon aria-hidden className="size-4 shrink-0" />
                  <span className="flex-1">{label}</span>
                  {!href && <span className="text-xs">Soon</span>}
                </>
              );
              const base =
                "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm";
              return (
                <li key={label}>
                  {href && label === current ? (
                    <Link
                      href={href}
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
        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
      <SiteFooter className="border-border border-t" />
      {/* Inside the themed root so the edition's colors apply to toasts. */}
      <Toaster position="bottom-center" closeButton />
    </ThemeRoot>
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
    <>
      <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-bold">Organizers only</h1>
        <p className="text-foreground/70">
          {email} is not an Organizer for War Week{" "}
          {warWeek.edition.toUpperCase()}. Ask an Organizer to add you to the
          allowlist if you should have access.
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
      <SiteFooter />
    </>
  );
}
