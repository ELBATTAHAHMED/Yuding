'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import { aiService } from '@/services/ai.service';
import { libraryService } from '@/services/library.service';
import { TravelPage } from '@/components/travel/TravelPage';
import type { TripPlanDto, TripPlanItemDto, TripPlanRequest } from '@/types/ai.types';
import type { SavedTripItem } from '@/types/library.types';

// ─── Preference chips ─────────────────────────────────────────────────────────
const PREFERENCE_OPTIONS = [
  { id: 'food',       label: 'Gastronomie',      icon: 'fas fa-utensils' },
  { id: 'museums',    label: 'Musées & Culture',  icon: 'fas fa-landmark' },
  { id: 'nature',     label: 'Nature & Parcs',    icon: 'fas fa-tree' },
  { id: 'local',      label: 'Activités',          icon: 'fas fa-person-hiking' },
  { id: 'shopping',   label: 'Shopping',           icon: 'fas fa-shopping-bag' },
  { id: 'relaxation', label: 'Détente',             icon: 'fas fa-spa' },
];

const PACE_OPTIONS = [
  { value: 'relaxed',  label: 'Relaxé',    icon: 'fas fa-feather-pointed' },
  { value: 'moderate', label: 'Équilibré', icon: 'fas fa-gauge-simple' },
  { value: 'fast',     label: 'Intensif',  icon: 'fas fa-gauge-high' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (amount?: number | null, currency = 'MAD') => {
  if (amount == null) return '—';
  return `${Number(amount).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${currency}`;
};

// ─── Main component ───────────────────────────────────────────────────────────
export function PlanifierClient() {
  const { isAuthenticated, user } = useAuth();
  const searchParams = useSearchParams();

  // Form fields
  const [origin,      setOrigin]      = useState('Casablanca');
  const [destination, setDestination] = useState('Paris');
  const [startDate,   setStartDate]   = useState('');
  const [endDate,     setEndDate]     = useState('');
  const [travelers,   setTravelers]   = useState(2);
  const [budget,      setBudget]      = useState('15000');
  const [currency,    setCurrency]    = useState('MAD');
  const [prefs,       setPrefs]       = useState<string[]>(['food', 'museums', 'local']);
  const [pace,        setPace]        = useState('relaxed');

  // UI State
  const [loading,    setLoading]    = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [savingTrip, setSavingTrip] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // Data
  const [plan,       setPlan]       = useState<TripPlanDto | null>(null);
  const [allPlans,   setAllPlans]   = useState<TripPlanDto[]>([]);
  const [savedTrips, setSavedTrips] = useState<SavedTripItem[]>([]);

  // View control
  const [view,       setView]       = useState<'form' | 'plan'>('form');
  const [planTab,    setPlanTab]    = useState<'itinerary' | 'transport'>('itinerary');
  const [freshTime,  setFreshTime]  = useState('');

  // Default dates — start 15 days from today, 5-night trip
  useEffect(() => {
    const s = new Date(); s.setDate(s.getDate() + 15);
    const e = new Date(s); e.setDate(s.getDate() + 5);
    setStartDate(s.toISOString().split('T')[0]);
    setEndDate(e.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (user?.preferredCurrency) setCurrency(user.preferredCurrency);
  }, [user?.preferredCurrency]);

  // Load existing plans + saved trips from library
  const loadMeta = useCallback(async () => {
    if (!isAuthenticated) return;
    const [plans, trips] = await Promise.all([
      aiService.getUserTripPlans().catch(() => [] as TripPlanDto[]),
      libraryService.getSavedTrips().catch(() => [] as SavedTripItem[]),
    ]);
    setAllPlans(plans);
    setSavedTrips(trips);
  }, [isAuthenticated]);

  useEffect(() => { loadMeta(); }, [loadMeta]);

  // Auto-load plan from URL ?tripRef=
  useEffect(() => {
    const ref = searchParams.get('tripRef');
    if (ref && isAuthenticated) {
      aiService.getTripPlanByReference(ref)
        .then(p => { setPlan(p); setView('plan'); setFreshTime(now()); })
        .catch(console.error);
    }
  }, [searchParams, isAuthenticated]);

  const now = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const isSaved  = plan ? savedTrips.some(s => s.tripPlanReference === plan.reference) : false;
  const savedRef = plan ? savedTrips.find(s => s.tripPlanReference === plan.reference) : undefined;

  const togglePref = (id: string) =>
    setPrefs(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);

  // ── Generate plan ─────────────────────────────────────────────────────────
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) { setError('Connectez-vous pour générer un plan de voyage.'); return; }
    const numBudget = parseFloat(budget);
    if (!origin.trim() || !destination.trim() || !startDate || !endDate) {
      setError('Renseignez tous les champs obligatoires.'); return;
    }
    if (isNaN(numBudget) || numBudget <= 0) { setError('Budget invalide.'); return; }
    setLoading(true); setError(null);
    const req: TripPlanRequest = {
      origin: origin.trim(), destination: destination.trim(), startDate, endDate,
      travelers: Number(travelers), budget: numBudget, budgetCurrency: currency,
      preferences: prefs, pace,
    };
    try {
      const result = await aiService.createTripPlan(req);
      setPlan(result);
      setAllPlans(prev => [result, ...prev.filter(p => p.reference !== result.reference)]);
      setFreshTime(now());
      setView('plan');
      libraryService.recordRecentSearch({
        searchType: 'TRIP', origin: origin.trim(), destination: destination.trim(),
        departureDate: startDate, returnDate: endDate, travelersCount: Number(travelers),
        criteriaPayload: { budget: numBudget, budgetCurrency: currency, preferences: prefs, pace },
      }).catch(() => {});
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Échec de la génération du plan.');
    } finally { setLoading(false); }
  };

  // ── Refresh plan prices ───────────────────────────────────────────────────
  const handleRefresh = async () => {
    if (!plan) return;
    setRefreshing(true); setError(null);
    try {
      const result = await aiService.refreshTripPlan(plan.reference);
      setPlan(result);
      setAllPlans(prev => prev.map(p => p.reference === result.reference ? result : p));
      setFreshTime(now());
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Échec de l\'actualisation.');
    } finally { setRefreshing(false); }
  };

  // ── Save/unsave trip ──────────────────────────────────────────────────────
  const handleToggleSave = async () => {
    if (!plan || !isAuthenticated) return;
    setSavingTrip(true);
    try {
      if (isSaved && savedRef) {
        await libraryService.unsaveTrip(savedRef.publicReference);
        setSavedTrips(prev => prev.filter(s => s.publicReference !== savedRef.publicReference));
      } else {
        const saved = await libraryService.saveTrip({ tripPlanReference: plan.reference });
        setSavedTrips(prev => [saved, ...prev]);
      }
    } catch { /* noop */ } finally { setSavingTrip(false); }
  };

  // ── Budget status helper ──────────────────────────────────────────────────
  const budgetBadge = () => {
    if (!plan) return null;
    if (plan.budgetStatus === 'WITHIN_BUDGET') return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <i className="fas fa-check-circle text-[10px]" /> Dans le budget
      </span>
    );
    if (plan.budgetStatus === 'OVER_BUDGET') return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
        <i className="fas fa-exclamation-triangle text-[10px]" /> Dépassement de budget
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
        <i className="fas fa-circle-info text-[10px]" /> Chiffrage partiel
      </span>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <TravelPage page="planifier">

      {/* ═══════════════ DARK TOP SEARCH PANEL (same as flights/activities) ═══════════════ */}
      <section className="travel-search-panel bg-[#001b1a] text-white py-6 px-4 border-b border-[#01796F]/20">
        <div className="max-w-6xl mx-auto">

          {/* Heading row */}
          <div className="travel-search-panel__heading mb-4">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white mb-0.5">
              <i className="fas fa-route mr-2 text-[#02E0D5]" />
              Planificateur de voyage
            </h1>
            <p className="text-xs md:text-sm text-[#b2dfdb]">
              Générez un itinéraire complet avec vols, hôtels, activités et budget — tout vérifiés en temps réel
            </p>
          </div>

          {/* Tab switcher — Form | Plan history */}
          <div className="flex gap-2 mb-4 border-b border-[#01796F]/25 pb-0">
            <button
              type="button"
              onClick={() => setView('form')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors pb-2 ${view === 'form' ? 'border-[#02E0D5] text-[#02E0D5]' : 'border-transparent text-[#b2dfdb] hover:text-white'}`}
            >
              <i className="fas fa-sliders mr-1.5" /> Nouveau voyage
            </button>
            {plan && (
              <button
                type="button"
                onClick={() => setView('plan')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors pb-2 ${view === 'plan' ? 'border-[#02E0D5] text-[#02E0D5]' : 'border-transparent text-[#b2dfdb] hover:text-white'}`}
              >
                <i className="fas fa-calendar-week mr-1.5" /> Mon itinéraire
                <span className="ml-1.5 px-1.5 py-0.5 rounded bg-[#01796F] text-white text-[10px]">{plan.destination}</span>
              </button>
            )}
            {allPlans.length > 1 && allPlans.filter(p => p.reference !== plan?.reference).slice(0, 2).map(p => (
              <button
                key={p.reference}
                type="button"
                onClick={() => { setPlan(p); setView('plan'); }}
                className="px-3 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 border-transparent text-[#b2dfdb] hover:text-white transition-colors pb-2"
              >
                <i className="fas fa-clock-rotate-left mr-1" /> {p.destination}
              </button>
            ))}
          </div>

          {/* ── FORM ─────────────────────────────────────────────────────── */}
          {view === 'form' && (
            <form onSubmit={handleGenerate} className="bg-[#062523] p-3.5 md:p-5 rounded-xl shadow-lg border border-[#01796F]/30 text-white space-y-4">

              {/* Row 1: Route + Dates */}
              <div className="grid grid-cols-1 items-start gap-2.5 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr]">
                {/* Origin */}
                <div className="min-w-0">
                  <label className="block text-xs font-bold text-[#02E0D5] mb-1 uppercase tracking-wider">
                    <i className="fas fa-plane-departure mr-1.5" /> Départ *
                  </label>
                  <input
                    type="text" required
                    value={origin}
                    onChange={e => { setOrigin(e.target.value); setError(null); }}
                    placeholder="Ex : Casablanca"
                    className="w-full h-10 px-3 rounded-lg border border-[#01796F]/40 bg-[#021817] text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#02E0D5] transition-all placeholder:text-slate-500"
                  />
                </div>

                {/* Destination */}
                <div className="min-w-0">
                  <label className="block text-xs font-bold text-[#02E0D5] mb-1 uppercase tracking-wider">
                    <i className="fas fa-plane-arrival mr-1.5" /> Destination *
                  </label>
                  <input
                    type="text" required
                    value={destination}
                    onChange={e => { setDestination(e.target.value); setError(null); }}
                    placeholder="Ex : Paris"
                    className="w-full h-10 px-3 rounded-lg border border-[#01796F]/40 bg-[#021817] text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#02E0D5] transition-all placeholder:text-slate-500"
                  />
                </div>

                {/* Start date */}
                <div className="min-w-0">
                  <label className="block text-xs font-bold text-[#02E0D5] mb-1 uppercase tracking-wider">
                    <i className="fas fa-calendar-alt mr-1.5" /> Aller *
                  </label>
                  <input
                    type="date" required
                    value={startDate}
                    onChange={e => { setStartDate(e.target.value); setError(null); }}
                    className="w-full h-10 px-3 rounded-lg border border-[#01796F]/40 bg-[#021817] text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#02E0D5] transition-all"
                  />
                </div>

                {/* End date */}
                <div className="min-w-0">
                  <label className="block text-xs font-bold text-[#02E0D5] mb-1 uppercase tracking-wider">
                    <i className="fas fa-calendar-check mr-1.5" /> Retour *
                  </label>
                  <input
                    type="date" required
                    value={endDate}
                    onChange={e => { setEndDate(e.target.value); setError(null); }}
                    className="w-full h-10 px-3 rounded-lg border border-[#01796F]/40 bg-[#021817] text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#02E0D5] transition-all"
                  />
                </div>
              </div>

              {/* Row 2: Budget + Travelers */}
              <div className="grid grid-cols-1 items-start gap-2.5 md:grid-cols-2 lg:grid-cols-[1.6fr_0.8fr_0.8fr_auto]">
                {/* Budget */}
                <div className="min-w-0">
                  <label className="block text-xs font-bold text-[#02E0D5] mb-1 uppercase tracking-wider">
                    <i className="fas fa-wallet mr-1.5" /> Budget total *
                  </label>
                  <div className="flex">
                    <input
                      type="number" required min="100" step="100"
                      value={budget}
                      onChange={e => { setBudget(e.target.value); setError(null); }}
                      className="flex-1 h-10 px-3 rounded-l-lg border border-r-0 border-[#01796F]/40 bg-[#021817] text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#02E0D5] transition-all"
                    />
                    <select
                      value={currency}
                      onChange={e => setCurrency(e.target.value)}
                      className="h-10 px-2 rounded-r-lg border border-[#01796F]/40 bg-[#031c1a] text-[#02E0D5] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#02E0D5]"
                    >
                      <option value="MAD">MAD</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>

                {/* Travelers */}
                <div className="min-w-0">
                  <label className="block text-xs font-bold text-[#02E0D5] mb-1 uppercase tracking-wider">
                    <i className="fas fa-users mr-1.5" /> Voyageurs
                  </label>
                  <div className="flex items-center h-10 gap-1">
                    <button type="button" onClick={() => setTravelers(Math.max(1, travelers - 1))}
                      className="h-10 w-10 flex items-center justify-center rounded-l-lg border border-[#01796F]/40 bg-[#021817] text-[#02E0D5] text-base font-bold hover:bg-[#0a302d] transition-colors">−</button>
                    <span className="flex-1 h-10 flex items-center justify-center bg-[#021817] border-t border-b border-[#01796F]/40 text-white text-xs font-semibold">{travelers}</span>
                    <button type="button" onClick={() => setTravelers(Math.min(9, travelers + 1))}
                      className="h-10 w-10 flex items-center justify-center rounded-r-lg border border-[#01796F]/40 bg-[#021817] text-[#02E0D5] text-base font-bold hover:bg-[#0a302d] transition-colors">+</button>
                  </div>
                </div>

                {/* Pace */}
                <div className="min-w-0">
                  <label className="block text-xs font-bold text-[#02E0D5] mb-1 uppercase tracking-wider">
                    <i className="fas fa-gauge-simple mr-1.5" /> Rythme
                  </label>
                  <select
                    value={pace}
                    onChange={e => setPace(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-[#01796F]/40 bg-[#021817] text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#02E0D5] transition-all"
                  >
                    {PACE_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>

                {/* Submit button */}
                <div className="w-full md:mt-5 lg:w-auto">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full lg:w-auto h-10 px-6 bg-[#01796F] hover:bg-[#015f57] text-white font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed uppercase tracking-wider"
                  >
                    {loading ? <i className="fas fa-circle-notch fa-spin" /> : <i className="fas fa-wand-magic-sparkles text-xs" />}
                    <span>{loading ? 'Génération…' : 'Générer'}</span>
                  </button>
                </div>
              </div>

              {/* Row 3: Preference chips */}
              <div className="border-t border-[#01796F]/20 pt-3">
                <p className="text-[11px] font-bold text-[#b2dfdb] uppercase tracking-wider mb-2">
                  Centres d'intérêt
                </p>
                <div className="flex flex-wrap gap-2">
                  {PREFERENCE_OPTIONS.map(p => {
                    const on = prefs.includes(p.id);
                    return (
                      <button
                        key={p.id} type="button"
                        onClick={() => togglePref(p.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          on
                            ? 'bg-[#01796F] border-[#01796F] text-white shadow-sm'
                            : 'bg-[#031c1a] border-[#01796F]/40 text-[#b2dfdb] hover:border-[#02E0D5]/60 hover:text-white'
                        }`}
                      >
                        <i className={`${p.icon} text-[10px]`} />
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Validation error */}
              {error && (
                <div className="flex items-center gap-2 p-2.5 bg-red-950/60 border border-red-500/50 rounded-lg text-red-200 text-xs">
                  <i className="fas fa-exclamation-circle text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              {!isAuthenticated && (
                <p className="text-xs text-[#b2dfdb]">
                  <Link href="/login" className="text-[#02E0D5] font-bold underline hover:no-underline">Connectez-vous</Link> pour générer et sauvegarder vos plans.
                </p>
              )}
            </form>
          )}
        </div>
      </section>

      {/* ═══════════════ RESULTS SECTION (white/light background, same as flights/activities) ═══════════════ */}
      <section className="travel-results-section py-6 px-4 bg-slate-50 dark:bg-[#021817]">
        <div className="max-w-6xl mx-auto">

          {/* ── No plan yet ─────────────────────────────────────────────── */}
          {!plan && (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#01796F]/10 text-[#01796F] dark:bg-[#01796F]/20 dark:text-[#02E0D5] flex items-center justify-center text-3xl">
                <i className="fas fa-route" />
              </div>
              <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">
                Votre itinéraire apparaîtra ici
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
                Remplissez le formulaire ci-dessus et cliquez sur <strong>Générer</strong>. Yuding orchestrera vols réels, hôtels, activités et transferts en quelques secondes.
              </p>
              {loading && (
                <div className="flex items-center gap-3 mt-4">
                  <i className="fas fa-circle-notch fa-spin text-[#01796F] text-xl" />
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Orchestration des fournisseurs en cours…</span>
                </div>
              )}
            </div>
          )}

          {/* ── Plan loaded ──────────────────────────────────────────────── */}
          {plan && view === 'plan' && (
            <div className="flex flex-col gap-6">

              {/* Plan header card */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 dark:border-[#01796F]/30 dark:bg-[#062523]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    {/* Badges row */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {budgetBadge()}
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#0a302d] text-slate-500 dark:text-slate-400 text-[10px] font-bold font-mono border border-slate-200 dark:border-[#01796F]/30">
                        {plan.reference}
                      </span>
                      {freshTime && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <i className="fas fa-clock text-[10px]" /> Tarifs vérifiés à {freshTime}
                        </span>
                      )}
                    </div>

                    <h2 className="text-2xl font-extrabold leading-snug text-slate-900 dark:text-white mb-1 tracking-tight">
                      {plan.title}
                    </h2>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span><i className="fas fa-calendar-days mr-1" />{plan.startDate} — {plan.endDate}</span>
                      <span><i className="fas fa-user-group mr-1" />{plan.travelers} voyageur(s)</span>
                      <span><i className="fas fa-location-dot mr-1" />{plan.origin} → {plan.destination}</span>
                    </div>
                    {plan.summary && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">{plan.summary}</p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {isAuthenticated && (
                      <button type="button" disabled={savingTrip} onClick={handleToggleSave}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${isSaved ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-[#0a302d] dark:border-[#01796F]/50 dark:text-[#02E0D5]' : 'border-slate-200 text-slate-600 hover:border-[#01796F]/50 hover:text-[#01796F] dark:border-[#01796F]/30 dark:text-slate-300'}`}
                      >
                        <i className={isSaved ? 'fas fa-bookmark' : 'far fa-bookmark'} />
                        <span>{isSaved ? 'Enregistré' : 'Enregistrer'}</span>
                      </button>
                    )}
                    <button type="button" disabled={refreshing} onClick={handleRefresh}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:border-[#01796F]/50 hover:text-[#01796F] transition-colors dark:border-[#01796F]/30 dark:text-slate-300 disabled:opacity-60"
                    >
                      <i className={`fas fa-arrows-rotate text-[11px]${refreshing ? ' fa-spin' : ''}`} />
                      <span>{refreshing ? 'Actualisation…' : 'Actualiser tarifs'}</span>
                    </button>
                    <button type="button" onClick={() => setView('form')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:border-[#01796F]/50 hover:text-[#01796F] transition-colors dark:border-[#01796F]/30 dark:text-slate-300"
                    >
                      <i className="fas fa-pen-to-square text-[11px]" />
                      <span>Modifier</span>
                    </button>
                  </div>
                </div>

                {/* Budget metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100 dark:border-[#01796F]/20">
                  {[
                    { icon: 'fas fa-wallet',         label: 'Budget alloué',         value: fmt(plan.budget, plan.budgetCurrency) },
                    { icon: 'fas fa-receipt',         label: 'Total chiffré',          value: fmt(plan.pricedTotal, plan.budgetCurrency) },
                    { icon: 'fas fa-scale-balanced',  label: 'Solde restant',          value: fmt(plan.remainingBudget, plan.budgetCurrency) },
                    { icon: 'fas fa-circle-question', label: 'Éléments non chiffrés', value: `${plan.unpricedItemsCount}` },
                  ].map(m => (
                    <div key={m.label} className="flex flex-col gap-0.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <i className={`${m.icon} text-[#01796F] dark:text-[#02E0D5]`} /> {m.label}
                      </span>
                      <span className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">{m.value}</span>
                    </div>
                  ))}
                </div>

                {/* Weather */}
                {plan.weatherSummary && (
                  <div className="mt-4 flex items-center gap-2 p-2.5 rounded-lg bg-sky-50 border border-sky-100 dark:bg-[#0a1e2e] dark:border-sky-900/50">
                    <i className="fas fa-cloud-sun text-sky-500 text-base shrink-0" />
                    <span className="text-xs text-sky-700 dark:text-sky-300 font-medium">{plan.weatherSummary}</span>
                  </div>
                )}

                {/* Warnings */}
                {plan.warnings && plan.warnings.length > 0 && (
                  <div className="mt-3 flex flex-col gap-1">
                    {plan.warnings.map((w, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] text-amber-700 dark:text-amber-300">
                        <i className="fas fa-triangle-exclamation text-amber-500 shrink-0" />
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sub-tab switcher */}
              <div className="flex gap-2 border-b border-slate-200 dark:border-[#01796F]/25">
                {[
                  { id: 'itinerary' as const, label: 'Jour par jour', icon: 'fas fa-calendar-week', count: plan.days?.length },
                  { id: 'transport' as const, label: 'Vols & Hébergement', icon: 'fas fa-plane-up', count: null },
                ].map(tab => (
                  <button key={tab.id} type="button" onClick={() => setPlanTab(tab.id)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors -mb-px ${planTab === tab.id ? 'border-[#01796F] text-[#01796F] dark:border-[#02E0D5] dark:text-[#02E0D5]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                  >
                    <i className={`${tab.icon} text-[11px]`} />
                    <span>{tab.label}</span>
                    {tab.count != null && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#0a302d] text-slate-500 dark:text-slate-400 text-[10px]">{tab.count}</span>}
                  </button>
                ))}
              </div>

              {/* ── ITINERARY TAB ─────────────────────────────────────── */}
              {planTab === 'itinerary' && plan.days && (
                <div className="flex flex-col gap-4">
                  {plan.days.map(day => (
                    <div key={day.dayNumber} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-[#01796F]/30 dark:bg-[#062523]">
                      {/* Day header */}
                      <div className="flex items-center justify-between gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100 dark:bg-[#0a302d] dark:border-[#01796F]/20 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#01796F] text-white flex items-center justify-center font-extrabold text-sm shrink-0">
                            J{day.dayNumber}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{day.theme || `Jour ${day.dayNumber}`}</p>
                            <p className="text-xs text-slate-400">{day.date}</p>
                          </div>
                        </div>
                        {day.weatherForecast && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] bg-sky-50 border border-sky-100 text-sky-700 dark:bg-[#0a1e2e] dark:border-sky-900/50 dark:text-sky-300">
                            <i className="fas fa-cloud-sun text-[10px]" /> {day.weatherForecast}
                          </span>
                        )}
                      </div>

                      {/* Time slots */}
                      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-[#01796F]/20">
                        {[
                          { slot: 'Matin',      icon: 'fas fa-sun',       color: 'text-amber-500',  items: day.morning   },
                          { slot: 'Après-midi', icon: 'fas fa-cloud-sun', color: 'text-[#01796F]',  items: day.afternoon },
                          { slot: 'Soirée',     icon: 'fas fa-moon',      color: 'text-indigo-500', items: day.evening   },
                        ].map(s => (
                          <div key={s.slot} className="p-4">
                            <p className={`text-[11px] font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${s.color}`}>
                              <i className={`${s.icon} text-[10px]`} /> {s.slot}
                            </p>
                            {s.items && s.items.length > 0 ? (
                              s.items.map((item: TripPlanItemDto, i: number) => (
                                <div key={i} className="mb-3 last:mb-0">
                                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">{item.title}</p>
                                  {(item.priceInBudgetCurrency || item.price) && (
                                    <p className="text-xs font-bold text-[#01796F] dark:text-[#02E0D5] mt-0.5">
                                      {fmt(item.priceInBudgetCurrency ?? item.price, item.priceInBudgetCurrency ? plan.budgetCurrency : (item.currency ?? ''))}
                                    </p>
                                  )}
                                  {item.provider && (
                                    <span className="text-[10px] text-slate-400 font-mono">via {item.provider}</span>
                                  )}
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-slate-400 italic">Temps libre</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── TRANSPORT TAB ─────────────────────────────────────── */}
              {planTab === 'transport' && (
                <div className="flex flex-col gap-4">
                  {[
                    { label: 'Vol aller',           icon: 'fas fa-plane',      item: plan.flight,       emptyMsg: 'Aucun vol sélectionné' },
                    { label: 'Vol retour',           icon: 'fas fa-plane',      item: plan.returnFlight, emptyMsg: 'Vol retour non renseigné' },
                    { label: 'Hébergement',          icon: 'fas fa-hotel',      item: plan.hotel,        emptyMsg: 'Aucun hébergement sélectionné' },
                    { label: 'Transfert aéroport',   icon: 'fas fa-taxi',       item: plan.transfer,     emptyMsg: 'Aucun transfert disponible' },
                  ].filter(row => row.item || row.label !== 'Vol retour').map(row => (
                    <div key={row.label} className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(200px,.9fr)] items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-[border-color,box-shadow] hover:border-[#01796F]/40 hover:shadow-md dark:border-[#01796F]/30 dark:bg-[#062523]">
                      {/* Icon + label */}
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-[#01796F]/10 dark:bg-[#01796F]/20 text-[#01796F] dark:text-[#02E0D5] flex items-center justify-center text-lg shrink-0">
                          <i className={row.icon} />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{row.label}</p>
                          <p className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                            {row.item?.title || row.emptyMsg}
                          </p>
                          {row.item?.provider && (
                            <span className="text-[10px] font-mono text-[#01796F] dark:text-[#02E0D5]">via {row.item.provider}</span>
                          )}
                        </div>
                      </div>

                      {/* Offer reference (middle column) */}
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate hidden lg:block">
                        {row.item?.offerReference ? (
                          <span title={row.item.offerReference} className="px-2 py-1 rounded bg-slate-100 dark:bg-[#0a302d] border border-slate-200 dark:border-[#01796F]/30 text-[10px]">
                            {row.item.offerReference.substring(0, 60)}{row.item.offerReference.length > 60 ? '…' : ''}
                          </span>
                        ) : '—'}
                      </div>

                      {/* Price */}
                      <div className="lg:text-right">
                        {row.item && (row.item.priceInBudgetCurrency || row.item.price) ? (
                          <>
                            <div className="text-2xl font-extrabold text-[#01796F] dark:text-[#02E0D5] leading-tight">
                              {fmt(row.item.priceInBudgetCurrency ?? row.item.price, row.item.priceInBudgetCurrency ? plan.budgetCurrency : (row.item.currency ?? ''))}
                            </div>
                            {row.item.currency && row.item.currency !== plan.budgetCurrency && (
                              <div className="text-[11px] text-slate-400">Converti en {plan.budgetCurrency}</div>
                            )}
                          </>
                        ) : (
                          <span className="text-sm text-slate-400 italic">Non chiffré</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Knowledge sources ──────────────────────────────────── */}
              {plan.sources && plan.sources.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#01796F]/30 dark:bg-[#062523]">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#01796F] dark:text-[#02E0D5] mb-3 flex items-center gap-2">
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

              {/* Disclaimer */}
              <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed pb-4">
                Ce plan est un outil d'aide à la planification. Tarifs et disponibilités sont issus de fournisseurs réels et restent indicatifs jusqu'à validation sur les pages de réservation Yuding.
              </p>
            </div>
          )}
        </div>
      </section>
    </TravelPage>
  );
}
