import React from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="checkout-shell">
      <Header />
      <main style={{ minHeight: 'calc(100vh - 200px)' }}>{children}</main>
      <Footer />
    </div>
  );
}
