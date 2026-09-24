import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AboutFeatureGrid } from "@/components/about-feature-grid";
import { AboutRevealDemo } from "@/components/about-reveal-demo";
import { SiteFooter } from "@/components/site-footer";
import { buttonVariants } from "@/components/ui/button";
import {
  ABOUT_THEME,
  CURRENT_EDITION,
  MAINTAINERS_GUIDE_URL,
} from "@/lib/about";
import { REPO_URL } from "@/lib/site";
import { warWeekThemeStyle } from "@/lib/theme";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About · War Weeker",
  description:
    "War Weeker is where Jahnel Group runs War Week: setup, schedule, Teams, Competitions, points, the Reveal, and every War Week since 2016.",
};

/**
 * The public About page (ticket 28): what War Week is, the problem, the
 * features and the history, for Jason first, then Organizers, then
 * Participants. Static on purpose: copy, stills and the Reveal recording
 * only. It reads nothing from the database or the session, wears War Week
 * XI's Appearance Theme from `ABOUT_THEME`, and is the one page besides
 * sign-in that an anonymous visitor can open (`PUBLIC_PREFIXES`).
 * The entrance fade is tw-animate-css's `animate-in`, turned off with
 * `motion-reduce:animate-none` for visitors who asked for no motion.
 */
export default function AboutPage() {
  const openXi = `Open War Week ${CURRENT_EDITION.label}`;

  return (
    <div
      style={warWeekThemeStyle(ABOUT_THEME)}
      className="bg-background text-foreground relative flex min-h-dvh flex-col overflow-hidden font-sans"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60rem] bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_60%)]"
      />

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <span className="text-sm font-bold tracking-wide">War Weeker</span>
        <Link
          href="/sign-in"
          className="text-foreground/70 hover:text-foreground text-sm underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </header>

      <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-20 px-4 pt-6 pb-20 sm:gap-28 sm:px-6 sm:pt-10">
        <section className="animate-in fade-in grid items-center gap-12 duration-700 motion-reduce:animate-none md:grid-cols-[minmax(0,1fr)_auto] md:gap-16">
          <div className="flex flex-col gap-6">
            <p className="text-primary text-xs font-semibold tracking-[0.2em] uppercase">
              Jahnel Group · since 2016
            </p>
            <h1 className="text-4xl leading-[1.05] font-bold tracking-tight sm:text-6xl">
              Run War Week in one place, and keep every year of it.
            </h1>
            <p className="text-foreground/75 max-w-xl text-lg leading-relaxed sm:text-xl">
              War Weeker is where Jahnel Group runs War Week: the Story Theme,
              the schedule, the Teams, the Competitions, the points and the
              Reveal, on every phone in the building. Organizers set it up with
              no code, and every War Week since 2016 is still here.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={CURRENT_EDITION.href}
                className={cn(buttonVariants({ size: "lg" }), "gap-2")}
              >
                {openXi}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
              <a
                href="#features"
                className={buttonVariants({ size: "lg", variant: "outline" })}
              >
                What it does
              </a>
            </div>
          </div>
          <AboutRevealDemo />
        </section>

        <section className="flex flex-col gap-6">
          <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">
            Why it exists
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Problem title="The points are gone.">
              Competiscore held every War Week&apos;s scores. Its data was lost,
              and with it who won what.
            </Problem>
            <Problem title="The history is scattered.">
              Ten years of War Week lived only in old wiki pages, one per year,
              each a little harder to find than the last.
            </Problem>
            <Problem title="The week ran on spreadsheets.">
              Organizers juggled spreadsheets, Slack and wikis, and answered the
              same questions all week: what&apos;s on, where, and who&apos;s
              winning.
            </Problem>
          </div>
          <p className="text-foreground/75 max-w-3xl text-lg leading-relaxed">
            War Weeker puts all of it in one place. Organizers set up an edition
            with no code, from the theme to the FAQ. Participants get a phone
            app. The history is back. And it is Jahnel Group&apos;s to change:
            the source is on GitHub, and the maintainer&apos;s guide walks
            through the first change.
          </p>
        </section>

        <section id="features" className="flex scroll-mt-8 flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">
              What it does
            </h2>
            <p className="text-foreground/60">
              Every still below is the app on the seeded demo War Week.
            </p>
          </div>
          <AboutFeatureGrid />
          <p className="text-foreground/75 max-w-3xl leading-relaxed">
            Sign in and War Weeker finds you on the roster, so your Team is
            highlighted wherever it appears. Add it to your home screen from{" "}
            <Link href="/install" className="underline underline-offset-4">
              /install
            </Link>{" "}
            and it opens like an app. And each edition wears its own Appearance
            Theme, so The Matrix looks nothing like Survivor.
          </p>
        </section>

        <section className="border-border bg-background/60 flex flex-col gap-4 rounded-2xl border p-6 sm:p-10">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Why I built this
          </h2>
          <div className="text-foreground/80 flex max-w-3xl flex-col gap-4 leading-relaxed">
            <p>
              War Week has run every year since 2016; XI, in 2026, is the
              eleventh. For most of those years Competiscore held the points,
              until its data was lost, and the rest of each War Week lived in a
              wiki page that only the people who wrote it could find. Organizers
              juggled spreadsheets, Slack and wikis to run a week that was
              supposed to be fun.
            </p>
            <p>
              I wanted the next Organizer to open one screen, set the week up,
              and get back to competing. And I wanted to read about War Week
              2016 without asking anyone where the page went.
            </p>
            <p className="text-foreground/60 text-sm">Paul Macfarlane</p>
          </div>
        </section>

        <section className="flex flex-col items-start gap-5">
          <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
            Ready when you are.
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={CURRENT_EDITION.href}
              className={cn(buttonVariants({ size: "lg" }), "gap-2")}
            >
              {openXi}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
            <a
              href={MAINTAINERS_GUIDE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              Read the maintainer&apos;s guide
            </a>
          </div>
          <p className="text-foreground/60 text-sm">
            Sign-in is Google, @jahnelgroup.com accounts only. The source is on{" "}
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              GitHub
            </a>
            .
          </p>
        </section>
      </main>
      <SiteFooter className="relative" />
    </div>
  );
}

function Problem({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-border flex flex-col gap-2 rounded-xl border p-5">
      <h3 className="text-primary font-semibold">{title}</h3>
      <p className="text-foreground/75 text-sm leading-relaxed">{children}</p>
    </div>
  );
}
