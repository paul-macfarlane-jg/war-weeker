"use client";

import { useEffect, useState } from "react";

import {
  IndividualStandingsList,
  StandingsHidden,
  TeamStandingsList,
} from "@/components/standings";
import { isRevealTransition, revealDurationMs, revealRows } from "@/lib/reveal";
import type { Standings } from "@/lib/standings";

/**
 * Plays the Reveal when Standings this page already showed as hidden come
 * back revealed on a refresh. The component stays mounted across
 * `router.refresh()` (AutoRefresh), so it remembers what it last saw; a
 * page that first loads revealed never animates. `lists` are the ranks of
 * each list that animates, all on one clock.
 *
 * Returns each list's row states while the Reveal plays (undefined
 * otherwise) and the wall-clock time it started, for evidence capture.
 */
function useReveal(hidden: boolean, lists: number[][]) {
  const [seenHidden, setSeenHidden] = useState(hidden);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  // Adjusting state from a prop change during render (not in an effect),
  // as React recommends.
  if (seenHidden !== hidden) {
    setSeenHidden(hidden);
    const starting = isRevealTransition(seenHidden, hidden);
    setDurationMs(starting ? revealDurationMs(lists) : null);
    setElapsedMs(0);
    setStartedAt(null);
  }

  const playing = durationMs !== null;

  useEffect(() => {
    if (durationMs === null) return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let frame = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) {
        start = now;
        setStartedAt(Date.now());
      }
      const elapsed = now - start;
      if (reducedMotion || elapsed >= durationMs) {
        setDurationMs(null);
        return;
      }
      setElapsedMs(elapsed);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [durationMs]);

  return {
    reveal: playing
      ? lists.map((ranks) => revealRows(ranks, elapsedMs, durationMs))
      : undefined,
    rootProps: {
      "data-reveal": playing ? "playing" : undefined,
      "data-reveal-started-at": startedAt ?? undefined,
    },
  };
}

const ranksOf = (rows: { rank: number }[]) => rows.map((row) => row.rank);

/** The home page's main leaderboard. */
export function HomeStandings({
  standings,
  individualLimit,
}: {
  standings: Standings;
  /** How many individual rows the home page shows. */
  individualLimit: number;
}) {
  const team =
    !standings.hidden && standings.main === "team" ? standings.team : [];
  const individual =
    !standings.hidden && standings.main === "individual"
      ? standings.individual.slice(0, individualLimit)
      : [];
  const { reveal, rootProps } = useReveal(standings.hidden, [
    ranksOf(team),
    ranksOf(individual),
  ]);

  return (
    <div {...rootProps}>
      {standings.hidden ? (
        <StandingsHidden />
      ) : standings.main === "team" ? (
        <TeamStandingsList rows={team} reveal={reveal?.[0]} />
      ) : (
        <IndividualStandingsList rows={individual} reveal={reveal?.[1]} />
      )}
    </div>
  );
}

/** Both leaderboards, the main one first. */
export function LeaderboardStandings({
  standings,
  teamLabel,
}: {
  standings: Standings;
  teamLabel: string;
}) {
  const team = standings.hidden ? [] : standings.team;
  const individual = standings.hidden ? [] : standings.individual;
  const { reveal, rootProps } = useReveal(standings.hidden, [
    ranksOf(team),
    ranksOf(individual),
  ]);

  if (standings.hidden) {
    return (
      <div {...rootProps}>
        <StandingsHidden />
      </div>
    );
  }

  const teamSection = (
    <Section key="team" title={`${teamLabel} standings`}>
      <TeamStandingsList rows={team} reveal={reveal?.[0]} />
    </Section>
  );
  const individualSection = (
    <Section key="individual" title="Individual leaderboard">
      <IndividualStandingsList rows={individual} reveal={reveal?.[1]} />
    </Section>
  );
  // A free-for-all War Week has no Teams, so it shows no team section.
  const sections =
    standings.main === "team"
      ? [teamSection, individualSection]
      : [individualSection, ...(team.length > 0 ? [teamSection] : [])];

  return (
    <div {...rootProps} className="flex flex-col gap-6">
      {sections}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
