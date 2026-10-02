'use client';

import { useRef } from 'react';
import styles from './Pagination.module.css';

type PaginationProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, pageSize, totalItems, onPageChange }: PaginationProps) {
  const navRef = useRef<HTMLElement>(null);
  const totalPages = Math.ceil(totalItems / pageSize);
  if (totalPages <= 1) return null;

  const changePage = (nextPage: number) => {
    navRef.current?.parentElement?.scrollIntoView({ block: 'start', behavior: 'auto' });
    onPageChange(nextPage);
  };

  const visiblePages = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter(value => value === 1 || value === totalPages || Math.abs(value - page) <= 1);

  return (
    <nav ref={navRef} className={styles.pagination} aria-label="Pagination des résultats">
      <span className={styles.summary}>
        {Math.min((page - 1) * pageSize + 1, totalItems)}–{Math.min(page * pageSize, totalItems)} sur {totalItems}
      </span>
      <div className={styles.controls}>
        <button type="button" className={styles.button} onClick={() => changePage(page - 1)} disabled={page === 1} aria-label="Page précédente">‹</button>
        {visiblePages.map((value, index) => (
          <span key={value} className={styles.pageSlot}>
            {index > 0 && value - visiblePages[index - 1] > 1 && <span className={styles.ellipsis} aria-hidden="true">…</span>}
            <button
              type="button"
              className={`${styles.button} ${value === page ? styles.active : ''}`}
              onClick={() => changePage(value)}
              aria-label={`Page ${value}`}
              aria-current={value === page ? 'page' : undefined}
            >{value}</button>
          </span>
        ))}
        <button type="button" className={styles.button} onClick={() => changePage(page + 1)} disabled={page === totalPages} aria-label="Page suivante">›</button>
      </div>
    </nav>
  );
}
