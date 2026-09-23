import { notFound } from "next/navigation";

import { ScheduleItemCard } from "@/components/schedule-item";
import { ScrollToToday } from "@/components/scroll-to-today";
import { formatDayHeading, resolveClock, toEasternClock } from "@/lib/schedule";
import { getSchedule } from "@/queries/schedule";

import { getWarWeekForEdition } from "../war-week";

function dayAnchor(date: string) {
  return `day-${date}`;
}

export default async function SchedulePage({
  params,
  searchParams,
}: PageProps<"/[edition]/schedule">) {
  const { edition } = await params;
  const { at } = await searchParams;
  const warWeek = await getWarWeekForEdition(edition);
  if (!warWeek) notFound();

  const days = await getSchedule(warWeek.id);
  const today = toEasternClock(resolveClock(at)).date;
  const todayInWeek = days.some((d) => d.date === today);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Schedule</h1>
        <span className="text-foreground/60 text-xs">All times ET</span>
      </div>
      {days.length === 0 ? (
        <p className="text-foreground/70 text-sm">No schedule yet.</p>
      ) : (
        days.map((d) => (
          <section
            key={d.id}
            id={dayAnchor(d.date)}
            className="flex scroll-mt-4 flex-col gap-3"
          >
            <div className="flex flex-col">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                {formatDayHeading(d.date)}
                {d.date === today ? (
                  <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                    Today
                  </span>
                ) : null}
              </h2>
              <p className="text-primary font-medium">{d.dayTheme}</p>
            </div>
            {d.items.length === 0 ? (
              <p className="text-foreground/70 text-sm">Nothing scheduled.</p>
            ) : (
              <ol className="flex flex-col gap-3">
                {d.items.map((item) => (
                  <ScheduleItemCard
                    key={item.id}
                    item={item}
                    edition={warWeek.edition}
                  />
                ))}
              </ol>
            )}
          </section>
        ))
      )}
      {todayInWeek ? <ScrollToToday targetId={dayAnchor(today)} /> : null}
    </main>
  );
}
