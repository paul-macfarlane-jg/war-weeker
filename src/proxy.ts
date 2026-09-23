import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth/server";
import {
  isAlwaysPublicPath,
  isJahnelGroupEmail,
  isRequireSignInOn,
} from "@/lib/access";

/**
 * With `REQUIRE_SIGN_IN` on, every page and API route except the sign-in
 * page, better-auth's routes and `/api/mcp` needs a Jahnel Group session.
 * With it off (the default), this does nothing and reads stay public.
 */
export async function proxy(request: NextRequest) {
  if (!isRequireSignInOn(process.env.REQUIRE_SIGN_IN)) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;
  if (isAlwaysPublicPath(pathname)) return NextResponse.next();

  const session = await auth.api.getSession({ headers: request.headers });
  if (session && isJahnelGroupEmail(session.user.email)) {
    return NextResponse.next();
  }

  const signIn = new URL("/sign-in", request.url);
  signIn.searchParams.set("callbackURL", `${pathname}${search}`);
  return NextResponse.redirect(signIn);
}

export const config = {
  // Skip Next's build assets and public files: any path with an extension.
  // No route has one today; a future one (e.g. `/xi/export.csv`) would need
  // this matcher narrowed.
  matcher: ["/((?!_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)"],
};
