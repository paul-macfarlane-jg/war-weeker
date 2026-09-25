"use client";

import {
  ChevronRight,
  CircleHelp,
  Download,
  History,
  Info,
  type LucideIcon,
  Medal,
  Shield,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";

import { SignOutButton } from "@/components/auth-buttons";
import type { NavAccount } from "@/components/primary-nav";
import type { WarWeek } from "@/db/schema";
import { rosterHeading } from "@/lib/roster";

export type MoreLink = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type MoreLinksInput = {
  edition: string;
  mode: WarWeek["mode"];
  teamLabel: string;
  isOrganizer: boolean;
};

/**
 * The links shown on the desktop `/[edition]/more` page and, on a phone, in
 * the bottom tab bar's More Sheet. Both surfaces render this same list so
 * they never drift.
 */
export function moreLinks({
  edition,
  mode,
  teamLabel,
  isOrganizer,
}: MoreLinksInput): MoreLink[] {
  return [
    { label: "Competitions", href: `/${edition}/competitions`, icon: Trophy },
    {
      label: rosterHeading(mode, teamLabel),
      href: `/${edition}/teams`,
      icon: Users,
    },
    { label: "Awards", href: `/${edition}/awards`, icon: Medal },
    { label: "FAQ", href: `/${edition}/faq`, icon: CircleHelp },
    { label: "War Week history", href: "/history", icon: History },
    { label: "Install app", href: "/install", icon: Download },
    { label: "About JG War Week", href: "/about", icon: Info },
    ...(isOrganizer ? [{ label: "Admin", href: "/admin", icon: Shield }] : []),
  ];
}

/**
 * The More Sheet's content on a phone: the same links as `/[edition]/more`,
 * plus the signed-in account row. Tapping a link calls `onNavigate` so the
 * caller can close the Sheet.
 */
export function MoreMenu({
  edition,
  mode,
  teamLabel,
  account,
  onNavigate,
}: {
  edition: string;
  mode: WarWeek["mode"];
  teamLabel: string;
  account: NavAccount;
  onNavigate?: () => void;
}) {
  const links = moreLinks({
    edition,
    mode,
    teamLabel,
    isOrganizer: account.isOrganizer,
  });

  return (
    <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-4">
      <ul className="border-border flex flex-col rounded-lg border">
        {links.map(({ label, href, icon: Icon }) => (
          <li key={href} className="border-border border-b last:border-b-0">
            <Link
              href={href}
              onClick={onNavigate}
              className="flex min-h-11 items-center gap-3 px-4 py-3"
            >
              <Icon aria-hidden className="text-primary size-5" />
              <span className="flex-1 font-medium">{label}</span>
              <ChevronRight aria-hidden className="text-foreground/40 size-4" />
            </Link>
          </li>
        ))}
      </ul>
      <div className="border-border flex items-center gap-3 rounded-lg border px-4 py-3 text-sm">
        <span className="text-foreground/70 min-w-0 flex-1 truncate">
          Signed in as {account.email}
        </span>
        <SignOutButton />
      </div>
    </div>
  );
}
