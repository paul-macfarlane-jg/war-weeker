import type { ScheduleItem } from "@/db/schema";
import {
  type Block,
  type TextElement,
  sanitizeContent,
} from "@/lib/rich-text/content";
import { type ScheduleDay, WAR_WEEK_TIME_ZONE } from "@/lib/schedule";

export type ScheduleResult = {
  edition: string;
  timeZone: typeof WAR_WEEK_TIME_ZONE;
  date: string | null;
  days: {
    date: string;
    dayTheme: string;
    items: {
      startTime: string;
      endTime: string | null;
      title: string;
      host: string | null;
      location: string | null;
      virtualLink: string | null;
      category: ScheduleItem["category"];
      competition: string | null;
      description: string | null;
    }[];
  }[];
};

/** `HH:MM:SS` as `HH:MM`. */
function toHourMinute(time: string): string {
  return time.slice(0, 5);
}

function inlineText(elements: TextElement[] | undefined): string {
  return elements?.map((e) => e.text).join("") ?? "";
}

function blockLines(block: Block, indent = ""): string[] {
  switch (block.type) {
    case "paragraph":
    case "heading":
      return [indent + inlineText(block.content)];
    case "bulletList":
    case "orderedList":
      return block.content.flatMap((item) =>
        (item.content ?? []).flatMap((child, index) =>
          blockLines(child, indent).map((line, lineIndex) =>
            index === 0 && lineIndex === 0 ? `- ${line}` : `  ${line}`,
          ),
        ),
      );
    case "image":
      return [];
  }
}

/** Rich text as plain text for a Claude user; images are dropped. */
function toPlainText(content: unknown): string | null {
  if (content == null) return null;
  const result = sanitizeContent(content);
  if (!result.ok) return null;
  const text = result.content.content
    .flatMap((block) => blockLines(block))
    .join("\n")
    .trim();
  return text || null;
}

/**
 * Serializes a War Week's schedule into the `get_schedule` MCP tool
 * payload: one Day when `date` is given, otherwise every Day. Times are ET
 * wall-clock `HH:MM`.
 */
export function toScheduleResult(
  edition: string,
  days: ScheduleDay[],
  date?: string,
): ScheduleResult {
  return {
    edition,
    timeZone: WAR_WEEK_TIME_ZONE,
    date: date ?? null,
    days: days
      .filter((d) => date === undefined || d.date === date)
      .map((d) => ({
        date: d.date,
        dayTheme: d.dayTheme,
        items: d.items.map((item) => ({
          startTime: toHourMinute(item.startTime),
          endTime: item.endTime ? toHourMinute(item.endTime) : null,
          title: item.title,
          host: item.host,
          location: item.location,
          virtualLink: item.virtualLink,
          category: item.category,
          competition: item.competition?.name ?? null,
          description: toPlainText(item.description),
        })),
      })),
  };
}
