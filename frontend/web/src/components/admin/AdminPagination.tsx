"use client";
export function AdminPagination({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}: {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}) {
  const pages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = totalItems
    ? Math.min((currentPage - 1) * pageSize + 1, totalItems)
    : 0;
  return (
    <nav className="ops-pagination" aria-label="Pagination">
      <span>
        {start}–{Math.min(currentPage * pageSize, totalItems)} sur {totalItems}
      </span>
      <label>
        Par page{" "}
        <select
          aria-label="Résultats par page"
          value={pageSize}
          onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
        >
          {pageSizeOptions.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <div>
        <button
          className="ops-btn"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Précédent
        </button>
        {Array.from(
          { length: Math.min(5, pages) },
          (_, i) =>
            Math.min(Math.max(1, currentPage - 2), Math.max(1, pages - 4)) + i,
        ).map((p) => (
          <button
            className="ops-btn ops-page-number"
            key={p}
            aria-current={p === currentPage ? "page" : undefined}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}
        <button
          className="ops-btn"
          disabled={currentPage >= pages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Suivant
        </button>
      </div>
    </nav>
  );
}
