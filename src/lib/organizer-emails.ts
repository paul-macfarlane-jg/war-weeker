/**
 * Organizer emails as chips in the War Week settings form. The chips still
 * submit the newline-separated text `parseWarWeekSettingsInput` validates.
 */
import { isJahnelGroupEmail } from "@/lib/access";

const SEPARATORS = /[\s,]+/;

/**
 * Reads what was typed or pasted into the chip input: split on whitespace
 * and commas, lowercased and deduped. Only @jahnelgroup.com addresses are
 * accepted; the rest come back as typed so the error can name them.
 */
export function parseEmailEntry(text: string): {
  accepted: string[];
  rejected: string[];
} {
  const accepted = new Set<string>();
  const rejected = new Set<string>();
  for (const entry of text.split(SEPARATORS).filter(Boolean)) {
    if (isJahnelGroupEmail(entry)) accepted.add(entry.toLowerCase());
    else rejected.add(entry);
  }
  return { accepted: [...accepted], rejected: [...rejected] };
}

/** The chip list from the form's Organizer emails text. */
export function emailsFromInput(value: string): string[] {
  return value.split(SEPARATORS).filter(Boolean);
}

/** The form's Organizer emails text from the chip list, one per line. */
export function inputFromEmails(emails: string[]): string {
  return emails.join("\n");
}
