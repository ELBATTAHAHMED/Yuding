'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import { aiService } from '@/services/ai.service';
import { libraryService } from '@/services/library.service';
import { TravelPage } from '@/components/travel/TravelPage';
import { TravelHero } from '@/components/travel/TravelHero';
import type { TripPlanDto, TripPlanItemDto, TripPlanRequest } from '@/types/ai.types';
import type { SavedTripItem } from '@/types/library.types';
import './planifier.css';

// ─── Preferences ─────────────────────────────────────────────────────────────
const PREFS = [
  { id: 'food',       label: 'Gastronomie',     icon: 'fas fa-utensils' },
  { id: 'museums',    label: 'Musées & Culture', icon: 'fas fa-landmark' },
  { id: 'nature',     label: 'Nature & Parcs',   icon: 'fas fa-tree' },
  { id: 'local',      label: 'Activités',         icon: 'fas fa-person-hiking' },
  { id: 'shopping',   label: 'Shopping',          icon: 'fas fa-shopping-bag' },
  { id: 'relaxation', label: 'Détente',            icon: 'fas fa-spa' },
];

const PACES = [
  { value: 'relaxed',  label: 'Relaxé' },
  { value: 'moderate', label: 'Équilibré' },
  { value: 'fast',     label: 'Intensif' },
];

const fmt = (v?: number | null, cur = '') =>
  v == null ? '—' : `${Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}${cur ? ' ' + cur : ''}`;

const now = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

