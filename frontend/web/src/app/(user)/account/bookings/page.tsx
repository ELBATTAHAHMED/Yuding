import { Suspense } from 'react';
import BookingsClient from './BookingsClient';

export default function AccountBookingsPage() {
  return (
    <Suspense
      fallback={
        <main className="account-empty-page" style={{ textAlign: 'center', padding: '60px 0' }}>
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#087d70' }} aria-hidden="true" />
        </main>
      }
    >
      <BookingsClient />
    </Suspense>
  );
}
