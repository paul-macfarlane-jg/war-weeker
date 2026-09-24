import { describe, expect, it } from "vitest";

import {
  REVEAL_MAX_MS,
  countUpTotal,
  isRevealTransition,
  revealDurationMs,
  revealRows,
} from "@/lib/reveal";

describe("isRevealTransition", () => {
  it.each([
    [true, false, true],
    [true, true, false],
    [false, false, false],
    [false, true, false],
  ])("previous hidden %s, now hidden %s → %s", (previous, now, expected) => {
    expect(isRevealTransition(previous, now)).toBe(expected);
  });
});

describe("countUpTotal", () => {
  it.each([
    [42.5, 0, 0],
    [42.5, 1, 42.5],
    [42.5, 1.5, 42.5],
    [42.5, -1, 0],
    [0, 0.5, 0],
  ])("counts %d at progress %d to %d", (total, progress, expected) => {
    expect(countUpTotal(total, progress)).toBe(expected);
  });

  it("eases out: past halfway at the midpoint, never above the total", () => {
    const mid = countUpTotal(100, 0.5);
    expect(mid).toBeGreaterThan(50);
    expect(mid).toBeLessThan(100);
  });

  it("rounds to hundredths and counts negative totals down from 0", () => {
    const value = countUpTotal(1 / 3, 0.37);
    expect(Math.round(value * 100)).toBe(value * 100);
    expect(countUpTotal(-10, 0.5)).toBeLessThan(0);
    expect(countUpTotal(-10, 0.5)).toBeGreaterThan(-10);
  });

  it("never decreases as progress grows", () => {
    let previous = 0;
    for (let p = 0; p <= 1; p += 0.05) {
      const value = countUpTotal(97.25, p);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });
});

describe("revealRows", () => {
  it("shows nothing at time 0 except the last-ranked row starting", () => {
    const rows = revealRows([1, 2, 3], 0);
    expect(rows.map((r) => r.shown)).toEqual([false, false, true]);
    expect(rows[2].progress).toBe(0);
  });

  it("reveals in reverse rank order: last place first, first place last", () => {
    const ranks = [1, 2, 3, 4];
    const startOf = (index: number) => {
      for (let t = 0; t <= REVEAL_MAX_MS; t += 10) {
        if (revealRows(ranks, t)[index].shown) return t;
      }
      return Infinity;
    };
    const starts = ranks.map((_, i) => startOf(i));
    expect(starts[3]).toBeLessThan(starts[2]);
    expect(starts[2]).toBeLessThan(starts[1]);
    expect(starts[1]).toBeLessThan(starts[0]);
  });

  it("reveals tied rows together", () => {
    const ranks = [1, 2, 2, 4];
    for (let t = 0; t <= REVEAL_MAX_MS; t += 50) {
      const rows = revealRows(ranks, t);
      expect(rows[1]).toEqual(rows[2]);
    }
    // The tie is one step, so first place starts one step after it.
    const firstStart = [...Array(REVEAL_MAX_MS / 10).keys()]
      .map((i) => i * 10)
      .find((t) => revealRows(ranks, t)[0].shown)!;
    const tieStart = [...Array(REVEAL_MAX_MS / 10).keys()]
      .map((i) => i * 10)
      .find((t) => revealRows(ranks, t)[1].shown)!;
    const lastStart = 0;
    expect(firstStart - tieStart).toBe(tieStart - lastStart);
  });

  it("has every row shown and fully counted once the duration has passed", () => {
    const ranks = [1, 2, 3, 4, 5];
    const rows = revealRows(ranks, revealDurationMs([ranks]));
    expect(rows.every((r) => r.shown && r.progress === 1)).toBe(true);
  });

  it("delays a shorter list so every list's first place lands at the end", () => {
    const short = [1, 2];
    const long = [1, 2, 3, 4, 5, 6];
    const duration = revealDurationMs([short, long]);
    const firstStart = (ranks: number[]) =>
      [...Array(duration + 1).keys()].find(
        (t) => revealRows(ranks, t, duration)[0].shown,
      );
    expect(firstStart(short)).toBe(firstStart(long));
    expect(revealRows(short, 0, duration)[1].shown).toBe(false);
    expect(
      revealRows(short, duration, duration).every((r) => r.progress === 1),
    ).toBe(true);
  });

  it("returns an empty list for no rows", () => {
    expect(revealRows([], 500)).toEqual([]);
  });
});

describe("revealDurationMs", () => {
  it("is 0 for no rows", () => {
    expect(revealDurationMs([[]])).toBe(0);
    expect(revealDurationMs([])).toBe(0);
  });

  it("stays under the cap for a long list, so a 10 s poll never lands mid-reveal twice", () => {
    const ranks = Array.from({ length: 80 }, (_, i) => i + 1);
    expect(revealDurationMs([ranks])).toBeLessThanOrEqual(REVEAL_MAX_MS);
    expect(REVEAL_MAX_MS).toBeLessThan(10_000);
  });

  it("is the longest of several lists on one clock", () => {
    const short = [1, 2];
    const long = [1, 2, 3, 4, 5, 6];
    expect(revealDurationMs([short, long])).toBe(revealDurationMs([long]));
    expect(revealDurationMs([long])).toBeGreaterThan(revealDurationMs([short]));
  });
});
