"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/auth/client";
import { Button } from "@/components/ui/button";

export function GoogleSignInButton({ callbackURL }: { callbackURL: string }) {
  const [pending, setPending] = useState(false);

  return (
    <Button
      size="lg"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const { error } = await authClient.signIn.social({
          provider: "google",
          callbackURL,
          errorCallbackURL: "/sign-in",
        });
        if (error) setPending(false);
      }}
    >
      {pending ? "Redirecting to Google…" : "Sign in with Google"}
    </Button>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      Sign out
    </Button>
  );
}
