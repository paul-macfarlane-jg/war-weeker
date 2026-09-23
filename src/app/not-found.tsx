import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">No such War Week</h1>
      <p className="text-foreground/70">
        We couldn&apos;t find that edition. Check the link and try again.
      </p>
      <Link href="/" className="text-primary underline underline-offset-4">
        Go to the current War Week
      </Link>
    </div>
  );
}
