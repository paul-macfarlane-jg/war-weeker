import { loadEnvConfig } from "@next/env";
import { readFileSync } from "node:fs";
import path from "node:path";

loadEnvConfig(process.cwd());

async function main() {
  const seedPath = process.argv[2];
  if (!seedPath) {
    console.error("Usage: pnpm seed:load <path-to-seed.json>");
    process.exit(1);
  }

  const raw = readFileSync(path.resolve(process.cwd(), seedPath), "utf-8");
  const json = JSON.parse(raw);

  const { warWeekSeedSchema } = await import("@/seed/schema");
  const parsed = warWeekSeedSchema.safeParse(json);
  if (!parsed.success) {
    console.error(`Invalid seed at ${seedPath}:`);
    for (const issue of parsed.error.issues) {
      console.error(
        `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`,
      );
    }
    process.exit(1);
  }

  const { loadWarWeekSeed } = await import("@/seed/load");
  const warWeek = await loadWarWeekSeed(parsed.data);
  console.log(`Loaded War Week ${warWeek.edition}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
