import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton({ rows = 5, columns = 5 }) {
  return (
    <div
      className="overflow-x-auto rounded-lg border border-border bg-card"
      role="status"
      aria-label="Cargando servicios"
      aria-live="polite"
    >
      <div className="min-w-[920px] space-y-2 p-3">
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }, (_, columnIndex) => (
              <Skeleton
                key={`${rowIndex}-${columnIndex}`}
                className="h-10 w-full"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}