/**
 * The pure Bracket model: no database, no framework. The mutations load a
 * Bracket from its rows, run one of the engine functions, and save the
 * result.
 */

/** A Team or Participant entered in a Bracket, at its Seed Position. */
export type Entrant = { id: string; seedPosition: number; label: string };

export type HeatStatus = "pending" | "ready" | "played" | "forfeit";

/** One place in a Heat. An empty slot is waiting for an Entrant (or a bye). */
export type HeatSlot = {
  entrantId: string | null;
  /** 1 for the winner, 2 for the loser; null until the Heat is decided. */
  place: number | null;
  score: string | null;
  forfeited: boolean;
};

/** Where a Heat's winner goes: a later Heat and its slot index. */
export type WinnerTo = { heatId: string; slot: number };

export type Heat = {
  id: string;
  /** 1 is the first Round; the last Round holds the final. */
  round: number;
  /** 1-based, top to bottom within the Round. */
  position: number;
  slots: HeatSlot[];
  winnerTo: WinnerTo | null;
  status: HeatStatus;
};

export type Bracket = { heats: Heat[] };

/**
 * A Heat Result: every Entrant of the Heat in finishing order, with optional
 * scores and forfeits (a forfeiting Entrant finishes behind the others).
 */
export type HeatResult = {
  order: string[];
  scores?: Record<string, string>;
  forfeits?: string[];
};

export type Placing = { entrantId: string; place: number };

/** A refused engine operation; the message is shown to the Organizer. */
export class BracketError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BracketError";
  }
}
