import { Suspense } from 'react';
import BookingsClient from './BookingsClient';

export default function AccountBookingsPage() {
  return (
    <Suspense
      fallback={
        <main className="account-empty-page account-route-fallback" style={{ textAlign: 'center', padding: '60px 0' }}>
          <i className="fas fa-spinner fa-spin account-loading-icon" aria-hidden="true" />
        </main>
      }
    >
      <BookingsClient />
    </Suspense>
  );
}
