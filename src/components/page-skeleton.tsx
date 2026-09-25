import { Skeleton } from "@/components/ui/skeleton";

/** The container every `/[edition]` sub-page uses, so nothing jumps. */
export const PAGE_SKELETON_CLASS =
  "mx-auto flex max-w-md flex-col gap-6 px-4 py-6 md:max-w-3xl";

/** One list-row placeholder, the height of a card or list item. */
export function RowSkeleton({ className }: { className?: string }) {
  return <Skeleton className={`h-14 w-full rounded-lg ${className ?? ""}`} />;
}

/**
 * A page-shaped skeleton: a title bar and a handful of row placeholders, in
 * the same container the real page uses. Pass `children` to replace the
 * default rows with a bespoke shape (e.g. a hero and Now/Next cards).
 */
export function PageSkeleton({
  rows = 4,
  title = true,
  className = PAGE_SKELETON_CLASS,
  children,
}: {
  rows?: number;
  title?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <main aria-busy="true" aria-label="Loading" className={className}>
      {title ? <Skeleton className="h-8 w-40" /> : null}
      {children ?? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: rows }).map((_, index) => (
            <RowSkeleton key={index} />
          ))}
        </div>
      )}
    </main>
  );
}
