export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-2 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-foreground/70">Coming in a later slice.</p>
    </div>
  );
}
