'use client';

import Link from 'next/link';

export default function AccountFavoritesPage() {
  return <main className="account-empty-page">
    <header className="account-page-header"><div><p className="account-kicker">VOTRE ESPACE VOYAGEUR</p><h1>Mes favoris</h1><p>Gardez vos hébergements, vols et expériences préférés sous la main.</p></div><span className="account-header-mark favorite"><i className="fas fa-heart" aria-hidden="true" /></span></header>
    <section className="account-empty-panel" aria-labelledby="favorites-empty-title"><div className="account-empty-icon favorite"><i className="fas fa-heart" aria-hidden="true" /></div><div className="account-empty-copy"><p className="account-kicker">VOTRE LISTE D&apos;ENVIES</p><h2 id="favorites-empty-title">Aucun favori enregistré</h2><p>Explorez nos hébergements, trajets et activités, puis ajoutez vos coups de cœur pour les retrouver rapidement.</p></div><Link href="/hotels" className="account-primary-action favorite"><i className="fas fa-bed" aria-hidden="true" /> Découvrir les hébergements</Link></section>
    <section className="account-help-row"><div><strong>Une destination vous tente déjà&nbsp;?</strong><span>Commencez par choisir une ville et composez votre prochaine escapade.</span></div><Link href="/activities">Explorer les activités <i className="fas fa-arrow-right" aria-hidden="true" /></Link></section>
  </main>;
}
