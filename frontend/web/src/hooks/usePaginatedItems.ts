import { useEffect, useState } from 'react';

export function usePaginatedItems<T>(items: T[], pageSize = 9) {
  const [requestedPage, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(requestedPage, totalPages);

  // A new search, filter, sort, or loaded list starts at its first page.
  useEffect(() => setPage(1), [items]);

  return {
    page,
    setPage,
    pageItems: items.slice((page - 1) * pageSize, page * pageSize),
    pageSize,
  };
}
