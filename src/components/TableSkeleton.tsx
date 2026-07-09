export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full">
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="grid gap-3 px-4 py-3.5 border-t border-border"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="h-3 rounded animate-shimmer"
              style={{ width: `${50 + ((r * 13 + c * 29) % 40)}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
