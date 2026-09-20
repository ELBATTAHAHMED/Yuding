'use client';

import React, { useEffect } from 'react';
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
        <div style={{ textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#00796b', marginBottom: '1rem' }}></i>
          <p>Chargement de votre session sécurisée...</p>
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
          <button
            onClick={() => router.push('/')}
            style={{
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
          </button>
        </div>
      );
    }
  }

  return <>{children}</>;
};
