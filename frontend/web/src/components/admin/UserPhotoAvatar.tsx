"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { authService } from "@/services/auth.service";
import { useAuth } from "@/features/auth/useAuth";
export function UserPhotoAvatar({
  user,
  className = "",
  size = "md",
}: {
  user?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    hasProfilePhoto?: boolean;
    updatedAt?: string;
  } | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const { user: operator } = useAuth();
  const photo = useQuery({
    queryKey: ["profile-photo", user?.id, user?.updatedAt],
    queryFn: () =>
      user?.id && user.id !== operator?.id
        ? authService.getUserPhoto(user.id)
        : authService.getProfilePhoto(),
    enabled: Boolean(user?.hasProfilePhoto),
    staleTime: 300000,
    retry: false,
  });
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
    if (!photo.data) {
      setUrl(null);
      return;
    }
    const value = URL.createObjectURL(photo.data);
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [photo.data, user?.id]);
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  const initials =
    [user?.firstName, user?.lastName]
      .filter(Boolean)
      .map((p) => p!.trim().charAt(0))
      .join("")
      .toUpperCase() || "—";
  return url && !failed ? (
    <img
      src={url}
      alt={name || "Photo de profil"}
      onError={() => setFailed(true)}
      className={`ops-avatar ops-avatar-${size} ${className}`}
    />
  ) : (
    <span
      className={`ops-avatar ops-avatar-${size} ${className}`}
      aria-label={name || "Identité non disponible"}
    >
      {initials}
    </span>
  );
}
