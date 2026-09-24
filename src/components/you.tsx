"use client";

import { createContext, useContext, useId, useSyncExternalStore } from "react";

import { type You, parseStoredYou, resolveYou, youStorageKey } from "@/lib/you";

type YouState = {
  you: You;
  /** Stores (or, with null, clears) this War Week's "Which one is you?" pick. */
  pick: (participantId: string | null) => void;
};

const YouContext = createContext<YouState>({ you: null, pick: () => {} });

// Same-tab writes don't fire `storage`, so the picker announces its own.
const PICK_EVENT = "ww:you-pick";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(PICK_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(PICK_EVENT, onChange);
  };
}

function readPick(key: string): string | null {
  try {
    return parseStoredYou(window.localStorage.getItem(key));
  } catch {
    return null;
  }
}

function writePick(key: string, participantId: string | null) {
  try {
    if (participantId) window.localStorage.setItem(key, participantId);
    else window.localStorage.removeItem(key);
  } catch {
    // Storage blocked (private window, disabled site data): nothing to keep.
  }
  window.dispatchEvent(new Event(PICK_EVENT));
}

/**
 * Knows who "you" are in this War Week. `linkedId` is the Participant the
 * server matched to the session email (account linking); without one, the
 * person's stored pick is used while it names one of `participantIds`.
 */
export function YouProvider({
  edition,
  linkedId,
  participantIds,
  children,
}: {
  edition: string;
  linkedId: string | null;
  participantIds: string[];
  children: React.ReactNode;
}) {
  const key = youStorageKey(edition);
  const storedId = useSyncExternalStore(
    subscribe,
    () => readPick(key),
    () => null,
  );
  const you: You = linkedId
    ? { participantId: linkedId, via: "email" }
    : resolveYou({
        sessionEmail: null,
        participants: participantIds.map((id) => ({ id })),
        storedId,
      });

  return (
    <YouContext.Provider
      value={{ you, pick: (participantId) => writePick(key, participantId) }}
    >
      {children}
    </YouContext.Provider>
  );
}

/** The "You" tag, rendered only in the signed-in person's own row. */
export function YouTag({ participantId }: { participantId: string }) {
  const { you } = useContext(YouContext);
  if (you?.participantId !== participantId) return null;
  return (
    <span
      data-you
      className="bg-accent text-accent-foreground rounded-full px-2 py-0.5 text-xs font-semibold"
    >
      You
    </span>
  );
}

/**
 * The Teams page's "Which one is you?" control: a searchable list of this
 * War Week's Participants, or the current pick with "Not me / clear". Hidden
 * entirely when account linking already found the person.
 */
export function YouPicker({
  participants,
}: {
  participants: { id: string; displayName: string }[];
}) {
  const { you, pick } = useContext(YouContext);
  const inputId = useId();
  const listId = useId();

  if (you?.via === "email") return null;

  const picked = you
    ? participants.find((p) => p.id === you.participantId)
    : undefined;

  if (picked) {
    return (
      <div className="border-border flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm">
        <span className="flex-1">
          You picked <span className="font-semibold">{picked.displayName}</span>
        </span>
        <button
          type="button"
          onClick={() => pick(null)}
          className="text-primary font-medium underline-offset-2 hover:underline"
        >
          Not me / clear
        </button>
      </div>
    );
  }

  return (
    <div className="border-border flex flex-col gap-1 rounded-lg border px-3 py-2 text-sm">
      <label htmlFor={inputId} className="font-semibold">
        Which one is you?
      </label>
      <input
        id={inputId}
        list={listId}
        type="search"
        autoComplete="off"
        placeholder="Start typing your name"
        className="border-border bg-background rounded-md border px-2 py-1.5"
        onChange={(event) => {
          const name = event.target.value.trim().toLowerCase();
          const match = participants.find(
            (p) => p.displayName.toLowerCase() === name,
          );
          if (match) pick(match.id);
        }}
      />
      <datalist id={listId}>
        {participants.map((p) => (
          <option key={p.id} value={p.displayName} />
        ))}
      </datalist>
      <p className="text-foreground/60 text-xs">
        Saved on this device only, to highlight you on the roster and
        leaderboard.
      </p>
    </div>
  );
}
