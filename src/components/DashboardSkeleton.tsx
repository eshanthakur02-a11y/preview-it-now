export function StatCardSkeleton() {
  return (
    <div className="surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-3">
          <div className="h-2.5 w-20 rounded animate-shimmer" />
          <div className="h-8 w-28 rounded animate-shimmer" />
          <div className="h-3 w-24 rounded animate-shimmer opacity-60" />
        </div>
        <div className="h-9 w-9 rounded-lg animate-shimmer" />
      </div>
    </div>
  );
}

export function ChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div className="surface p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-40 rounded animate-shimmer" />
        <div className="h-3 w-16 rounded animate-shimmer opacity-60" />
      </div>
      <div
        className="rounded-lg animate-shimmer"
        style={{ height }}
      />
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="surface p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-40 rounded animate-shimmer" />
        <div className="h-3 w-16 rounded animate-shimmer opacity-60" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <div className="h-9 w-9 rounded-full animate-shimmer shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/2 rounded animate-shimmer" />
              <div className="h-2.5 w-1/3 rounded animate-shimmer opacity-60" />
            </div>
            <div className="h-3 w-12 rounded animate-shimmer opacity-60" />
          </div>
        ))}
      </div>
    </div>
  );
}
