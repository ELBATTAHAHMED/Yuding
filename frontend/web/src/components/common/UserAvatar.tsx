'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/useAuth';
import { authService } from '@/services/auth.service';

export function UserAvatar({ className = '' }: { className?: string }) {
  const { user } = useAuth();
  const photo = useQuery({
    queryKey: ['profile-photo', user?.id, user?.updatedAt],
    queryFn: authService.getProfilePhoto,
    enabled: Boolean(user?.hasProfilePhoto),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!photo.data) { setPhotoUrl(null); return; }
    const url = URL.createObjectURL(photo.data);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo.data]);

  const initials = [user?.firstName, user?.lastName].filter(Boolean).slice(0, 2)
    .map(part => part!.trim().charAt(0)).join('').toUpperCase() || 'Y';

  return <span className={`yuding-user-avatar ${className}`} aria-hidden="true">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {photoUrl ? <img src={photoUrl} alt="" /> : <span>{initials}</span>}
  </span>;
}
