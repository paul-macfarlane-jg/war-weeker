# AC3 — current War Week resolution, clock-free (candidate evidence)

Commit: fec8743 · `pnpm test` (vitest 4, no DB)

```
 Test Files  2 passed (2)
      Tests  13 passed (13)
```

`src/queries/war-weeks.test.ts` covers: empty list; live beats upcoming/complete; most recent upcoming; most recent complete; complete newer by date never beats upcoming; startDate tie broken by editionNumber; old start date still returned (never uses the clock).
