'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authService } from '@/services/auth.service';

interface EntityAvatarProps {
  name?: string;
  email?: string;
  photoUrl?: string | null;
  userId?: string;
  hasProfilePhoto?: boolean;
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
  userId,
  hasProfilePhoto,
  size = 'sm',
  variant = 'brand',
  className = '',
}: EntityAvatarProps) {
  const sizeClasses = SIZE_MAP[size] || SIZE_MAP.sm;
  const [blobUrl, setBlobUrl] = useState<string | null>(photoUrl || null);

  // If this entity is an operator/user with hasProfilePhoto, fetch via authService if needed
  const shouldFetchPhoto = Boolean(hasProfilePhoto && !photoUrl);
  const photoQuery = useQuery({
    queryKey: ['entity-avatar-photo', userId || email],
    queryFn: authService.getProfilePhoto,
    enabled: shouldFetchPhoto,
    staleTime: 5 * 60_000,
    retry: false,
  });

  useEffect(() => {
    if (photoUrl) {
      setBlobUrl(photoUrl);
      return;
    }
    if (photoQuery.data) {
      const url = URL.createObjectURL(photoQuery.data);
      setBlobUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [photoUrl, photoQuery.data]);

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

  if (blobUrl) {
    return (
      <img
        src={blobUrl}
        alt={name || email || 'Avatar'}
        className={`${sizeClasses} rounded-full object-cover flex-shrink-0 border border-slate-200 dark:border-zinc-800 ${className}`}
        onError={() => {
          setBlobUrl(null);
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
