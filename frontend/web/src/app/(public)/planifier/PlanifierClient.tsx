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

      {/* ══ DARK SEARCH PANEL ══════════════════════════════════════════════ */}
      <section className="travel-search-panel bg-[#001b1a] text-white py-6 px-4 border-b border-[#01796F]/20">
        <div className="max-w-6xl mx-auto">

          {/* Tab bar */}
          <div className="flex items-center gap-1 mb-5 border-b border-[#01796F]/25">
            <button type="button" onClick={() => setView('form')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 pb-2 transition-colors ${view === 'form' ? 'border-[#02E0D5] text-[#02E0D5]' : 'border-transparent text-[#b2dfdb] hover:text-white'}`}>
              <i className="fas fa-sliders mr-1.5" /> Nouveau voyage
            </button>
            {plan && (
              <button type="button" onClick={() => setView('plan')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 pb-2 transition-colors ${view === 'plan' ? 'border-[#02E0D5] text-[#02E0D5]' : 'border-transparent text-[#b2dfdb] hover:text-white'}`}>
                <i className="fas fa-calendar-week mr-1.5" /> Itinéraire
                <span className="ml-1.5 px-1.5 py-0.5 rounded bg-[#01796F] text-white text-[10px]">{plan.destination}</span>
              </button>
            )}
            {allPlans.filter(p => p.reference !== plan?.reference).slice(0, 2).map(p => (
              <button key={p.reference} type="button" onClick={() => { setPlan(p); setView('plan'); }}
                className="px-3 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 border-transparent text-[#b2dfdb] hover:text-white pb-2 transition-colors">
                <i className="fas fa-clock-rotate-left mr-1" /> {p.destination}
              </button>
            ))}
          </div>

          {/* ── FORM ─────────────────────────────────────────────────────── */}
          {view === 'form' && (
            <form onSubmit={handleGenerate} className="bg-[#062523] p-4 md:p-5 rounded-xl border border-[#01796F]/30 shadow-lg space-y-4">

              {/* Row 1 — 4 columns: Origin | Destination | Aller | Retour */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.6fr_0.8fr_0.8fr_auto] gap-3 items-end">
                {/* Budget */}
                <div>
                  <label className="block text-[10px] font-bold text-[#02E0D5] mb-1 uppercase tracking-wider">
                    <i className="fas fa-wallet mr-1" /> Budget total
                  </label>
                  <div className="flex">
                    <input type="number" required min="100" step="100" value={budget}
                      onChange={e => { setBudget(e.target.value); setError(null); }}
                      className="flex-1 h-10 px-3 rounded-l-lg border border-r-0 border-[#01796F]/40 bg-[#021817] text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#02E0D5] transition-all" />
                    <select value={currency} onChange={e => setCurrency(e.target.value)}
                      className="h-10 px-2 rounded-r-lg border border-[#01796F]/40 bg-[#031c1a] text-[#02E0D5] text-xs font-bold focus:outline-none">
                      <option>MAD</option><option>EUR</option><option>USD</option>
                    </select>
                  </div>
                </div>

                {/* Voyageurs */}
                <div>
                  <label className="block text-[10px] font-bold text-[#02E0D5] mb-1 uppercase tracking-wider">
                    <i className="fas fa-users mr-1" /> Voyageurs
                  </label>
                  <div className="flex h-10 rounded-lg border border-[#01796F]/40 overflow-hidden">
                    <button type="button" onClick={() => setTravelers(Math.max(1, travelers - 1))}
                      className="w-9 flex items-center justify-center bg-[#021817] text-[#02E0D5] font-bold text-base hover:bg-[#0a302d] transition-colors">−</button>
                    <span className="flex-1 flex items-center justify-center bg-[#021817] text-white text-xs font-semibold border-x border-[#01796F]/40">{travelers}</span>
                    <button type="button" onClick={() => setTravelers(Math.min(9, travelers + 1))}
                      className="w-9 flex items-center justify-center bg-[#021817] text-[#02E0D5] font-bold text-base hover:bg-[#0a302d] transition-colors">+</button>
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
              <div className="border-t border-[#01796F]/20 pt-3">
                <p className="text-[10px] font-bold text-[#b2dfdb] uppercase tracking-wider mb-2">Centres d'intérêt</p>
                <div className="flex flex-wrap gap-2">
                  {PREFS.map(p => {
                    const on = prefs.includes(p.id);
                    return (
                      <button key={p.id} type="button" onClick={() => togglePref(p.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${on ? 'bg-[#01796F] border-[#01796F] text-white' : 'bg-[#031c1a] border-[#01796F]/40 text-[#b2dfdb] hover:border-[#02E0D5]/60 hover:text-white'}`}>
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
                <p className="text-xs text-[#b2dfdb]">
                  <Link href="/login" className="text-[#02E0D5] font-bold underline">Connectez-vous</Link> pour générer et sauvegarder vos plans de voyage.
                </p>
              )}
            </form>
          )}
        </div>
      </section>

      {/* ══ RESULTS SECTION ════════════════════════════════════════════════ */}
      <section className="travel-results-section py-8 px-4 bg-slate-50 dark:bg-[#021817]">
        <div className="max-w-6xl mx-auto">

          {/* ── No plan yet / loading ─────────────────────────────────────── */}
          {!plan && (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#01796F]/10 text-[#01796F] dark:bg-[#01796F]/20 dark:text-[#02E0D5] flex items-center justify-center text-2xl">
                <i className={loading ? 'fas fa-circle-notch fa-spin' : 'fas fa-route'} />
              </div>
              <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200">
                {loading ? 'Orchestration des fournisseurs…' : 'Votre itinéraire apparaîtra ici'}
              </h2>
              {!loading && (
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                  Remplissez le formulaire et cliquez sur <strong>Générer</strong>.
                  Yuding orchestre vols, hôtels, activités et transferts — tarifs réels en quelques secondes.
                </p>
              )}
            </div>
          )}

          {/* ── Plan ──────────────────────────────────────────────────────── */}
          {plan && view === 'plan' && (
            <div className="flex flex-col gap-5">

              {/* ── Plan header card ────────────────────────────────────── */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 dark:border-[#01796F]/30 dark:bg-[#062523]">

                {/* Top row: title + actions */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    {/* Status + ref + freshness */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span style={{ background: `${budgetColor}18`, color: budgetColor, border: `1px solid ${budgetColor}40` }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold">
                        <i className={plan.budgetStatus === 'WITHIN_BUDGET' ? 'fas fa-check-circle' : plan.budgetStatus === 'OVER_BUDGET' ? 'fas fa-exclamation-triangle' : 'fas fa-circle-info'} style={{ fontSize: '10px' }} />
                        {plan.budgetStatus === 'WITHIN_BUDGET' ? 'Dans le budget' : plan.budgetStatus === 'OVER_BUDGET' ? 'Dépassement' : 'Chiffrage partiel'}
                      </span>
                      <code className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#0a302d] text-slate-500 dark:text-slate-400 text-[10px] border border-slate-200 dark:border-[#01796F]/30">
                        {plan.reference}
                      </code>
                      {freshTime && (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <i className="fas fa-clock" style={{ fontSize: '10px' }} /> {freshTime}
                        </span>
                      )}
                    </div>

                    <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug mb-1">{plan.title}</h2>
                    <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span><i className="fas fa-calendar-days mr-1" />{plan.startDate} — {plan.endDate}</span>
                      <span><i className="fas fa-user-group mr-1" />{plan.travelers} voyageur(s)</span>
                      <span><i className="fas fa-location-dot mr-1" />{plan.origin} → {plan.destination}</span>
                    </div>
                    {plan.summary && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">{plan.summary}</p>}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {isAuthenticated && (
                      <button type="button" disabled={savingTrip} onClick={handleToggleSave}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${isSaved ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-[#0a302d] dark:border-[#01796F]/50 dark:text-[#02E0D5]' : 'border-slate-200 dark:border-[#01796F]/30 text-slate-600 dark:text-slate-300 hover:border-[#01796F]/50 hover:text-[#01796F]'}`}>
                        <i className={isSaved ? 'fas fa-bookmark' : 'far fa-bookmark'} style={{ fontSize: '11px' }} />
                        {isSaved ? 'Enregistré' : 'Enregistrer'}
                      </button>
                    )}
                    <button type="button" disabled={refreshing} onClick={handleRefresh}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-[#01796F]/30 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:border-[#01796F]/50 hover:text-[#01796F] transition-colors disabled:opacity-60">
                      <i className={`fas fa-arrows-rotate${refreshing ? ' fa-spin' : ''}`} style={{ fontSize: '11px' }} />
                      {refreshing ? 'Actualisation…' : 'Actualiser tarifs'}
                    </button>
                    <button type="button" onClick={() => setView('form')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-[#01796F]/30 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:border-[#01796F]/50 hover:text-[#01796F] transition-colors">
                      <i className="fas fa-pen-to-square" style={{ fontSize: '11px' }} /> Modifier
                    </button>
                  </div>
                </div>

                {/* Budget metrics row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-4 border-t border-slate-100 dark:border-[#01796F]/20">
                  {[
                    { icon: 'fas fa-wallet',         label: 'Budget alloué',         val: fmt(plan.budget, plan.budgetCurrency) },
                    { icon: 'fas fa-receipt',         label: 'Total chiffré',          val: fmt(plan.pricedTotal, plan.budgetCurrency) },
                    { icon: 'fas fa-scale-balanced',  label: 'Solde restant',          val: fmt(plan.remainingBudget, plan.budgetCurrency) },
                    { icon: 'fas fa-circle-question', label: 'Non chiffrés',           val: `${plan.unpricedItemsCount} élément(s)` },
                  ].map(m => (
                    <div key={m.label}>
                      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
                        <i className={`${m.icon} text-[#01796F] dark:text-[#02E0D5]`} /> {m.label}
                      </p>
                      <p className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">{m.val}</p>
                    </div>
                  ))}
                </div>

                {/* Weather */}
                {plan.weatherSummary && (
                  <div className="mt-4 flex items-center gap-2 p-2.5 rounded-lg bg-sky-50 border border-sky-100 dark:bg-[#0a1e2e] dark:border-sky-900/40">
                    <i className="fas fa-cloud-sun text-sky-500 shrink-0" />
                    <span className="text-xs text-sky-700 dark:text-sky-300 font-medium">{plan.weatherSummary}</span>
                  </div>
                )}
              </div>

              {/* ── Sub-tabs ────────────────────────────────────────────── */}
              <div className="flex gap-1 border-b border-slate-200 dark:border-[#01796F]/25">
                {[
                  { id: 'itinerary' as const,  label: 'Jour par jour',      icon: 'fas fa-calendar-week',  count: plan.days?.length ?? 0 },
                  { id: 'transport' as const,  label: 'Vols & Hébergement', icon: 'fas fa-plane-up',       count: null },
                ].map(t => (
                  <button key={t.id} type="button" onClick={() => setPlanTab(t.id)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 -mb-px transition-colors ${planTab === t.id ? 'border-[#01796F] text-[#01796F] dark:border-[#02E0D5] dark:text-[#02E0D5]' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                    <i className={`${t.icon} text-[11px]`} /> {t.label}
                    {t.count != null && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#0a302d] text-slate-500 dark:text-slate-400 text-[9px]">{t.count}</span>}
                  </button>
                ))}
              </div>

              {/* ── Itinerary tab ───────────────────────────────────────── */}
              {planTab === 'itinerary' && plan.days && (
                <div className="flex flex-col gap-4">
                  {plan.days.map(day => (
                    <div key={day.dayNumber} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-[#01796F]/30 dark:bg-[#062523]">
                      {/* Day header */}
                      <div className="flex items-center justify-between gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100 dark:bg-[#0a302d] dark:border-[#01796F]/20 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#01796F] text-white flex items-center justify-center font-extrabold text-sm shrink-0">J{day.dayNumber}</div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{day.theme || `Jour ${day.dayNumber}`}</p>
                            <p className="text-xs text-slate-400">{day.date}</p>
                          </div>
                        </div>
                        {day.weatherForecast && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] bg-sky-50 border border-sky-100 text-sky-700 dark:bg-[#0a1e2e] dark:border-sky-900/40 dark:text-sky-300">
                            <i className="fas fa-cloud-sun text-[10px]" /> {day.weatherForecast}
                          </span>
                        )}
                      </div>

                      {/* Slots grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-[#01796F]/20">
                        {[
                          { slot: 'Matin',      icon: 'fas fa-sun',       cls: 'text-amber-500',  items: day.morning   },
                          { slot: 'Après-midi', icon: 'fas fa-cloud-sun', cls: 'text-[#01796F]',  items: day.afternoon },
                          { slot: 'Soirée',     icon: 'fas fa-moon',      cls: 'text-indigo-500', items: day.evening   },
                        ].map(s => (
                          <div key={s.slot} className="p-4">
                            <p className={`text-[10px] font-bold uppercase tracking-wider mb-2.5 flex items-center gap-1 ${s.cls}`}>
                              <i className={`${s.icon} text-[10px]`} /> {s.slot}
                            </p>
                            {s.items && s.items.length > 0 ? s.items.map((item: TripPlanItemDto, i: number) => (
                              <div key={i} className="mb-2.5 last:mb-0">
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">{item.title}</p>
                                {(item.priceInBudgetCurrency || item.price) && (
                                  <p className="text-xs font-bold text-[#01796F] dark:text-[#02E0D5] mt-0.5">
                                    {fmt(item.priceInBudgetCurrency ?? item.price, item.priceInBudgetCurrency ? plan.budgetCurrency : (item.currency ?? ''))}
                                  </p>
                                )}
                              </div>
                            )) : <p className="text-xs text-slate-400 italic">Temps libre</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Transport tab ───────────────────────────────────────── */}
              {planTab === 'transport' && (
                <div className="flex flex-col gap-4">
                  {[
                    { label: 'Vol aller',         icon: 'fas fa-plane',  item: plan.flight },
                    { label: 'Vol retour',         icon: 'fas fa-plane',  item: plan.returnFlight },
                    { label: 'Hébergement',        icon: 'fas fa-hotel',  item: plan.hotel },
                    { label: 'Transfert aéroport', icon: 'fas fa-taxi',   item: plan.transfer },
                  ].filter(r => r.item).map(row => (
                    <div key={row.label} className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(180px,.8fr)] items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-[#01796F]/40 hover:shadow-md transition-all dark:border-[#01796F]/30 dark:bg-[#062523]">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-[#01796F]/10 dark:bg-[#01796F]/20 text-[#01796F] dark:text-[#02E0D5] flex items-center justify-center text-lg shrink-0">
                          <i className={row.icon} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{row.label}</p>
                          <p className="text-base font-bold text-slate-900 dark:text-white leading-snug">{row.item?.title}</p>
                          {row.item?.provider && <p className="text-[10px] text-[#01796F] dark:text-[#02E0D5] font-mono">via {row.item.provider}</p>}
                        </div>
                      </div>
                      <div className="hidden lg:block text-xs text-slate-400 font-mono truncate">
                        {row.item?.offerReference?.substring(0, 60) ?? '—'}
                      </div>
                      <div className="lg:text-right">
                        <p className="text-2xl font-extrabold text-[#01796F] dark:text-[#02E0D5]">
                          {fmt(row.item?.priceInBudgetCurrency ?? row.item?.price, row.item?.priceInBudgetCurrency ? plan.budgetCurrency : (row.item?.currency ?? ''))}
                        </p>
                      </div>
                    </div>
                  ))}
                  {[plan.flight, plan.returnFlight, plan.hotel, plan.transfer].every(x => !x) && (
                    <p className="text-center text-sm text-slate-400 py-10">Aucun élément de transport disponible dans ce plan.</p>
                  )}
                </div>
              )}

              {/* ── Sources ─────────────────────────────────────────────── */}
              {plan.sources && plan.sources.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#01796F]/30 dark:bg-[#062523]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#01796F] dark:text-[#02E0D5] mb-3 flex items-center gap-2">
                    <i className="fas fa-book-open" /> Guides Yuding consultés
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {plan.sources.map((s, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#0a302d] border border-slate-200 dark:border-[#01796F]/25 text-xs text-slate-600 dark:text-slate-400">
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
