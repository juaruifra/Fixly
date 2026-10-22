import { Skeleton } from "@/components/ui/skeleton";

export function PageLoader() {
  return (
    <div
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-label="Cargando página"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="rounded-lg border border-border bg-card p-5 shadow-sm"
        >
          <Skeleton className="mb-3 h-5 w-2/3" />
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mb-5 h-4 w-4/5" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}