// ─── Component ────────────────────────────────────────────────────────────────
export function PlanifierClient() {
  const { isAuthenticated, user } = useAuth();
  const searchParams = useSearchParams();

  // ── Form state ──────────────────────────────────────────────────────────
  const [origin,      setOrigin]      = useState('Casablanca');
  const [destination, setDest]        = useState('Paris');
  const [startDate,   setStartDate]   = useState('');
  const [endDate,     setEndDate]     = useState('');
  const [travelers,   setTravelers]   = useState(2);
  const [budget,      setBudget]      = useState('15000');
  const [currency,    setCurrency]    = useState('MAD');
  const [prefs,       setPrefs]       = useState<string[]>(['food', 'museums', 'local']);
  const [pace,        setPace]        = useState('relaxed');

  // ── UI state ────────────────────────────────────────────────────────────
  const [loading,    setLoading]    = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [savingTrip, setSavingTrip] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [view,       setView]       = useState<'form' | 'plan'>('form');
  const [planTab,    setPlanTab]    = useState<'itinerary' | 'transport'>('itinerary');
  const [freshTime,  setFreshTime]  = useState('');

  // ── Data ────────────────────────────────────────────────────────────────
  const [plan,       setPlan]       = useState<TripPlanDto | null>(null);
  const [allPlans,   setAllPlans]   = useState<TripPlanDto[]>([]);
  const [savedTrips, setSavedTrips] = useState<SavedTripItem[]>([]);

  // Default dates
  useEffect(() => {
    const s = new Date(); s.setDate(s.getDate() + 15);
    const e = new Date(s); e.setDate(s.getDate() + 5);
    setStartDate(s.toISOString().split('T')[0]);
    setEndDate(e.toISOString().split('T')[0]);
  }, []);

  useEffect(() => { if (user?.preferredCurrency) setCurrency(user.preferredCurrency); }, [user?.preferredCurrency]);

  const loadMeta = useCallback(async () => {
    if (!isAuthenticated) return;
    const [plans, trips] = await Promise.all([
      aiService.getUserTripPlans().catch(() => [] as TripPlanDto[]),
      libraryService.getSavedTrips().catch(() => [] as SavedTripItem[]),
    ]);
    setAllPlans(plans); setSavedTrips(trips);
  }, [isAuthenticated]);

  useEffect(() => { loadMeta(); }, [loadMeta]);

  useEffect(() => {
    const ref = searchParams.get('tripRef');
    if (ref && isAuthenticated) {
      aiService.getTripPlanByReference(ref)
        .then(p => { setPlan(p); setView('plan'); setFreshTime(now()); })
        .catch(console.error);
    }
  }, [searchParams, isAuthenticated]);

  const isSaved  = plan ? savedTrips.some(s => s.tripPlanReference === plan.reference) : false;
  const savedRef = plan ? savedTrips.find(s => s.tripPlanReference === plan.reference) : undefined;

  const togglePref = (id: string) =>
    setPrefs(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  // ── Generate ─────────────────────────────────────────────────────────────
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) { setError('Connectez-vous pour générer un plan.'); return; }
    const nb = parseFloat(budget);
    if (!origin.trim() || !destination.trim() || !startDate || !endDate) { setError('Remplissez tous les champs obligatoires.'); return; }
    if (isNaN(nb) || nb <= 0) { setError('Budget invalide.'); return; }
    setLoading(true); setError(null);
    try {
      const req: TripPlanRequest = { origin: origin.trim(), destination: destination.trim(), startDate, endDate, travelers, budget: nb, budgetCurrency: currency, preferences: prefs, pace };
      const result = await aiService.createTripPlan(req);
      setPlan(result);
      setAllPlans(prev => [result, ...prev.filter(p => p.reference !== result.reference)]);
      setFreshTime(now());
      setView('plan');
      libraryService.recordRecentSearch({ searchType: 'TRIP', origin: origin.trim(), destination: destination.trim(), departureDate: startDate, returnDate: endDate, travelersCount: travelers, criteriaPayload: { budget: nb, budgetCurrency: currency, preferences: prefs, pace } }).catch(() => {});
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Échec de la génération.');
    } finally { setLoading(false); }
  };

  const handleRefresh = async () => {
    if (!plan) return;
    setRefreshing(true); setError(null);
    try {
      const r = await aiService.refreshTripPlan(plan.reference);
      setPlan(r); setAllPlans(p => p.map(x => x.reference === r.reference ? r : x)); setFreshTime(now());
    } catch (err: unknown) { setError((err as { message?: string })?.message || 'Actualisation échouée.'); }
    finally { setRefreshing(false); }
  };

  const handleToggleSave = async () => {
    if (!plan || !isAuthenticated) return;
    setSavingTrip(true);
    try {
      if (isSaved && savedRef) { await libraryService.unsaveTrip(savedRef.publicReference); setSavedTrips(p => p.filter(s => s.publicReference !== savedRef.publicReference)); }
      else { const s = await libraryService.saveTrip({ tripPlanReference: plan.reference }); setSavedTrips(p => [s, ...p]); }
    } catch { /* noop */ } finally { setSavingTrip(false); }
  };

  const budgetColor = plan?.budgetStatus === 'WITHIN_BUDGET' ? '#10b981' : plan?.budgetStatus === 'OVER_BUDGET' ? '#ef4444' : '#f59e0b';

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <TravelPage page="planifier">

      {/* ══ HERO ═══════════════════════════════════════════════════════════ */}
      <TravelHero
        title="Planificateur de voyage"
        subtitle="Itinéraire complet avec vols réels, hôtels, activités et budget vérifié en temps réel."
        destination={plan ? plan.destination : undefined}
        defaultImageQuery="travel planning world map adventure"
        defaultImageIndex={2}
        icon="fas fa-route"
        compact={view === 'plan'}
      />

      {/* ══ SEARCH PANEL ═══════════════════════════════════════════════════ */}
      <section className="travel-search-panel planner-search-panel">
        <div className="max-w-6xl mx-auto">

          {/* Tab bar */}
          <div className="planner-trip-tabs">
            <button type="button" onClick={() => setView('form')}
              className={`planner-trip-tab ${view === 'form' ? 'is-active' : ''}`}>
              <i className="fas fa-sliders mr-1.5" /> Nouveau voyage
            </button>
            {plan && (
              <button type="button" onClick={() => setView('plan')}
                className={`planner-trip-tab ${view === 'plan' ? 'is-active' : ''}`}>
                <i className="fas fa-calendar-week mr-1.5" /> Itinéraire
                <span className="planner-trip-tab__destination">{plan.destination}</span>
              </button>
            )}
            {allPlans.filter(p => p.reference !== plan?.reference).slice(0, 2).map(p => (
              <button key={p.reference} type="button" onClick={() => { setPlan(p); setView('plan'); }}
                className="planner-trip-tab">
                <i className="fas fa-clock-rotate-left mr-1" /> {p.destination}
              </button>
            ))}
          </div>

          {/* ── FORM ─────────────────────────────────────────────────────── */}
          <form onSubmit={handleGenerate} className="planner-form">

              {/* Row 1 — 4 columns: Origin | Destination | Aller | Retour */}
              <div className="planner-form__primary">
                {[
                  { label: 'Départ',       icon: 'fas fa-plane-departure', value: origin,      set: setOrigin,    placeholder: 'Ex : Casablanca' },
                  { label: 'Destination',  icon: 'fas fa-plane-arrival',   value: destination, set: setDest,      placeholder: 'Ex : Paris' },
                ].map(f => (
                  <div key={f.label}>
                    <label className="block text-[10px] font-bold text-[#02E0D5] mb-1 uppercase tracking-wider">
                      <i className={`${f.icon} mr-1`} /> {f.label}
                    </label>
                    <input type="text" required value={f.value} placeholder={f.placeholder}
                      onChange={e => { f.set(e.target.value); setError(null); }}
                      className="w-full h-10 px-3 rounded-lg border border-[#01796F]/40 bg-[#021817] text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#02E0D5] transition-all" />
                  </div>
                ))}
                <div>
                  <label className="block text-[10px] font-bold text-[#02E0D5] mb-1 uppercase tracking-wider">
                    <i className="fas fa-calendar-alt mr-1" /> Aller
                  </label>
                  <input type="date" required value={startDate} onChange={e => { setStartDate(e.target.value); setError(null); }}
                    className="w-full h-10 px-3 rounded-lg border border-[#01796F]/40 bg-[#021817] text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#02E0D5] transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#02E0D5] mb-1 uppercase tracking-wider">
                    <i className="fas fa-calendar-check mr-1" /> Retour
                  </label>
                  <input type="date" required value={endDate} onChange={e => { setEndDate(e.target.value); setError(null); }}
                    className="w-full h-10 px-3 rounded-lg border border-[#01796F]/40 bg-[#021817] text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#02E0D5] transition-all" />
                </div>
              </div>

              {/* Row 2 — Budget | Voyageurs | Rythme | Générer */}
              <div className="planner-form__secondary">
                {/* Budget */}
                <div>
                  <label className="block text-[10px] font-bold text-[#02E0D5] mb-1 uppercase tracking-wider">
                    <i className="fas fa-wallet mr-1" /> Budget total
                  </label>
                  <div className="planner-budget">
                    <input type="number" required min="100" step="100" value={budget}
                      onChange={e => { setBudget(e.target.value); setError(null); }}
                      aria-label="Budget total" />
                    <select value={currency} onChange={e => setCurrency(e.target.value)} aria-label="Devise">
                      <option>MAD</option><option>EUR</option><option>USD</option>
                    </select>
                  </div>
                </div>

                {/* Voyageurs */}
                <div>
                  <label className="block text-[10px] font-bold text-[#02E0D5] mb-1 uppercase tracking-wider">
                    <i className="fas fa-users mr-1" /> Voyageurs
                  </label>
                  <div className="travel-stepper travel-stepper--field" role="group" aria-label="Nombre de voyageurs">
                    <button type="button" onClick={() => setTravelers(Math.max(1, travelers - 1))}
                      disabled={travelers <= 1} aria-label="Retirer un voyageur"
                      className="travel-stepper__button">−</button>
                    <span className="travel-stepper__value" aria-live="polite">{travelers}</span>
                    <button type="button" onClick={() => setTravelers(Math.min(9, travelers + 1))}
                      disabled={travelers >= 9} aria-label="Ajouter un voyageur"
                      className="travel-stepper__button">+</button>
                  </div>
                </div>

                {/* Rythme */}
                <div>
                  <label className="block text-[10px] font-bold text-[#02E0D5] mb-1 uppercase tracking-wider">
                    <i className="fas fa-gauge-simple mr-1" /> Rythme
                  </label>
                  <select value={pace} onChange={e => setPace(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-[#01796F]/40 bg-[#021817] text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#02E0D5]">
                    {PACES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>

                {/* Button */}
                <button type="submit" disabled={loading}
                  className="h-10 px-6 bg-[#01796F] hover:bg-[#015f57] text-white text-xs font-bold rounded-lg uppercase tracking-wider transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm whitespace-nowrap">
                  {loading ? <i className="fas fa-circle-notch fa-spin" /> : <i className="fas fa-wand-magic-sparkles" />}
                  <span>{loading ? 'Génération…' : 'Générer'}</span>
                </button>
              </div>

              {/* Row 3 — Preferences */}
              <div className="planner-interests">
                <p className="planner-interests__label">Centres d'intérêt</p>
                <div className="planner-interests__options">
                  {PREFS.map(p => {
                    const on = prefs.includes(p.id);
                    return (
                      <button key={p.id} type="button" onClick={() => togglePref(p.id)}
                        aria-pressed={on}
                        className={`planner-interest ${on ? 'is-selected' : ''}`}>
                        <i className={`${p.icon} text-[10px]`} /> {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-2.5 bg-red-950/60 border border-red-500/50 rounded-lg text-red-200 text-xs">
                  <i className="fas fa-exclamation-circle text-red-400 shrink-0" /> <span>{error}</span>
                </div>
              )}
              {!isAuthenticated && (
                <p className="planner-form__auth-note">
                  <Link href="/login">Connectez-vous</Link> pour générer et sauvegarder vos plans de voyage.
                </p>
              )}
            </form>
        </div>
      </section>

      {/* ══ RESULTS SECTION ════════════════════════════════════════════════ */}
      <section className="travel-results-section planner-results">
        <div className="max-w-6xl mx-auto">

          {/* ── No plan yet / loading ─────────────────────────────────────── */}
          {!plan && (
            <div className="planner-empty" aria-live="polite">
              <p>{loading ? 'Création de votre voyage' : 'Votre prochain voyage'}</p>
              <h2>{loading ? 'Nous préparons votre itinéraire…' : 'Votre itinéraire commence ici'}</h2>
              {!loading && (
                <span>Indiquez vos dates, votre budget et vos envies, puis lancez la recherche.</span>
              )}
            </div>
          )}

          {/* ── Plan ──────────────────────────────────────────────────────── */}
          {plan && view === 'plan' && (
            <div className="planner-results__flow">

              {/* ── Plan overview ───────────────────────────────────────── */}
              <div className="planner-overview">
                <div className="planner-overview__head">
                  <div className="planner-overview__intro">
                    <p className="planner-overview__eyebrow">Votre itinéraire</p>
                    <h2>{plan.title}</h2>
                    <div className="planner-overview__meta">
                      <span><i className="fas fa-location-dot" aria-hidden="true" /> {plan.origin} → {plan.destination}</span>
                      <span><i className="fas fa-calendar-days" aria-hidden="true" /> {plan.startDate} — {plan.endDate}</span>
                      <span><i className="fas fa-user-group" aria-hidden="true" /> {plan.travelers} voyageur(s)</span>
                    </div>
                    {plan.summary && <p className="planner-overview__summary">{plan.summary}</p>}
                  </div>

                  <div className="planner-overview__actions">
                    {isAuthenticated && (
                      <button type="button" disabled={savingTrip} onClick={handleToggleSave}
                        className={isSaved ? 'is-saved' : ''}>
                        <i className={isSaved ? 'fas fa-bookmark' : 'far fa-bookmark'} aria-hidden="true" />
                        {isSaved ? 'Enregistré' : 'Enregistrer'}
                      </button>
                    )}
                    <button type="button" disabled={refreshing} onClick={handleRefresh}>
                      <i className={`fas fa-arrows-rotate${refreshing ? ' fa-spin' : ''}`} aria-hidden="true" />
                      {refreshing ? 'Actualisation…' : 'Actualiser tarifs'}
                    </button>
                    <button type="button" onClick={() => setView('form')}>
                      <i className="fas fa-pen-to-square" aria-hidden="true" /> Modifier
                    </button>
                  </div>
                </div>

                <div className="planner-overview__status">
                  <span className="planner-overview__budget-status" style={{ color: budgetColor }}>
                    <i className={plan.budgetStatus === 'WITHIN_BUDGET' ? 'fas fa-check-circle' : plan.budgetStatus === 'OVER_BUDGET' ? 'fas fa-exclamation-triangle' : 'fas fa-circle-info'} aria-hidden="true" />
                    {plan.budgetStatus === 'WITHIN_BUDGET' ? 'Dans le budget' : plan.budgetStatus === 'OVER_BUDGET' ? 'Dépassement du budget' : 'Chiffrage partiel'}
                  </span>
                  <span>Réf. {plan.reference}</span>
                  {freshTime && <span>Actualisé à {freshTime}</span>}
                  {plan.weatherSummary && <span><i className="fas fa-cloud-sun" aria-hidden="true" /> {plan.weatherSummary}</span>}
                </div>

                <div className="planner-overview__metrics">
                  {[
                    { label: 'Budget prévu', val: fmt(plan.budget, plan.budgetCurrency) },
                    { label: 'Voyage estimé', val: fmt(plan.pricedTotal, plan.budgetCurrency) },
                    { label: 'Reste disponible', val: fmt(plan.remainingBudget, plan.budgetCurrency) },
                    { label: 'À chiffrer', val: `${plan.unpricedItemsCount} élément(s)` },
                  ].map(m => (
                    <div key={m.label}>
                      <span>{m.label}</span>
                      <strong>{m.val}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Sub-tabs ────────────────────────────────────────────── */}
              <div className="planner-result-tabs" role="group" aria-label="Détails du voyage">
                {[
                  { id: 'itinerary' as const, label: 'Programme jour par jour', count: plan.days?.length ?? 0 },
                  { id: 'transport' as const, label: 'Transport & séjour', count: null },
                ].map(t => (
                  <button key={t.id} type="button" aria-pressed={planTab === t.id} onClick={() => setPlanTab(t.id)}
                    className={planTab === t.id ? 'is-active' : ''}>
                    {t.label}
                    {t.count != null && <span>{t.count}</span>}
                  </button>
                ))}
              </div>

              {/* ── Itinerary tab ───────────────────────────────────────── */}
              {planTab === 'itinerary' && plan.days && (
                <div className="planner-days">
                  {plan.days.map(day => (
                    <article key={day.dayNumber} className="planner-day">
                      <div className="planner-day__heading">
                        <span className="planner-day__number">Jour {day.dayNumber}</span>
                        <h3>{day.theme || `Découvrir ${plan.destination}`}</h3>
                        <p>{day.date}</p>
                        {day.weatherForecast && <small><i className="fas fa-cloud-sun" aria-hidden="true" /> {day.weatherForecast}</small>}
                      </div>

                      <div className="planner-day__slots">
                        {[
                          { slot: 'Matin', items: day.morning },
                          { slot: 'Après-midi', items: day.afternoon },
                          { slot: 'Soirée', items: day.evening },
                        ].map(s => (
                          <div key={s.slot} className="planner-day__slot">
                            <span className="planner-day__period">{s.slot}</span>
                            <div className="planner-day__items">
                              {s.items && s.items.length > 0 ? s.items.map((item: TripPlanItemDto, i: number) => (
                                <div key={i} className="planner-day__item">
                                  <span>{item.title}</span>
                                  {(item.priceInBudgetCurrency || item.price) && (
                                    <strong>
                                      {fmt(item.priceInBudgetCurrency ?? item.price, item.priceInBudgetCurrency ? plan.budgetCurrency : (item.currency ?? ''))}
                                    </strong>
                                  )}
                                </div>
                              )) : <span className="planner-day__free">Temps libre</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {/* ── Transport tab ───────────────────────────────────────── */}
              {planTab === 'transport' && (
                <div className="planner-transport">
                  {[
                    { label: 'Vol aller',         icon: 'fas fa-plane',  item: plan.flight },
                    { label: 'Vol retour',         icon: 'fas fa-plane',  item: plan.returnFlight },
                    { label: 'Hébergement',        icon: 'fas fa-hotel',  item: plan.hotel },
                    { label: 'Transfert aéroport', icon: 'fas fa-taxi',   item: plan.transfer },
                  ].filter(r => r.item).map(row => (
                    <div key={row.label} className="planner-transport-row">
                      <i className={row.icon} aria-hidden="true" />
                      <div className="planner-transport-row__info">
                        <span>{row.label}</span>
                        <strong>{row.item?.title}</strong>
                        {row.item?.provider && <small>via {row.item.provider}</small>}
                      </div>
                      <strong className="planner-transport-row__price">
                        {fmt(row.item?.priceInBudgetCurrency ?? row.item?.price, row.item?.priceInBudgetCurrency ? plan.budgetCurrency : (row.item?.currency ?? ''))}
                      </strong>
                    </div>
                  ))}
                  {[plan.flight, plan.returnFlight, plan.hotel, plan.transfer].every(x => !x) && (
                    <p className="text-center text-sm text-slate-400 py-10">Aucun élément de transport disponible dans ce plan.</p>
                  )}
                </div>
              )}

              {/* ── Sources ─────────────────────────────────────────────── */}
              {plan.sources && plan.sources.length > 0 && (
                <div className="planner-sources">
                  <p>Guides Yuding consultés</p>
                  <div>
                    {plan.sources.map((s, i) => (
                      <span key={i}>
                        {s.title}{s.section ? ` — ${s.section}` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 pb-4 leading-relaxed">
                Ce plan est un outil d'aide à la planification. Tarifs issus de fournisseurs réels — indicatifs jusqu'à validation sur les pages de réservation Yuding.
              </p>
            </div>
          )}
        </div>
      </section>
    </TravelPage>
  );
}
