import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { InstallInstructions } from "@/components/install-instructions";
import { SiteFooter } from "@/components/site-footer";
import { ThemeRoot } from "@/components/theme-root";
import { warWeekThemeStyle } from "@/lib/theme";
import { getCurrentWarWeek } from "@/queries/war-weeks";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Install app · JG War Week" };

/**
 * How to add JG War Week to a phone's home screen, dressed in the current
 * War Week's Appearance Theme. The steps themselves are picked on the client.
 */
export default async function InstallPage() {
  const warWeek = await getCurrentWarWeek();

  return (
    <ThemeRoot
      style={warWeek ? warWeekThemeStyle(warWeek) : undefined}
      className="bg-background text-foreground flex min-h-dvh flex-col font-sans"
    >
      <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-6 md:max-w-3xl">
        <Link
          href={warWeek ? `/${warWeek.edition}/more` : "/"}
          className="text-primary flex items-center gap-1 text-sm underline-offset-4 hover:underline"
        >
          <ChevronLeft aria-hidden className="size-4" />
          Back
        </Link>
        <h1 className="text-2xl font-bold">Install JG War Week</h1>
        <InstallInstructions />
      </main>
      <SiteFooter className="mt-auto" />
    </ThemeRoot>
  );
}
