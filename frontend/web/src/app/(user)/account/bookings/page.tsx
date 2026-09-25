'use client';

import Link from 'next/link';

export default function AccountBookingsPage() {
  return <main className="account-empty-page">
    <header className="account-page-header"><div><p className="account-kicker">VOTRE ESPACE VOYAGEUR</p><h1>Mes réservations</h1><p>Retrouvez au même endroit vos séjours, trajets et expériences.</p></div><span className="account-header-mark"><i className="fas fa-suitcase-rolling" aria-hidden="true" /></span></header>
    <section className="account-empty-panel" aria-labelledby="bookings-empty-title"><div className="account-empty-icon"><i className="fas fa-suitcase-rolling" aria-hidden="true" /></div><div className="account-empty-copy"><p className="account-kicker">VOTRE CARNET DE VOYAGE</p><h2 id="bookings-empty-title">Aucune réservation pour le moment</h2><p>Vos billets d&apos;avion, réservations d&apos;hôtels, transferts et activités confirmés apparaîtront ici automatiquement.</p></div><Link href="/" className="account-primary-action"><i className="fas fa-search" aria-hidden="true" /> Explorer les destinations</Link></section>
    <section className="account-help-row"><div><strong>Prêt à préparer votre prochain départ&nbsp;?</strong><span>Explorez les offres disponibles et construisez un voyage à votre rythme.</span></div><Link href="/planifier">Planifier un voyage <i className="fas fa-arrow-right" aria-hidden="true" /></Link></section>
  </main>;
}
