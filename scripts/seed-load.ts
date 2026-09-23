import { loadEnvConfig } from "@next/env";
import { readFileSync } from "node:fs";
import path from "node:path";

import type { WarWeekSeed } from "@/seed/schema";

loadEnvConfig(process.cwd());

const USAGE = "Usage: pnpm seed:load [--reset] <seed.json> [<seed.json> ...]";

async function main() {
  const args = process.argv.slice(2);
  const reset = args.includes("--reset");
  const seedPaths = args.filter((arg) => arg !== "--reset");
  if (!seedPaths.length || seedPaths.some((arg) => arg.startsWith("--"))) {
    console.error(USAGE);
    process.exit(1);
  }

  const { warWeekSeedSchema } = await import("@/seed/schema");

  // Validate every file before loading any, so an invalid file loads
  // nothing. Each War Week then loads in its own transaction: a database
  // error on one file leaves the files before it loaded.
  const seeds: WarWeekSeed[] = [];
  let invalid = false;
  for (const seedPath of seedPaths) {
    const issues = (() => {
      try {
        const raw = readFileSync(
          path.resolve(process.cwd(), seedPath),
          "utf-8",
        );
        const parsed = warWeekSeedSchema.safeParse(JSON.parse(raw));
        if (parsed.success) {
          seeds.push(parsed.data);
          return [];
        }
        return parsed.error.issues.map(
          (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
        );
      } catch (error) {
        return [error instanceof Error ? error.message : String(error)];
      }
    })();
    if (issues.length) {
      invalid = true;
      console.error(`Invalid seed at ${seedPath}:`);
      for (const issue of issues) console.error(`  - ${issue}`);
    }
  }
  if (invalid) process.exit(1);

  const { loadWarWeekSeed } = await import("@/seed/load");
  for (const seed of seeds) {
    const warWeek = await loadWarWeekSeed(seed, undefined, { reset });
    console.log(`Loaded War Week ${warWeek.edition}${reset ? " (reset)" : ""}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
