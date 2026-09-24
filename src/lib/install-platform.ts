/** Which set of Add to Home Screen steps the Install app page shows. */
export type InstallPlatform = "ios" | "android" | "other";

/**
 * Picks the install steps for a visitor from `navigator.userAgent` and
 * `navigator.maxTouchPoints`. iPadOS Safari reports a desktop Mac user
 * agent, so a "Macintosh" with a touch screen counts as iOS. Pure function.
 */
export function detectInstallPlatform(
  userAgent: string,
  maxTouchPoints: number,
): InstallPlatform {
  if (/iPhone|iPad|iPod/.test(userAgent)) return "ios";
  if (/Macintosh/.test(userAgent) && maxTouchPoints > 1) return "ios";
  if (/Android/.test(userAgent)) return "android";
  return "other";
}
