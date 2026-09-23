import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSessionEmail, isGoogleConfigured } from "@/auth/server";
import { GoogleSignInButton } from "@/components/auth-buttons";
import { JG_EMAIL_DOMAIN, safeCallbackPath } from "@/lib/access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sign in · War Weeker" };

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
  const params = await searchParams;
  const callbackURL = safeCallbackPath(firstParam(params.callbackURL));
  const error = firstParam(params.error);

  if (await getSessionEmail()) redirect(callbackURL);

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Sign in to War Weeker</h1>
        <p className="text-foreground/70">
          {`Use your @${JG_EMAIL_DOMAIN} Google account.`}
        </p>
      </div>
      {error && (
        <p
          role="alert"
          className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm"
        >
          Sign-in failed. Only @{JG_EMAIL_DOMAIN} Google accounts can sign in.
        </p>
      )}
      {isGoogleConfigured ? (
        <GoogleSignInButton callbackURL={callbackURL} />
      ) : (
        <p className="text-foreground/70 text-sm">
          Google sign-in isn&apos;t configured on this server.
        </p>
      )}
    </main>
  );
}
