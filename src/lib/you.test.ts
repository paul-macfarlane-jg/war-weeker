import { describe, expect, it } from "vitest";

import { parseStoredYou, resolveYou, youStorageKey } from "@/lib/you";

const participants = [
  { id: "p-ada", email: "Ada@JahnelGroup.com" },
  { id: "p-bob", email: null },
  { id: "p-cy", email: "cy@jahnelgroup.com" },
];

describe("resolveYou", () => {
  it("links the session email to a Participant, ignoring case", () => {
    expect(
      resolveYou({
        sessionEmail: " ada@jahnelgroup.COM ",
        participants,
        storedId: null,
      }),
    ).toEqual({ participantId: "p-ada", via: "email" });
  });

  it("prefers the email match over a stored pick", () => {
    expect(
      resolveYou({
        sessionEmail: "cy@jahnelgroup.com",
        participants,
        storedId: "p-bob",
      }),
    ).toEqual({ participantId: "p-cy", via: "email" });
  });

  it("uses a valid stored pick when the email matches nobody", () => {
    expect(
      resolveYou({
        sessionEmail: "someone-else@jahnelgroup.com",
        participants,
        storedId: "p-bob",
      }),
    ).toEqual({ participantId: "p-bob", via: "pick" });
  });

  it("drops a stored id that isn't in this War Week", () => {
    expect(
      resolveYou({
        sessionEmail: "someone-else@jahnelgroup.com",
        participants,
        storedId: "p-gone",
      }),
    ).toBeNull();
  });

  it("is nobody with no email match and no pick", () => {
    expect(
      resolveYou({ sessionEmail: null, participants, storedId: null }),
    ).toBeNull();
  });

  it("never matches a blank session email to a Participant with no email", () => {
    expect(
      resolveYou({ sessionEmail: "", participants, storedId: null }),
    ).toBeNull();
  });
});

describe("youStorageKey", () => {
  it("is per War Week edition", () => {
    expect(youStorageKey("xi")).toBe("ww:you:xi");
  });
});

describe("parseStoredYou", () => {
  it("keeps a non-blank id", () => {
    expect(parseStoredYou(" p-ada ")).toBe("p-ada");
  });

  it("is null for missing or blank values", () => {
    expect(parseStoredYou(null)).toBeNull();
    expect(parseStoredYou("   ")).toBeNull();
  });
});
