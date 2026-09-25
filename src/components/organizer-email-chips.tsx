"use client";

import { XIcon } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  emailsFromInput,
  inputFromEmails,
  parseEmailEntry,
} from "@/lib/organizer-emails";

/**
 * Organizer emails as removable chips. Enter, a comma or pasting a list adds
 * them; addresses outside @jahnelgroup.com are refused inline and left in
 * the box to fix. Your own chip can't be removed. `value` is the same
 * newline-separated text the settings action already validates.
 */
export function OrganizerEmailChips({
  value,
  actorEmail,
  onChange,
}: {
  value: string;
  actorEmail: string;
  onChange: (value: string) => void;
}) {
  const emails = emailsFromInput(value);
  const [draft, setDraft] = useState("");
  const [rejected, setRejected] = useState<string[]>([]);
  const self = actorEmail.toLowerCase();

  function add(text: string) {
    const entry = parseEmailEntry(text);
    const known = new Set(emails.map((email) => email.toLowerCase()));
    const added = entry.accepted.filter((email) => !known.has(email));
    if (added.length > 0) onChange(inputFromEmails([...emails, ...added]));
    setRejected(entry.rejected);
    setDraft(entry.rejected.join(", "));
  }

  function remove(email: string) {
    const target = email.toLowerCase();
    onChange(inputFromEmails(emails.filter((e) => e.toLowerCase() !== target)));
  }

  return (
    <Field>
      <FieldLabel id="organizer-emails-label" htmlFor="organizer-emails-input">
        Organizer emails
      </FieldLabel>
      <ul
        aria-labelledby="organizer-emails-label"
        className="flex flex-wrap gap-1.5"
      >
        {emails.map((email) => {
          const isSelf = email.toLowerCase() === self;
          return (
            <li key={email} className="max-w-full">
              <Badge
                variant="secondary"
                className="h-7 max-w-full gap-0.5 pr-0.5 pl-2.5 text-sm"
              >
                <span className="truncate">{email}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="rounded-full aria-disabled:cursor-not-allowed aria-disabled:opacity-40"
                  aria-label={`Remove ${email}`}
                  disabled={isSelf}
                  focusableWhenDisabled={isSelf}
                  title={isSelf ? "You can't remove your own email" : undefined}
                  onClick={() => remove(email)}
                >
                  <XIcon />
                </Button>
              </Badge>
            </li>
          );
        })}
      </ul>
      <Input
        id="organizer-emails-input"
        aria-labelledby="organizer-emails-label"
        aria-describedby="organizer-emails-help"
        type="text"
        inputMode="email"
        autoComplete="off"
        placeholder="name@jahnelgroup.com"
        className="border-border h-11 sm:h-9"
        value={draft}
        aria-invalid={rejected.length > 0 || undefined}
        onChange={(event) => {
          const text = event.target.value;
          if (text.includes(",")) add(text);
          else {
            setDraft(text);
            setRejected([]);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            add(draft);
          }
        }}
        onPaste={(event) => {
          event.preventDefault();
          const pasted = event.clipboardData.getData("text");
          const input = event.currentTarget;
          const start = input.selectionStart ?? draft.length;
          const end = input.selectionEnd ?? draft.length;
          const combined = draft.slice(0, start) + pasted + draft.slice(end);
          if (/[\s,]/.test(combined)) add(combined);
          else setDraft(combined);
        }}
        onBlur={() => {
          if (draft.trim()) add(draft);
        }}
      />
      {rejected.length > 0 && (
        <FieldError>
          Only @jahnelgroup.com addresses can be Organizers:{" "}
          {rejected.join(", ")}
        </FieldError>
      )}
      <FieldDescription id="organizer-emails-help">
        Press Enter or a comma to add, or paste a list. Everyone listed can use
        these admin pages.
      </FieldDescription>
    </Field>
  );
}
