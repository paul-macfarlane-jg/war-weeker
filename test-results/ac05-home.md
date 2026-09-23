# AC5/AC6 — home content, Appearance Theme CSS variables, bottom tab bar (final evidence)

`curl -s http://localhost:3100/xi | grep -oE ... | sort | uniq -c`:

```
   1 --font-sans:var(--font-preset-mono)
   1 --primary:#00ff41
   1 >Home<
   1 >Leaderboard<
   1 >More<
   1 >News<
   1 >Schedule<
   4 The Matrix
   6 War Week XI
   1 aria-label="Primary"
   4 banner.svg
   4 logo.svg
   2 slack.com/archives/war-week-xi
```

Edition, Story Theme, banner (`banner.svg`), logo (`logo.svg`), Slack button href, theme CSS variables (`--primary`, `--font-sans` → mono preset) and the five tab labels inside `<nav aria-label="Primary">` are all present. Mobile screenshot (375×812, headless Chrome): `test-results/ac05-home/mobile.png`.
