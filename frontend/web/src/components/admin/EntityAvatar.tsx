'use client';

import React from 'react';

interface EntityAvatarProps {
  name?: string;
  email?: string;
  photoUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'brand' | 'neutral' | 'accent' | 'operator';
  className?: string;
}

const SIZE_MAP = {
  xs: 'w-6 h-6 text-[0.625rem]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-14 h-14 text-lg',
};

export function EntityAvatar({
  name,
  email,
  photoUrl,
  size = 'sm',
  variant = 'brand',
  className = '',
}: EntityAvatarProps) {
  const sizeClasses = SIZE_MAP[size] || SIZE_MAP.sm;

  const initials = React.useMemo(() => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return parts[0].substring(0, 2).toUpperCase();
    }
    if (email && email.trim()) {
      return email.trim().substring(0, 2).toUpperCase();
    }
    return 'YD';
  }, [name, email]);

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name || email || 'Avatar'}
        className={`${sizeClasses} rounded-full object-cover flex-shrink-0 border border-slate-200 dark:border-slate-800 ${className}`}
        onError={(e) => {
          // If image fails to load, hide image and show fallback
          (e.target as HTMLElement).style.display = 'none';
        }}
      />
    );
  }

  const bgStyle =
    variant === 'operator' || variant === 'brand'
      ? {
          background: 'linear-gradient(135deg, #00D4AA 0%, #01796F 100%)',
          color: '#0B0F19',
        }
      : variant === 'accent'
      ? {
          backgroundColor: 'var(--admin-accent-subtle)',
          color: 'var(--admin-accent)',
          border: '1px solid var(--admin-accent-border)',
        }
      : {
          backgroundColor: 'var(--admin-surface-muted)',
          color: 'var(--admin-text-secondary)',
          border: '1px solid var(--admin-border)',
        };

  return (
    <div
      className={`${sizeClasses} rounded-full flex items-center justify-center font-bold tracking-tight select-none flex-shrink-0 shadow-2xs ${className}`}
      style={bgStyle}
      aria-hidden="true"
    >
      <span>{initials}</span>
    </div>
  );
}
