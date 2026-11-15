"use client";
import React from "react";
import { Empty, ErrorState, Loading } from "./OperationsUI";
interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  width?: string;
  align?: "left" | "center" | "right";
  className?: string;
  sortable?: boolean;
}
export function AdminTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading,
  emptyMessage = "Aucun résultat pour ces filtres.",
  onRowClick,
  className = "",
  footer,
  error,
  retry,
  sortKey,
  sortDirection,
  onSort,
}: {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  isLoading?: boolean;
  emptyMessage?: string;
  emptySubtext?: string;
  emptyIcon?: string;
  onRowClick?: (item: T) => void;
  className?: string;
  footer?: React.ReactNode;
  error?: unknown;
  retry?: () => void;
  sortKey?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (key: string) => void;
}) {
  return (
    <div className={`ops-register ${className}`} aria-busy={isLoading}>
      <ErrorState error={error} retry={retry} />
      {isLoading ? (
        <Loading />
      ) : error ? null : data.length === 0 ? (
        <Empty>{emptyMessage}</Empty>
      ) : (
        <table className="ops-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={c.className}
                  style={{ width: c.width, textAlign: c.align }}
                  aria-sort={
                    sortKey === c.key
                      ? sortDirection === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  {onSort && c.sortable !== false ? (
                    <button onClick={() => onSort(c.key)}>
                      {c.header}
                      {sortKey === c.key
                        ? sortDirection === "asc"
                          ? " ↑"
                          : " ↓"
                        : ""}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr
                key={keyExtractor(item)}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest("a, button, input, select, textarea, label")) return;
                  onRowClick?.(item);
                }}
                onKeyDown={(e) => {
                  if (
                    e.target === e.currentTarget &&
                    (e.key === "Enter" || e.key === " ")
                  ) {
                    e.preventDefault();
                    onRowClick?.(item);
                  }
                }}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    data-label={c.header}
                    className={c.className}
                    style={{ textAlign: c.align }}
                  >
                    {c.render
                      ? c.render(item)
                      : String((item as Record<string, unknown>)[c.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!error && !isLoading && footer}
    </div>
  );
}
