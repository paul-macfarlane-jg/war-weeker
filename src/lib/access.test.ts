import { describe, expect, it } from "vitest";

import {
  adminAccess,
  isJahnelGroupEmail,
  isOrganizer,
  isPublicPath,
  safeCallbackPath,
} from "@/lib/access";

describe("isJahnelGroupEmail", () => {
  it.each([
    "pmacfarlane@jahnelgroup.com",
    "PMacfarlane@JahnelGroup.com",
    "  someone@jahnelgroup.com  ",
    "first.last+tag@jahnelgroup.com",
  ])("accepts %j", (email) => {
    expect(isJahnelGroupEmail(email)).toBe(true);
  });

  it.each([
    "someone@gmail.com",
    "someone@jahnelgroup.co",
    "someone@evil-jahnelgroup.com",
    "someone@jahnelgroup.com.evil.com",
    "someone@mail.jahnelgroup.com",
    "a@evil.com@jahnelgroup.com",
    "jahnelgroup.com",
    "@jahnelgroup.com",
    "someone@",
    "",
    null,
    undefined,
  ])("rejects %j", (email) => {
    expect(isJahnelGroupEmail(email)).toBe(false);
  });
});

describe("isOrganizer", () => {
  const warWeek = {
    organizerEmails: ["pmacfarlane@jahnelgroup.com", "Lead@JahnelGroup.com"],
  };

  it("accepts a JG email on the War Week's allowlist, ignoring case", () => {
    expect(isOrganizer("pmacfarlane@jahnelgroup.com", warWeek)).toBe(true);
    expect(isOrganizer("PMACFARLANE@jahnelgroup.com", warWeek)).toBe(true);
    expect(isOrganizer("lead@jahnelgroup.com", warWeek)).toBe(true);
  });

  it("rejects a JG email that isn't on the allowlist", () => {
    expect(isOrganizer("someone@jahnelgroup.com", warWeek)).toBe(false);
  });

  it("rejects a non-JG email even if it is on the allowlist", () => {
    expect(
      isOrganizer("outsider@gmail.com", {
        organizerEmails: ["outsider@gmail.com"],
      }),
    ).toBe(false);
  });

  it("rejects anonymous users and empty allowlists", () => {
    expect(isOrganizer(null, warWeek)).toBe(false);
    expect(isOrganizer(undefined, warWeek)).toBe(false);
    expect(
      isOrganizer("pmacfarlane@jahnelgroup.com", { organizerEmails: [] }),
    ).toBe(false);
  });
});

describe("adminAccess", () => {
  const warWeek = { organizerEmails: ["pmacfarlane@jahnelgroup.com"] };

  it("is anonymous with no signed-in email", () => {
    expect(adminAccess(null, warWeek)).toBe("anonymous");
  });

  it("is not-organizer for a signed-in JG user off the allowlist", () => {
    expect(adminAccess("someone@jahnelgroup.com", warWeek)).toBe(
      "not-organizer",
    );
  });

  it("is organizer for a signed-in user on the allowlist", () => {
    expect(adminAccess("pmacfarlane@jahnelgroup.com", warWeek)).toBe(
      "organizer",
    );
  });
});

describe("isPublicPath", () => {
  it.each(["/sign-in", "/api/auth", "/api/auth/callback/google"])(
    "keeps %j public",
    (pathname) => {
      expect(isPublicPath(pathname)).toBe(true);
    },
  );

  it.each([
    "/",
    "/xi",
    "/xi/leaderboard",
    "/admin",
    "/api/mcp",
    "/sign-in-other",
    "/api/authx",
  ])("requires sign-in for %j", (pathname) => {
    expect(isPublicPath(pathname)).toBe(false);
  });
});

describe("safeCallbackPath", () => {
  it.each([
    ["/admin", "/admin"],
    ["/xi/leaderboard?tab=team", "/xi/leaderboard?tab=team"],
  ])("keeps the same-origin path %j", (value, expected) => {
    expect(safeCallbackPath(value)).toBe(expected);
  });

  it.each([
    undefined,
    "",
    "admin",
    "//evil.com",
    "/\\evil.com",
    "https://evil.com/admin",
    "/%5Cevil.com",
    "javascript:alert(1)",
  ])("falls back to / for %j", (value) => {
    expect(safeCallbackPath(value)).toBe("/");
  });
});
