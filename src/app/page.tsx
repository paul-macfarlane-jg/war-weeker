import { notFound, redirect } from "next/navigation";

import { getCurrentWarWeek } from "@/queries/war-weeks";

export const dynamic = "force-dynamic";

export default async function Home() {
  const current = await getCurrentWarWeek();
  if (!current) notFound();
  redirect(`/${current.edition}`);
}
