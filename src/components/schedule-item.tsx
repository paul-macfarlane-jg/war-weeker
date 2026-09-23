import {
  Briefcase,
  GraduationCap,
  type LucideIcon,
  MapPin,
  PartyPopper,
  Trophy,
  User,
  Utensils,
  Video,
} from "lucide-react";
import Link from "next/link";

import { RichText } from "@/components/rich-text";
import type { ScheduleItem } from "@/db/schema";
import { type ScheduleEntry, formatEtTime } from "@/lib/schedule";

type Category = ScheduleItem["category"];

// Fixed hues, independent of the War Week's Appearance Theme, so a meal
// always reads as a meal whatever the year's palette. Text stays the theme
// foreground so it is legible on light and dark backgrounds alike.
const CATEGORY_STYLE: Record<
  Category,
  { label: string; icon: LucideIcon; className: string }
> = {
  competition: {
    label: "Competition",
    icon: Trophy,
    className: "border-amber-500 bg-amber-500/15",
  },
  education: {
    label: "Education",
    icon: GraduationCap,
    className: "border-sky-500 bg-sky-500/15",
  },
  social: {
    label: "Social",
    icon: PartyPopper,
    className: "border-pink-500 bg-pink-500/15",
  },
  meal: {
    label: "Meal",
    icon: Utensils,
    className: "border-emerald-500 bg-emerald-500/15",
  },
  work: {
    label: "Work",
    icon: Briefcase,
    className: "border-slate-500 bg-slate-500/15",
  },
};

const CATEGORY_BORDER: Record<Category, string> = {
  competition: "border-l-amber-500",
  education: "border-l-sky-500",
  social: "border-l-pink-500",
  meal: "border-l-emerald-500",
  work: "border-l-slate-500",
};

export function CategoryBadge({ category }: { category: Category }) {
  const { label, icon: Icon, className } = CATEGORY_STYLE[category];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}
    >
      <Icon aria-hidden className="size-3" />
      {label}
    </span>
  );
}

export function formatTimeRange(
  item: Pick<ScheduleEntry, "startTime" | "endTime">,
) {
  const start = formatEtTime(item.startTime);
  return item.endTime
    ? `${start} – ${formatEtTime(item.endTime)} ET`
    : `${start} ET`;
}

export function ScheduleItemCard({
  item,
  edition,
}: {
  item: ScheduleEntry;
  edition: string;
}) {
  return (
    <li
      className={`border-border flex flex-col gap-2 rounded-lg border border-l-4 px-4 py-3 ${CATEGORY_BORDER[item.category]}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold tabular-nums">
          {formatTimeRange(item)}
        </span>
        <CategoryBadge category={item.category} />
      </div>
      <h3 className="text-base font-semibold">{item.title}</h3>
      {item.host || item.location ? (
        <div className="text-foreground/70 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {item.host ? (
            <span className="inline-flex items-center gap-1">
              <User aria-hidden className="size-3.5" />
              {item.host}
            </span>
          ) : null}
          {item.location ? (
            <span className="inline-flex items-center gap-1">
              <MapPin aria-hidden className="size-3.5" />
              {item.location}
            </span>
          ) : null}
        </div>
      ) : null}
      {item.description ? (
        <div className="text-sm">
          <RichText content={item.description} />
        </div>
      ) : null}
      {item.virtualLink || item.competition ? (
        <div className="flex flex-wrap gap-4 text-sm font-medium">
          {item.virtualLink ? (
            <a
              href={item.virtualLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary inline-flex items-center gap-1"
            >
              <Video aria-hidden className="size-4" />
              Join virtually
            </a>
          ) : null}
          {item.competition ? (
            <Link
              href={`/${edition}/competitions/${item.competition.id}`}
              className="text-primary inline-flex items-center gap-1"
            >
              <Trophy aria-hidden className="size-4" />
              {item.competition.name}
            </Link>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
