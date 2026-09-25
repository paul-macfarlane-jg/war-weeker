"use client";

import { Avatar } from "@/components/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useYou } from "@/components/you";
import { isBye, isDecided } from "@/lib/bracket/engine";
import type { Bracket, Heat } from "@/lib/bracket/types";
import {
  entrantForYou,
  finalRoundOf,
  groupRounds,
  heatName,
  nextHeatFor,
} from "@/lib/bracket/view";
import { YOU_ROW_CLASS } from "@/lib/you";
import type { BracketEntrant } from "@/queries/brackets";

export type BracketViewEntrant = Pick<
  BracketEntrant,
  "id" | "label" | "color" | "teamId" | "participantId"
>;

type Scoring = "team" | "individual";

/** A Team's color dot, or a Participant's Avatar. */
export function EntrantMark({
  entrant,
  scoring,
  primaryColor,
}: {
  entrant: BracketViewEntrant;
  scoring: Scoring;
  primaryColor: string;
}) {
  if (scoring === "individual") {
    return (
      <Avatar
        name={entrant.label}
        teamColor={entrant.color}
        primaryColor={primaryColor}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="size-3 shrink-0 rounded-full"
      style={{ backgroundColor: entrant.color ?? primaryColor }}
    />
  );
}

function YouMark() {
  return (
    <span
      data-you
      className="bg-accent text-accent-foreground shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
    >
      You
    </span>
  );
}

/** The Heat whose winner fills `slot` of `heat`, if any. */
function feederOf(bracket: Bracket, heat: Heat, slot: number) {
  return bracket.heats.find(
    (h) => h.winnerTo?.heatId === heat.id && h.winnerTo.slot === slot,
  );
}

/**
 * A Heat's two places: each Entrant with its mark, the winner bold with a
 * ✓, scores and forfeits; "Bye" or "Waiting for …" for an empty place.
 */
export function HeatRows({
  heat,
  bracket,
  entrantsById,
  scoring,
  primaryColor,
  youEntrantId = null,
}: {
  heat: Heat;
  bracket: Bracket;
  entrantsById: Map<string, BracketViewEntrant>;
  scoring: Scoring;
  primaryColor: string;
  youEntrantId?: string | null;
}) {
  const finalRound = finalRoundOf(bracket);
  const decided = isDecided(heat) && !isBye(heat);
  return (
    <ul className="flex flex-col gap-1">
      {heat.slots.map((slot, i) => {
        const entrant = slot.entrantId
          ? entrantsById.get(slot.entrantId)
          : undefined;
        if (!entrant) {
          const feeder = feederOf(bracket, heat, i);
          return (
            <li
              key={i}
              className="text-foreground/60 flex min-h-8 items-center px-1 italic"
            >
              {isBye(heat)
                ? "Bye"
                : feeder
                  ? `Waiting for ${heatName(feeder, finalRound)}`
                  : "Waiting"}
            </li>
          );
        }
        const won = decided && slot.place === 1;
        return (
          <li
            key={i}
            className={`flex min-h-8 min-w-0 items-center gap-2 px-1 ${YOU_ROW_CLASS}`}
          >
            <EntrantMark
              entrant={entrant}
              scoring={scoring}
              primaryColor={primaryColor}
            />
            <span
              className={`min-w-0 truncate ${won ? "font-semibold" : decided ? "text-foreground/70" : ""}`}
            >
              {entrant.label}
            </span>
            {won && (
              <span aria-label="Winner" className="text-primary font-bold">
                ✓
              </span>
            )}
            {slot.forfeited && <Badge variant="outline">Forfeit</Badge>}
            {entrant.id === youEntrantId && <YouMark />}
            {slot.score && (
              <span
                className={`ml-auto shrink-0 tabular-nums ${won ? "font-semibold" : ""}`}
              >
                {slot.score}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The phone Bracket view: a vertical list of Heats grouped by Round, with
 * "Winner → …" chips, the champion and Your next Heat pinned on top, and
 * Your Entrant highlighted under the You rules.
 */
export function BracketView({
  entrants,
  bracket,
  champion,
  scoring,
  primaryColor,
  participantTeams,
}: {
  entrants: BracketViewEntrant[];
  bracket: Bracket;
  champion: string | null;
  scoring: Scoring;
  primaryColor: string;
  /** Each Participant's Team id, for finding Your Team's Entrant. */
  participantTeams: Record<string, string>;
}) {
  const you = useYou();
  const entrantsById = new Map(entrants.map((e) => [e.id, e]));
  const youEntrantId = entrantForYou(
    entrants,
    you
      ? {
          participantId: you.participantId,
          teamId: participantTeams[you.participantId] ?? null,
        }
      : null,
    scoring,
  );
  const finalRound = finalRoundOf(bracket);
  const next = youEntrantId ? nextHeatFor(bracket, youEntrantId) : null;
  const winner = champion ? entrantsById.get(champion) : undefined;
  const heatsById = new Map(bracket.heats.map((h) => [h.id, h]));

  if (bracket.heats.length === 0) {
    return (
      <section className="flex flex-col gap-2" aria-label="Bracket">
        <h2 className="text-lg font-semibold">Bracket</h2>
        <p className="text-foreground/70 text-sm">
          The Bracket hasn&apos;t been drawn yet.
        </p>
      </section>
    );
  }

  return (
    <section className="flex min-w-0 flex-col gap-4" aria-label="Bracket">
      <h2 className="text-lg font-semibold">Bracket</h2>

      {winner && (
        <Card size="sm" aria-label="Champion" className="ring-primary ring-2">
          <CardContent className="flex min-w-0 items-center gap-3">
            <span aria-hidden className="text-3xl">
              🏆
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="text-foreground/60 text-xs font-medium uppercase">
                Champion
              </span>
              <span
                className={`flex min-w-0 items-center gap-2 text-lg font-bold ${YOU_ROW_CLASS}`}
              >
                <EntrantMark
                  entrant={winner}
                  scoring={scoring}
                  primaryColor={primaryColor}
                />
                <span className="truncate">{winner.label}</span>
                {winner.id === youEntrantId && <YouMark />}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {next && (
        <Card
          size="sm"
          aria-label="Your next Heat"
          className="ring-accent ring-2"
        >
          <CardContent className="flex min-w-0 flex-col gap-1">
            <span className="text-foreground/60 text-xs font-medium uppercase">
              Your next Heat · {heatName(next.heat, finalRound)}
            </span>
            {next.opponentId ? (
              <span className="truncate font-semibold">
                vs {entrantsById.get(next.opponentId)?.label ?? "Unknown"}
              </span>
            ) : (
              <span className="text-foreground/70">
                {next.waitingFor
                  ? `Waiting for ${heatName(next.waitingFor, finalRound)}`
                  : "Waiting for an opponent"}
              </span>
            )}
          </CardContent>
        </Card>
      )}

      {groupRounds(bracket).map((round) => (
        <section
          key={round.round}
          className="flex flex-col gap-2"
          aria-label={round.name}
        >
          <h3 className="font-semibold">{round.name}</h3>
          <ul className="flex flex-col gap-2">
            {round.heats.map((heat) => {
              const to = heat.winnerTo
                ? heatsById.get(heat.winnerTo.heatId)
                : undefined;
              return (
                <li key={heat.id}>
                  <Card size="sm">
                    <CardContent className="flex min-w-0 flex-col gap-2">
                      <span className="text-foreground/60 text-xs font-medium">
                        {heatName(heat, finalRound)}
                      </span>
                      <HeatRows
                        heat={heat}
                        bracket={bracket}
                        entrantsById={entrantsById}
                        scoring={scoring}
                        primaryColor={primaryColor}
                        youEntrantId={youEntrantId}
                      />
                      {to && (
                        <Badge variant="secondary">
                          Winner → {heatName(to, finalRound)}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </section>
  );
}
