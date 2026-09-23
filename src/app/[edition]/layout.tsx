import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BottomTabBar } from "@/components/bottom-tab-bar";
import { warWeekThemeStyle } from "@/lib/theme";

import { getWarWeekForEdition } from "./war-week";

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

  return (
    <div
      style={warWeekThemeStyle(warWeek)}
      className="bg-background text-foreground min-h-dvh pb-20 font-sans"
    >
      {children}
      <BottomTabBar edition={warWeek.edition} />
    </div>
  );
}
