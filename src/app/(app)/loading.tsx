import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level skeleton for every page under (app). Next.js shows this
 * the moment a navigation starts, so a click responds instantly while
 * the server action / RSC render completes in the background.
 */
export default function AppLoading() {
  return (
    <div className="space-y-6 animate-fade-in" aria-busy="true" aria-label="Loading">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>

      {/* Summary / stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>

      {/* Main chart block */}
      <Skeleton className="h-64 rounded-2xl sm:h-80" />

      {/* Secondary grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
    </div>
  );
}
