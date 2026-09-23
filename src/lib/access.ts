import type { WarWeek } from "@/db/schema";

/** The only Google Workspace domain allowed to sign in. */
export const JG_EMAIL_DOMAIN = "jahnelgroup.com";

/**
 * Whether an email belongs to Jahnel Group: exactly one `@` and a domain of
 * exactly `jahnelgroup.com`, ignoring case and surrounding whitespace.
 * Subdomains and look-alike domains are rejected.
 */
export function isJahnelGroupEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const parts = email.trim().toLowerCase().split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  return local.length > 0 && domain === JG_EMAIL_DOMAIN;
}

/**
 * The one Organizer check: a signed-in Jahnel Group email on the War Week's
 * organizer allowlist, ignoring case. Every admin page and Organizer action
 * goes through this.
 */
export function isOrganizer(
  email: string | null | undefined,
  warWeek: Pick<WarWeek, "organizerEmails">,
): boolean {
  if (!email || !isJahnelGroupEmail(email)) return false;
  const normalized = email.trim().toLowerCase();
  return warWeek.organizerEmails.some(
    (allowed) => allowed.trim().toLowerCase() === normalized,
  );
}

export type AdminAccess = "anonymous" | "not-organizer" | "organizer";

export function adminAccess(
  email: string | null | undefined,
  warWeek: Pick<WarWeek, "organizerEmails">,
): AdminAccess {
  if (!email) return "anonymous";
  return isOrganizer(email, warWeek) ? "organizer" : "not-organizer";
}

/** Reads the `REQUIRE_SIGN_IN` env flag: only `true` or `1` turn it on. */
export function isRequireSignInOn(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === "true" || normalized === "1";
}

const ALWAYS_PUBLIC_PREFIXES = ["/sign-in", "/api/auth", "/api/mcp"];

/**
 * Paths that stay reachable without a session even when sign-in is
 * required for reads: the sign-in page, better-auth's own routes, and the
 * read-only MCP server (see CONTEXT.md, "Access rules").
 */
export function isAlwaysPublicPath(pathname: string): boolean {
  return ALWAYS_PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

const CALLBACK_BASE = "http://callback.invalid";

/**
 * Keeps a post-sign-in destination only when it is a path on this site;
 * anything else (absolute URLs, `//host`, backslash tricks) becomes `/`.
 */
export function safeCallbackPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  if (/\\|%5c/i.test(value)) return "/";
  try {
    const url = new URL(value, CALLBACK_BASE);
    if (url.origin !== CALLBACK_BASE) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
