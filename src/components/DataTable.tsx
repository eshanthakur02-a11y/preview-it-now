import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown, Download, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/TableSkeleton";
import { exportCSV } from "@/lib/csv-export";
import { cn } from "@/lib/utils";

export type DTColumn<T> = {
  key: string;
  label: string;
  get?: (row: T) => unknown;
  render?: (row: T) => ReactNode;
  className?: string;
  sortable?: boolean;
  headerClassName?: string;
  align?: "left" | "right" | "center";
};

export function DataTable<T extends { id?: string | number }>({
  rows,
  columns,
  loading,
  pageSize = 10,
  searchKeys,
  filename = "export",
  toolbar,
  emptyTitle = "No records yet",
  emptyDescription,
  onRowClick,
  hideSearch,
  hideExport,
  striped = true,
}: {
  rows: T[];
  columns: DTColumn<T>[];
  loading?: boolean;
  pageSize?: number;
  searchKeys?: (keyof T | string)[];
  filename?: string;
  toolbar?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  hideSearch?: boolean;
  hideExport?: boolean;
  striped?: boolean;
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    if (!q) return rows;
    const needle = q.toLowerCase();
    const keys = (searchKeys ?? columns.map((c) => c.key)) as string[];
    return rows.filter((r) =>
      keys.some((k) =>
        String((r as Record<string, unknown>)[k] ?? "")
          .toLowerCase()
          .includes(needle),
      ),
    );
  }, [rows, q, searchKeys, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col || col.sortable === false) return filtered;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = col.get ? col.get(a) : (a as Record<string, unknown>)[sortKey];
      const bv = col.get ? col.get(b) : (b as Record<string, unknown>)[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return -1 * dir;
      if (bv == null) return 1 * dir;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv), undefined, { numeric: true }) * dir;
    });
  }, [filtered, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const slice = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  function toggleSort(key: string) {
    const col = columns.find((c) => c.key === key);
    if (!col || col.sortable === false) return;
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const alignClass: Record<NonNullable<DTColumn<T>["align"]>, string> = {
    left: "text-left",
    right: "text-right",
    center: "text-center",
  };

  return (
    <div className="space-y-3">
      {(!hideSearch || toolbar || !hideExport) && (
        <div className="flex flex-wrap items-center gap-2">
          {!hideSearch && (
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search…"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            {toolbar}
            {!hideExport && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() =>
                  exportCSV(
                    filename,
                    sorted as Record<string, unknown>[],
                    columns.map((c) => ({
                      key: c.key,
                      label: c.label,
                      get: c.get as never,
                    })),
                  )
                }
                disabled={sorted.length === 0}
              >
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground sticky top-0 z-10 backdrop-blur">
              <tr>
                {columns.map((c) => {
                  const isSorted = sortKey === c.key;
                  const isSortable = c.sortable !== false;
                  return (
                    <th
                      key={c.key}
                      className={cn(
                        "px-4 py-3 font-semibold border-b border-border select-none",
                        c.align ? alignClass[c.align] : "text-left",
                        isSortable && "cursor-pointer hover:text-foreground transition-colors",
                        c.headerClassName ?? c.className ?? "",
                      )}
                      onClick={isSortable ? () => toggleSort(c.key) : undefined}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {c.label}
                        {isSortable && (
                          <span className="text-muted-foreground/50">
                            {isSorted ? (
                              sortDir === "asc" ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )
                            ) : (
                              <ChevronsUpDown className="h-3 w-3 opacity-50" />
                            )}
                          </span>
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="p-0">
                    <TableSkeleton rows={5} cols={columns.length} />
                  </td>
                </tr>
              ) : slice.length === 0 ? (
                <tr>
                  <td colSpan={columns.length}>
                    <EmptyState title={emptyTitle} description={emptyDescription} />
                  </td>
                </tr>
              ) : (
                slice.map((row, i) => (
                  <tr
                    key={(row.id as string | number) ?? i}
                    className={cn(
                      "border-t border-border transition-colors",
                      striped && i % 2 === 1 ? "bg-muted/20" : "bg-transparent",
                      onRowClick
                        ? "cursor-pointer hover:bg-accent/60"
                        : "hover:bg-muted/30",
                    )}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={cn(
                          "px-4 py-3 text-foreground/90",
                          c.align ? alignClass[c.align] : "",
                          c.className ?? "",
                        )}
                      >
                        {c.render
                          ? c.render(row)
                          : String(
                              c.get
                                ? c.get(row) ?? "—"
                                : (row as Record<string, unknown>)[c.key] ?? "—",
                            )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {sorted.length > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted-foreground bg-muted/20">
            <span>
              Showing <span className="text-foreground font-medium">{(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sorted.length)}</span> of {sorted.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
              >
                Previous
              </Button>
              <span className="px-2">
                Page <span className="text-foreground font-medium">{safePage}</span> of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
