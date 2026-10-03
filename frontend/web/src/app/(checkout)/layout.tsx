import React from 'react';
import { Header } from '@/components/layout/Header';
import './checkout.css';

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="checkout-shell">
      <Header />
      <main className="checkout-shell__main">{children}</main>
    </div>
  );
}
