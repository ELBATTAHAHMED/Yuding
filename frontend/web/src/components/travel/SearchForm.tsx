import React from 'react';
import { Button } from '@/components/ui/Button';

export interface SearchFormProps {
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
  isLoading?: boolean;
  submitLabel?: string;
  submitIcon?: string;
  className?: string;
}

export const SearchForm: React.FC<SearchFormProps> = ({
  onSubmit,
  children,
  isLoading = false,
  submitLabel = 'Rechercher',
  submitIcon = 'fa-search',
  className = '',
}) => {
  return (
    <form
      onSubmit={onSubmit}
      className={`bg-white dark:bg-[#1A1F2E] p-6 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.4)] border border-gray-100 dark:border-white/5 transition-colors ${className}`}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        {children}
        <div className="mb-3">
          <Button
            type="submit"
            isLoading={isLoading}
            fullWidth
            icon={<i className={`fas ${submitIcon}`} />}
            className="py-2.5"
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
};
