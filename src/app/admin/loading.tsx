import { PageSkeleton, RowSkeleton } from "@/components/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/** Matches the Admin overview's header bar and content column. */
export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="border-border flex items-center gap-4 border-b px-4 py-3 md:px-6">
        <Skeleton className="h-6 w-48" />
      </div>
      <PageSkeleton
        title={false}
        className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-6"
      >
        <Skeleton className="h-8 w-64" />
        <RowSkeleton className="h-20" />
        <RowSkeleton className="h-20" />
      </PageSkeleton>
    </div>
  );
}
