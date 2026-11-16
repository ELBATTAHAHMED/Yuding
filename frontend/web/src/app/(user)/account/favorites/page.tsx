import { Suspense } from 'react';
import FavoritesClient from './FavoritesClient';

export default function AccountFavoritesPage() {
  return (
    <Suspense fallback={
      <main className="account-empty-page account-route-fallback" style={{ textAlign: 'center', padding: '60px 0' }}>
        <i className="fas fa-spinner fa-spin fa-2x account-loading-icon" aria-hidden="true" />
      </main>
    }>
      <FavoritesClient />
    </Suspense>
  );
}
