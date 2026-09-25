import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { WarWeek } from "@/db/schema";

import { AdminShell } from "./admin-shell";

vi.mock("@/components/auth-buttons", () => ({
  SignOutButton: () => null,
}));

const fakeWarWeek = {
  edition: "xi",
  storyTheme: "Test theme",
  primaryColor: "#000",
  primaryForegroundColor: "#fff",
  accentColor: "#000",
  backgroundColor: "#fff",
  foregroundColor: "#000",
  fontPreset: "sans",
} as unknown as WarWeek;

describe("AdminShell", () => {
  it("links back to the War Week, not a public site", () => {
    const html = renderToStaticMarkup(
      <AdminShell
        warWeek={fakeWarWeek}
        email="o@jahnelgroup.com"
        current="Overview"
      >
        x
      </AdminShell>,
    );

    expect(html).toContain("Back to War Week XI");
    expect(html).not.toContain("public site");
  });
});
