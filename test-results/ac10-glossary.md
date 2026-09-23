# AC10 — glossary in CONTEXT.md; banned terms absent from code (final evidence)

`CONTEXT.md`: 22 glossary rows (War Week … Archive), banned-terms table, seed idempotence rules.

```
$ grep -rnwE 'Event|League|Member|Match|ELO|Placeholder|Tournament' src scripts drizzle || echo BANNED_TERMS_CLEAN
BANNED_TERMS_CLEAN
$ grep -rniwE 'placeholder|tournament|league|elo|match' src scripts || echo CASE_INSENSITIVE_CLEAN
CASE_INSENSITIVE_CLEAN
```
"Tournament Day" appears only in `seeds/xi.json` (historical content copied from the wiki; exempt per CONTEXT.md).
