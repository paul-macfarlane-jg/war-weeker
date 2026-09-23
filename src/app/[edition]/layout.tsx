import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BottomTabBar, TopNav } from "@/components/primary-nav";
import { warWeekThemeStyle } from "@/lib/theme";

import { getNavAccount, getWarWeekForEdition } from "./war-week";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: LayoutProps<"/[edition]">): Promise<Metadata> {
  const { edition } = await params;
  const warWeek = await getWarWeekForEdition(edition);
  if (!warWeek) return {};

  return {
    title: `War Week ${warWeek.edition.toUpperCase()} · ${warWeek.storyTheme}`,
  };
}

export default async function EditionLayout({
  params,
  children,
}: LayoutProps<"/[edition]">) {
  const { edition } = await params;
  const warWeek = await getWarWeekForEdition(edition);
  if (!warWeek) notFound();
  const account = await getNavAccount();

  return (
    <div
      style={warWeekThemeStyle(warWeek)}
      className="bg-background text-foreground min-h-dvh pb-20 font-sans md:pb-0"
    >
      <TopNav
        edition={warWeek.edition}
        storyTheme={warWeek.storyTheme}
        account={account}
      />
      {children}
      <BottomTabBar edition={warWeek.edition} />
    </div>
  );
}
