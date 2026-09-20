import React from 'react';

export interface LoadingSkeletonProps {
  variant?: 'text' | 'card' | 'circle' | 'table-row';
  count?: number;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'text',
  count = 1,
  className = '',
}) => {
  const items = Array.from({ length: count });

  if (variant === 'card') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((_, idx) => (
          <div
            key={idx}
            className={`rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1A1F2E] overflow-hidden shadow-sm animate-pulse ${className}`}
          >
            <div className="h-48 bg-gray-200 dark:bg-gray-800 w-full" />
            <div className="p-5 space-y-3">
              <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
              <div className="pt-4 flex justify-between items-center">
                <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-1/4" />
                <div className="h-9 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'circle') {
    return (
      <div className="flex gap-3 items-center">
        {items.map((_, idx) => (
          <div
            key={idx}
            className={`rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse w-10 h-10 shrink-0 ${className}`}
          />
        ))}
      </div>
    );
  }

  if (variant === 'table-row') {
    return (
      <tbody className="divide-y divide-gray-100 dark:divide-white/5">
        {items.map((_, idx) => (
          <tr key={idx} className="animate-pulse">
            <td className="p-4"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-32" /></td>
            <td className="p-4"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-48" /></td>
            <td className="p-4"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-20" /></td>
            <td className="p-4"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-16" /></td>
          </tr>
        ))}
      </tbody>
    );
  }

  return (
    <div className="space-y-2.5">
      {items.map((_, idx) => (
        <div
          key={idx}
          className={`h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse ${className}`}
        />
      ))}
    </div>
  );
};
