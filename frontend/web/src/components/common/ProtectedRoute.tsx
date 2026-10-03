'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#00D4AA', marginBottom: '1rem' }}></i>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '1.25rem' }}>Chargement de votre session sécurisée...</p>
          <Link
            href={`/login?redirect=${encodeURIComponent(pathname)}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#00D4AA',
              fontSize: '0.85rem',
              fontWeight: 600,
              textDecoration: 'none',
              border: '1px solid rgba(0, 212, 170, 0.3)',
            }}
          >
            Se connecter à l&apos;administration →
          </Link>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasRequiredRole = allowedRoles.some((role) => user?.roles?.includes(role));
    if (!hasRequiredRole) {
      return (
        <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '2rem', textAlign: 'center', background: 'var(--card-bg, #fff)', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <i className="fas fa-shield-alt fa-3x" style={{ color: '#d32f2f', marginBottom: '1rem' }}></i>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#d32f2f' }}>Accès Refusé (403)</h2>
          <p style={{ marginBottom: '1.5rem', color: '#666' }}>
            Votre compte n&apos;a pas les autorisations requises ({allowedRoles.join(', ')}) pour accéder à cette ressource.
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#00796b',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Retourner à l&apos;accueil
          </Link>
        </div>
      );
    }
  }

  return <>{children}</>;
};
