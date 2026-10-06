'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authService } from '@/services/auth.service';

interface UserPhotoAvatarProps {
  user?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    hasProfilePhoto?: boolean;
    updatedAt?: string;
  } | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function UserPhotoAvatar({ user, className = '', size = 'md' }: UserPhotoAvatarProps) {
  const photo = useQuery({
    queryKey: ['profile-photo', user?.id, user?.updatedAt],
    queryFn: authService.getProfilePhoto,
    // Note: getProfilePhoto fetches /api/account/me/photo for current user.
    enabled: Boolean(user?.hasProfilePhoto),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!photo.data) {
      setPhotoUrl(null);
      return;
    }
    const url = URL.createObjectURL(photo.data);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo.data]);

  const initials = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part!.trim().charAt(0))
    .join('')
    .toUpperCase() || 'U';

  const sizeClass = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-9 h-9 text-xs';

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Photo de profil'}
        className={`rounded-full object-cover border border-[#E2E8F0] dark:border-[#2D3748] shrink-0 ${sizeClass} ${className}`}
      />
    );
  }

  // Deterministic clean gradient based on initials
  const charCode = (initials.charCodeAt(0) || 0) + (initials.charCodeAt(1) || 0);
  const gradients = [
    'from-emerald-600 to-teal-700 text-white',
    'from-blue-600 to-indigo-700 text-white',
    'from-violet-600 to-purple-800 text-white',
    'from-amber-600 to-orange-700 text-white',
    'from-slate-700 to-slate-900 text-white',
  ];
  const bgClass = gradients[charCode % gradients.length];

  return (
    <span
      className={`rounded-full flex items-center justify-center font-bold select-none border border-[#E2E8F0] dark:border-[#2D3748] bg-gradient-to-br shrink-0 ${bgClass} ${sizeClass} ${className}`}
      aria-label={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Avatar utilisateur'}
    >
      {initials}
    </span>
  );
}
