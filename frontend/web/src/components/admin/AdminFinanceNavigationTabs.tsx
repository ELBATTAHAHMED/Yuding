'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AdminFinanceNavigationTabs() {
  const pathname = usePathname();

  const isPayments = pathname.startsWith('/admin/payments');
  const isRefunds = pathname.startsWith('/admin/refunds');

  return (
    <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#1A1F28] rounded-xl border border-slate-200 dark:border-[#2D3748] w-fit">
      <Link
        href="/admin/payments"
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all no-underline ${
          isPayments
            ? 'bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-white shadow-xs'
            : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
        }`}
      >
        <i className="fas fa-wallet text-xs text-[#0D9488] dark:text-[#00D4AA]" />
        <span>Encaissements &amp; Règlements</span>
      </Link>
      <Link
        href="/admin/refunds"
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all no-underline ${
          isRefunds
            ? 'bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-white shadow-xs'
            : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
        }`}
      >
        <i className="fas fa-undo-alt text-xs text-rose-500" />
        <span>Annulations &amp; Remboursements</span>
      </Link>
    </div>
  );
}
