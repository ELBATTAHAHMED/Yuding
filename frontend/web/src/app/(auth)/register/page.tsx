'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login?mode=signup');
  }, [router]);

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#00796b', marginBottom: '1rem' }}></i>
        <p>Redirection vers le formulaire d&apos;inscription...</p>
      </div>
    </div>
  );
}
