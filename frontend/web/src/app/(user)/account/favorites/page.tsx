import { Suspense } from 'react';
import FavoritesClient from './FavoritesClient';

export default function AccountFavoritesPage() {
  return (
    <Suspense fallback={
      <main className="account-empty-page" style={{ textAlign: 'center', padding: '60px 0' }}>
        <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#0ea5e9' }} aria-hidden="true" />
      </main>
    }>
      <FavoritesClient />
    </Suspense>
  );
}
