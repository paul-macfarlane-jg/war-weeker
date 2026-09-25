import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { llmsTxt } from "@/mcp/llms-txt";
import { MCP_TOOLS } from "@/mcp/tools";

const ORIGIN = "https://war-weeker.example";

function registeredToolNames(): string[] {
  const source = readFileSync(
    join(process.cwd(), "src/app/api/mcp/route.ts"),
    "utf8",
  );
  return [...source.matchAll(/registerTool\(\s*"([a-z_]+)"/g)].map(
    (match) => match[1],
  );
}

describe("MCP_TOOLS", () => {
  it("lists exactly the tools the MCP route registers", () => {
    expect(registeredToolNames().sort()).toEqual(Object.keys(MCP_TOOLS).sort());
  });
});

describe("llmsTxt", () => {
  const text = llmsTxt(ORIGIN);

  it("follows the llmstxt.org shape: H1, summary blockquote, sections", () => {
    const lines = text.split("\n");
    expect(lines[0]).toBe("# JG War Week");
    expect(lines.find((line) => line.startsWith("> "))).toBeDefined();
    for (const section of ["Pages", "MCP", "Access", "Source"]) {
      expect(text).toContain(`\n## ${section}\n`);
    }
  });

  it("names every registered MCP tool with its description", () => {
    for (const name of registeredToolNames()) {
      expect(text).toContain(`\`${name}\``);
    }
    for (const tool of Object.values(MCP_TOOLS)) {
      expect(text).toContain(tool.description);
    }
  });

  it("points at the MCP endpoint and the bearer-token header", () => {
    expect(text).toContain(`${ORIGIN}/api/mcp`);
    expect(text).toContain("Authorization: Bearer <MCP_TOKEN>");
  });

  it("links the source repo from the footer", () => {
    expect(text).toContain("https://github.com/paul-macfarlane/jg-war-week");
  });
});
