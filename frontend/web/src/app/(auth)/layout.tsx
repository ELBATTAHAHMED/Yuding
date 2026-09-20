import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-layout-root" style={{ minHeight: '100vh', position: 'relative' }}>
      {children}
    </div>
  );
}
