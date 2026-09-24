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

const PUBLIC_PREFIXES = ["/sign-in", "/api/auth"];

/**
 * The only paths reachable without a session: the sign-in page and
 * better-auth's own routes. Everything else needs a Jahnel Group sign-in,
 * except that `/api/mcp` also takes `canUseMcp` (see CONTEXT.md, "Access
 * rules").
 */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
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

export type McpAccessInput = {
  /** A signed-in Jahnel Group session. */
  hasSession: boolean;
  /** The request's `Authorization` header, if any. */
  authorization: string | null | undefined;
  /** `MCP_TOKEN`; unset or blank turns token auth off. */
  mcpToken: string | undefined;
  /** `MCP_PUBLIC`; only `true` opens `/api/mcp` to everyone. */
  mcpPublic: string | undefined;
};

/**
 * Who may use `/api/mcp`: a Jahnel Group session, a request carrying
 * `Authorization: Bearer <MCP_TOKEN>`, or anyone while `MCP_PUBLIC=true`
 * (see CONTEXT.md, "Access rules"). Every MCP tool is read-only and returns
 * only what a signed-in Participant sees.
 */
export function canUseMcp({
  hasSession,
  authorization,
  mcpToken,
  mcpPublic,
}: McpAccessInput): boolean {
  if (hasSession) return true;
  if (mcpPublic?.trim().toLowerCase() === "true") return true;

  const expected = mcpToken?.trim();
  if (!expected || !authorization) return false;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match ? constantTimeEqual(match[1].trim(), expected) : false;
}

/** Compares every character whatever the input, so timing doesn't leak it. */
function constantTimeEqual(a: string, b: string): boolean {
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < length; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}
