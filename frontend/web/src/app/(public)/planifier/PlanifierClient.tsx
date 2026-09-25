'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import { aiService } from '@/services/ai.service';
import { libraryService } from '@/services/library.service';
import type { TripPlanDto, TripPlanItemDto, TripPlanRequest } from '@/types/ai.types';
import type { SavedTripItem } from '@/types/library.types';
import '../account/account.css';

// ─── Preference options with FA icons, zero emojis ──────────────────────────
const PREFERENCE_OPTIONS = [
  { id: 'food',       label: 'Gastronomie',     icon: 'fas fa-utensils' },
  { id: 'museums',    label: 'Musées & Culture', icon: 'fas fa-landmark' },
  { id: 'nature',     label: 'Nature & Parcs',   icon: 'fas fa-tree' },
  { id: 'local',      label: 'Activités',         icon: 'fas fa-ticket-alt' },
  { id: 'shopping',   label: 'Shopping',          icon: 'fas fa-shopping-bag' },
  { id: 'relaxation', label: 'Détente',            icon: 'fas fa-spa' },
];

const PACE_OPTIONS = [
  { value: 'relaxed',  label: 'Relaxé',   icon: 'fas fa-feather' },
  { value: 'moderate', label: 'Équilibré', icon: 'fas fa-balance-scale' },
  { value: 'fast',     label: 'Intensif',  icon: 'fas fa-bolt' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (amount?: number | null, currency = 'MAD') => {
  if (amount === undefined || amount === null) return 'Non chiffré';
  return `${Number(amount).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${currency}`;
};

const statusInfo = (status?: string) => {
  if (status === 'WITHIN_BUDGET') return { cls: 'badge-budget-ok',  icon: 'fas fa-check-circle', label: 'Dans le budget' };
  if (status === 'OVER_BUDGET')   return { cls: 'badge-budget-over', icon: 'fas fa-exclamation-triangle', label: 'Dépassement' };
  return { cls: 'badge-budget-partial', icon: 'fas fa-info-circle', label: 'Chiffrage partiel' };
};

// ─── Component ───────────────────────────────────────────────────────────────
export function PlanifierClient() {
  const { isAuthenticated, user } = useAuth();
  const searchParams = useSearchParams();
  const tripRefParam = searchParams.get('tripRef');

  // Form
  const [origin,      setOrigin]      = useState('Casablanca');
  const [destination, setDestination] = useState('Paris');
  const [startDate,   setStartDate]   = useState('');
  const [endDate,     setEndDate]     = useState('');
  const [travelers,   setTravelers]   = useState(2);
  const [budget,      setBudget]      = useState('15000');
  const [currency,    setCurrency]    = useState('MAD');
  const [prefs,       setPrefs]       = useState<string[]>(['food', 'museums', 'local']);
  const [pace,        setPace]        = useState('relaxed');

  // State
  const [loading,      setLoading]      = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);
  const [savingTrip,   setSavingTrip]   = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [plan,         setPlan]         = useState<TripPlanDto | null>(null);
  const [allPlans,     setAllPlans]     = useState<TripPlanDto[]>([]);
  const [savedTrips,   setSavedTrips]   = useState<SavedTripItem[]>([]);
  const [activeTab,    setActiveTab]    = useState<'itinerary' | 'transport'>('itinerary');
  const [freshTime,    setFreshTime]    = useState('');
  const [showForm,     setShowForm]     = useState(true);

  // Default dates: +15 to +20 days
  useEffect(() => {
    const start = new Date(); start.setDate(start.getDate() + 15);
    const end   = new Date(start); end.setDate(start.getDate() + 5);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (user?.preferredCurrency) setCurrency(user.preferredCurrency);
  }, [user?.preferredCurrency]);

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

  // Load plan from URL param
  useEffect(() => {
    if (tripRefParam && isAuthenticated) {
      aiService.getTripPlanByReference(tripRefParam)
        .then(p => { setPlan(p); setShowForm(false); setFreshTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })); })
        .catch(console.error);
    }
  }, [tripRefParam, isAuthenticated]);

  const isSaved = plan ? savedTrips.some(s => s.tripPlanReference === plan.reference) : false;
  const savedRef = plan ? savedTrips.find(s => s.tripPlanReference === plan.reference) : undefined;

  const togglePref = (id: string) =>
    setPrefs(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) { setError('Connectez-vous pour générer un plan de voyage.'); return; }
    const numBudget = parseFloat(budget);
    if (!origin || !destination || !startDate || !endDate) {
      setError('Renseignez tous les champs obligatoires.'); return;
    }
    if (isNaN(numBudget) || numBudget <= 0) {
      setError('Le budget doit être un montant positif.'); return;
    }
    setLoading(true); setError(null);
    const req: TripPlanRequest = { origin: origin.trim(), destination: destination.trim(), startDate, endDate, travelers: Number(travelers), budget: numBudget, budgetCurrency: currency, preferences: prefs, pace };
    try {
      const result = await aiService.createTripPlan(req);
      setPlan(result);
      setAllPlans(prev => [result, ...prev.filter(p => p.reference !== result.reference)]);
      setFreshTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      setShowForm(false);
      libraryService.recordRecentSearch({ searchType: 'TRIP', origin: origin.trim(), destination: destination.trim(), departureDate: startDate, returnDate: endDate, travelersCount: Number(travelers), criteriaPayload: { budget: numBudget, budgetCurrency: currency, preferences: prefs, pace } }).catch(() => {});
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Échec de la génération du plan.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!plan) return;
    setRefreshing(true); setError(null);
    try {
      const result = await aiService.refreshTripPlan(plan.reference);
      setPlan(result);
      setAllPlans(prev => prev.map(p => p.reference === result.reference ? result : p));
      setFreshTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Échec de l\'actualisation.');
    } finally {
      setRefreshing(false);
    }
  };

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

  const status = statusInfo(plan?.budgetStatus);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="user-account-shell">
      <div className="account-surface">
        <div className="account-content">

          {/* ── Page Header (identical markup to account pages) ── */}
          <header className="account-page-header">
            <div>
              <p className="account-kicker">PLANIFICATEUR INTELLIGENT • TARIFS EN TEMPS RÉEL</p>
              <h1>Mon voyage sur mesure</h1>
              <p>Vols vérifiés, hôtels disponibles, activités et budget maîtrisé — tout dans un seul plan chiffré.</p>
            </div>
            <span className="account-header-mark" style={{ background: '#eaf4f1', color: '#087d70' }}>
              <i className="fas fa-route" aria-hidden="true" />
            </span>
          </header>

          {/* ── Form / Plan toggle strip ── */}
          <nav className="library-tabs-nav" aria-label="Planificateur navigation">
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className={`library-tab-btn ${showForm ? 'active' : ''}`}
            >
              <i className="fas fa-sliders" aria-hidden="true" />
              <span>Paramètres du voyage</span>
            </button>
            {plan && (
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className={`library-tab-btn ${!showForm ? 'active' : ''}`}
              >
                <i className="fas fa-calendar-week" aria-hidden="true" />
                <span>Mon itinéraire</span>
                {plan.reference && (
                  <span className="library-tab-count">{plan.reference}</span>
                )}
              </button>
            )}
            {allPlans.length > 1 && allPlans.slice(0, 3).map(p => (
              p.reference !== plan?.reference && (
                <button
                  key={p.reference}
                  type="button"
                  onClick={() => { setPlan(p); setShowForm(false); }}
                  className="library-tab-btn"
                  style={{ fontWeight: 500, fontSize: '12px' }}
                >
                  <i className="fas fa-clock-rotate-left" aria-hidden="true" />
                  <span>{p.destination}</span>
                  <span className="library-tab-count" style={{ fontWeight: 500 }}>{p.reference}</span>
                </button>
              )
            ))}
          </nav>

          {/* ═══════════════════ FORM PANEL ═══════════════════ */}
          {showForm && (
            <section aria-labelledby="form-heading" style={{ paddingTop: '8px' }}>
              <form onSubmit={handleGenerate} noValidate>

                {/* ── Row 1: Route ── */}
                <div className="profile-section" style={{ paddingTop: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--account-line)' }}>
                  <div style={{ marginBottom: '18px' }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--account-ink)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                      <i className="fas fa-route" style={{ marginRight: '8px', color: 'var(--account-green)' }} />
                      Itinéraire
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--account-muted)' }}>Saisissez votre ville de départ et votre destination</p>
                  </div>
                  <div className="details-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
                    <div>
                      <label className="field-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--account-muted)', marginBottom: '6px', letterSpacing: '.04em', textTransform: 'uppercase' }}>
                        Ville de départ *
                      </label>
                      <input
                        type="text" required
                        value={origin}
                        onChange={e => setOrigin(e.target.value)}
                        placeholder="Ex : Casablanca"
                        style={{ width: '100%', padding: '10px 13px', borderRadius: '9px', border: '1px solid var(--account-line)', background: 'var(--account-card)', color: 'var(--account-ink)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label className="field-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--account-muted)', marginBottom: '6px', letterSpacing: '.04em', textTransform: 'uppercase' }}>
                        Destination *
                      </label>
                      <input
                        type="text" required
                        value={destination}
                        onChange={e => setDestination(e.target.value)}
                        placeholder="Ex : Paris"
                        style={{ width: '100%', padding: '10px 13px', borderRadius: '9px', border: '1px solid var(--account-line)', background: 'var(--account-card)', color: 'var(--account-ink)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label className="field-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--account-muted)', marginBottom: '6px', letterSpacing: '.04em', textTransform: 'uppercase' }}>
                        Date de départ *
                      </label>
                      <input
                        type="date" required
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        style={{ width: '100%', padding: '10px 13px', borderRadius: '9px', border: '1px solid var(--account-line)', background: 'var(--account-card)', color: 'var(--account-ink)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label className="field-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--account-muted)', marginBottom: '6px', letterSpacing: '.04em', textTransform: 'uppercase' }}>
                        Date de retour *
                      </label>
                      <input
                        type="date" required
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        style={{ width: '100%', padding: '10px 13px', borderRadius: '9px', border: '1px solid var(--account-line)', background: 'var(--account-card)', color: 'var(--account-ink)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                </div>

                {/* ── Row 2: Budget & Travelers ── */}
                <div className="profile-section" style={{ paddingTop: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--account-line)' }}>
                  <div style={{ marginBottom: '18px' }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--account-ink)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                      <i className="fas fa-coins" style={{ marginRight: '8px', color: 'var(--account-green)' }} />
                      Budget & Voyageurs
                    </p>
                  </div>
                  <div className="details-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
                    <div>
                      <label className="field-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--account-muted)', marginBottom: '6px', letterSpacing: '.04em', textTransform: 'uppercase' }}>
                        Budget total *
                      </label>
                      <div style={{ display: 'flex' }}>
                        <input
                          type="number" required
                          min="100" step="100"
                          value={budget}
                          onChange={e => setBudget(e.target.value)}
                          style={{ flex: 1, padding: '10px 13px', borderRadius: '9px 0 0 9px', border: '1px solid var(--account-line)', borderRight: 'none', background: 'var(--account-card)', color: 'var(--account-ink)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                        />
                        <select
                          value={currency}
                          onChange={e => setCurrency(e.target.value)}
                          style={{ padding: '10px 10px', borderRadius: '0 9px 9px 0', border: '1px solid var(--account-line)', background: '#f7faf9', color: 'var(--account-ink)', fontSize: '13px', fontWeight: 700, outline: 'none' }}
                        >
                          <option value="MAD">MAD</option>
                          <option value="EUR">EUR</option>
                          <option value="USD">USD</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="field-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--account-muted)', marginBottom: '6px', letterSpacing: '.04em', textTransform: 'uppercase' }}>
                        Nombre de voyageurs
                      </label>
                      <input
                        type="number"
                        min="1" max="9"
                        value={travelers}
                        onChange={e => setTravelers(Math.max(1, parseInt(e.target.value) || 1))}
                        style={{ width: '100%', padding: '10px 13px', borderRadius: '9px', border: '1px solid var(--account-line)', background: 'var(--account-card)', color: 'var(--account-ink)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                </div>

                {/* ── Row 3: Preferences & Pace ── */}
                <div className="profile-section" style={{ paddingTop: '24px', paddingBottom: '28px', borderBottom: '1px solid var(--account-line)' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--account-ink)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                      <i className="fas fa-sliders" style={{ marginRight: '8px', color: 'var(--account-green)' }} />
                      Centres d'intérêt & Rythme
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--account-muted)' }}>Sélectionnez vos préférences pour personnaliser le programme</p>
                  </div>

                  {/* Preferences chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                    {PREFERENCE_OPTIONS.map(p => {
                      const selected = prefs.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => togglePref(p.id)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '7px',
                            padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: selected ? 700 : 500,
                            border: `1px solid ${selected ? '#087d70' : 'var(--account-line)'}`,
                            background: selected ? '#eaf4f1' : 'var(--account-card)',
                            color: selected ? '#087d70' : 'var(--account-muted)',
                            cursor: 'pointer', transition: 'all .15s ease',
                          }}
                        >
                          <i className={p.icon} style={{ fontSize: '11px' }} />
                          <span>{p.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Pace selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--account-muted)', marginRight: '4px' }}>Rythme :</span>
                    <div className="library-subfilters">
                      {PACE_OPTIONS.map(p => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setPace(p.value)}
                          className={`library-subfilter-btn ${pace === p.value ? 'active' : ''}`}
                        >
                          <i className={p.icon} />
                          <span>{p.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Error ── */}
                {error && (
                  <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '10px', background: '#fff0f0', border: '1px solid #fee2e2', color: '#ad3636', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="fas fa-exclamation-triangle" />
                    <span>{error}</span>
                  </div>
                )}

                {/* ── Submit ── */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginTop: '28px', flexWrap: 'wrap' }}>
                  {!isAuthenticated && (
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--account-muted)' }}>
                      <Link href="/login" style={{ color: 'var(--account-green)', fontWeight: 700 }}>Connectez-vous</Link> pour générer et enregistrer vos plans.
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="account-primary-action"
                    style={{ minWidth: '220px', gap: '10px', padding: '13px 24px', fontSize: '14px', opacity: loading ? .75 : 1, cursor: loading ? 'wait' : 'pointer' }}
                  >
                    {loading ? (
                      <><i className="fas fa-circle-notch fa-spin" /><span>Orchestration en cours…</span></>
                    ) : (
                      <><i className="fas fa-wand-magic-sparkles" /><span>Générer l'itinéraire chiffré</span></>
                    )}
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* ═══════════════════ PLAN PANEL ═══════════════════ */}
          {!showForm && plan && (
            <section aria-labelledby="plan-heading" style={{ paddingTop: '12px' }}>

              {/* ── Plan Identity Card ── */}
              <div style={{ paddingBottom: '24px', borderBottom: '1px solid var(--account-line)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 0', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    {/* Status badge */}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 700,
                      background: plan.budgetStatus === 'WITHIN_BUDGET' ? '#e9f8f3' : plan.budgetStatus === 'OVER_BUDGET' ? '#fff0f0' : '#fffbea',
                      color: plan.budgetStatus === 'WITHIN_BUDGET' ? '#096858' : plan.budgetStatus === 'OVER_BUDGET' ? '#ad3636' : '#8a6300',
                      border: `1px solid ${plan.budgetStatus === 'WITHIN_BUDGET' ? '#b5e8d8' : plan.budgetStatus === 'OVER_BUDGET' ? '#fdd5d5' : '#fbe09a'}`,
                    }}>
                      <i className={status.icon} style={{ fontSize: '11px' }} />
                      <span>{status.label}</span>
                    </span>
                    {/* Ref badge */}
                    <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#475569', fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', border: '1px solid #e2e8f0' }}>
                      {plan.reference}
                    </span>
                    {/* Fresh time */}
                    {freshTime && (
                      <span style={{ fontSize: '12px', color: 'var(--account-muted)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <i className="fas fa-clock" style={{ fontSize: '10px' }} />
                        <span>Prix vérifiés à {freshTime}</span>
                      </span>
                    )}
                  </div>
                  <h2 id="plan-heading" style={{ margin: '0 0 4px', fontSize: 'clamp(22px, 2.5vw, 32px)', lineHeight: 1.15, letterSpacing: '-.03em', color: 'var(--account-ink)' }}>
                    {plan.title}
                  </h2>
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--account-muted)', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                    <span><i className="fas fa-calendar-days" style={{ marginRight: '5px' }} />{plan.startDate} — {plan.endDate}</span>
                    <span><i className="fas fa-user-group" style={{ marginRight: '5px' }} />{plan.travelers} voyageur(s)</span>
                  </p>
                  {plan.summary && <p style={{ margin: '8px 0 0', fontSize: '14px', color: 'var(--account-muted)', lineHeight: 1.55, maxWidth: '560px' }}>{plan.summary}</p>}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
                  {isAuthenticated && (
                    <button
                      type="button"
                      disabled={savingTrip}
                      onClick={handleToggleSave}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '7px',
                        padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                        border: '1px solid var(--account-line)', background: isSaved ? '#eaf4f1' : 'var(--account-card)',
                        color: isSaved ? '#087d70' : 'var(--account-muted)', cursor: 'pointer', transition: 'all .15s ease',
                      }}
                    >
                      <i className={isSaved ? 'fas fa-bookmark' : 'far fa-bookmark'} style={{ fontSize: '12px' }} />
                      <span>{isSaved ? 'Enregistré' : 'Enregistrer'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={refreshing}
                    onClick={handleRefresh}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '7px',
                      padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                      border: '1px solid var(--account-line)', background: 'var(--account-card)',
                      color: 'var(--account-muted)', cursor: refreshing ? 'wait' : 'pointer', transition: 'all .15s ease',
                    }}
                  >
                    <i className={`fas fa-arrows-rotate${refreshing ? ' fa-spin' : ''}`} style={{ fontSize: '12px' }} />
                    <span>{refreshing ? 'Actualisation…' : 'Actualiser tarifs'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '7px',
                      padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                      border: '1px solid var(--account-line)', background: 'var(--account-card)',
                      color: 'var(--account-muted)', cursor: 'pointer', transition: 'all .15s ease',
                    }}
                  >
                    <i className="fas fa-pen-to-square" style={{ fontSize: '12px' }} />
                    <span>Modifier</span>
                  </button>
                </div>
              </div>

              {/* ── Financial Metrics ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', padding: '24px 0', borderBottom: '1px solid var(--account-line)' }}>
                {[
                  { label: 'Budget alloué',       value: fmt(plan.budget, plan.budgetCurrency),         icon: 'fas fa-wallet',   color: 'var(--account-ink)' },
                  { label: 'Total chiffré vérifié', value: fmt(plan.pricedTotal, plan.budgetCurrency),   icon: 'fas fa-receipt',  color: '#087d70' },
                  { label: 'Solde restant',          value: fmt(plan.remainingBudget, plan.budgetCurrency), icon: 'fas fa-scale-balanced', color: (plan.remainingBudget ?? 0) >= 0 ? 'var(--account-ink)' : '#ad3636' },
                  { label: 'Non chiffrés',           value: `${plan.unpricedItemsCount} élément(s)`,      icon: 'fas fa-circle-question', color: 'var(--account-muted)' },
                ].map(m => (
                  <div key={m.label} style={{ padding: '16px 18px', borderRadius: '12px', border: '1px solid var(--account-line)', background: 'var(--account-card)' }}>
                    <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 700, color: 'var(--account-muted)', textTransform: 'uppercase', letterSpacing: '.07em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className={m.icon} style={{ color: 'var(--account-green)', fontSize: '11px' }} />
                      {m.label}
                    </p>
                    <p style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: m.color, lineHeight: 1.2 }}>{m.value}</p>
                  </div>
                ))}
              </div>

              {/* ── Weather ── */}
              {plan.weatherSummary && (
                <div style={{ margin: '16px 0', padding: '12px 16px', borderRadius: '10px', background: '#eff9ff', border: '1px solid #bfdfee', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fas fa-cloud-sun" style={{ fontSize: '16px', color: '#0ea5e9', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: '#0c4a6e', fontWeight: 500 }}>{plan.weatherSummary}</span>
                </div>
              )}

              {/* ── Plan sub-tabs: Itinerary | Transport ── */}
              <div className="library-subfilters" style={{ marginTop: '20px', marginBottom: '20px' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('itinerary')}
                  className={`library-subfilter-btn ${activeTab === 'itinerary' ? 'active' : ''}`}
                >
                  <i className="fas fa-calendar-week" />
                  <span>Jour par jour</span>
                  {plan.days && <span className="library-tab-count">{plan.days.length}</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('transport')}
                  className={`library-subfilter-btn ${activeTab === 'transport' ? 'active' : ''}`}
                >
                  <i className="fas fa-plane-up" />
                  <span>Vols & Hébergement</span>
                </button>
              </div>

              {/* ── ITINERARY TAB ── */}
              {activeTab === 'itinerary' && plan.days && (
                <div className="library-list">
                  {plan.days.map(day => (
                    <div key={day.dayNumber} className="library-list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '14px' }}>
                      {/* Day header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#087d70', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px', flexShrink: 0 }}>
                            J{day.dayNumber}
                          </div>
                          <div>
                            <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--account-ink)' }}>{day.theme || `Jour ${day.dayNumber}`}</p>
                            <p style={{ margin: 0, fontSize: '12px', color: 'var(--account-muted)' }}>{day.date}</p>
                          </div>
                        </div>
                        {day.weatherForecast && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '999px', background: '#eff9ff', border: '1px solid #bfdfee', color: '#0c4a6e', fontSize: '12px', fontWeight: 500 }}>
                            <i className="fas fa-cloud-sun" style={{ color: '#0ea5e9', fontSize: '11px' }} />
                            {day.weatherForecast}
                          </span>
                        )}
                      </div>

                      {/* Slot grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                        {[
                          { label: 'Matin',       icon: 'fas fa-sun',       color: '#d97706', items: day.morning },
                          { label: 'Après-midi',  icon: 'fas fa-cloud-sun', color: '#087d70', items: day.afternoon },
                          { label: 'Soirée',      icon: 'fas fa-moon',      color: '#6366f1', items: day.evening },
                        ].map(slot => (
                          <div key={slot.label} style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--account-line)', background: '#f7faf9' }}>
                            <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: slot.color, textTransform: 'uppercase', letterSpacing: '.07em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <i className={slot.icon} style={{ fontSize: '10px' }} />
                              {slot.label}
                            </p>
                            {slot.items && slot.items.length > 0 ? (
                              slot.items.map((item: TripPlanItemDto, i: number) => (
                                <div key={i} style={{ marginBottom: i < slot.items!.length - 1 ? '8px' : 0 }}>
                                  <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 600, color: 'var(--account-ink)', lineHeight: 1.35 }}>{item.title}</p>
                                  {(item.priceInBudgetCurrency || item.price) && (
                                    <p style={{ margin: 0, fontSize: '12px', color: '#087d70', fontWeight: 600 }}>
                                      {fmt(item.priceInBudgetCurrency || item.price, plan.budgetCurrency)}
                                    </p>
                                  )}
                                </div>
                              ))
                            ) : (
                              <p style={{ margin: 0, fontSize: '13px', color: 'var(--account-muted)', fontStyle: 'italic' }}>Libre</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── TRANSPORT TAB ── */}
              {activeTab === 'transport' && (
                <div className="library-list">
                  {/* Flight */}
                  <TransportCard
                    icon="fas fa-plane"
                    iconBg="#eaf4f1" iconColor="#087d70"
                    label="Vol sélectionné"
                    item={plan.flight}
                    budgetCurrency={plan.budgetCurrency}
                    emptyLabel="Aucun vol direct sélectionné"
                  />
                  {/* Hotel */}
                  <TransportCard
                    icon="fas fa-hotel"
                    iconBg="#eaf4f1" iconColor="#087d70"
                    label="Hébergement"
                    item={plan.hotel}
                    budgetCurrency={plan.budgetCurrency}
                    emptyLabel="Aucun hébergement sélectionné"
                  />
                  {/* Transfer */}
                  {plan.transfer && (
                    <TransportCard
                      icon="fas fa-taxi"
                      iconBg="#fffbea" iconColor="#d97706"
                      label="Transfert aéroport"
                      item={plan.transfer}
                      budgetCurrency={plan.budgetCurrency}
                      emptyLabel="Aucun transfert disponible"
                    />
                  )}
                </div>
              )}

              {/* ── Sources ── */}
              {plan.sources && plan.sources.length > 0 && (
                <div style={{ marginTop: '24px', padding: '16px 18px', borderRadius: '12px', background: '#f7faf9', border: '1px solid var(--account-line)' }}>
                  <p style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: 700, color: 'var(--account-muted)', textTransform: 'uppercase', letterSpacing: '.07em', display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <i className="fas fa-book-open" style={{ color: 'var(--account-green)' }} />
                    Guides Yuding consultés
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {plan.sources.map((s, i) => (
                      <span key={i} style={{ padding: '4px 10px', borderRadius: '6px', background: 'white', border: '1px solid var(--account-line)', fontSize: '12px', color: 'var(--account-muted)' }}>
                        {s.title}{s.section ? ` — ${s.section}` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Disclaimer ── */}
              <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '12px', color: 'var(--account-muted)', lineHeight: 1.6 }}>
                Ce plan est un instantané d'aide à la planification. Tarifs et disponibilités sont issus de fournisseurs réels mais restent indicatifs jusqu'à validation sur les pages de réservation Yuding.
              </p>

            </section>
          )}

          {/* ── Empty state when no plan yet ── */}
          {!showForm && !plan && (
            <div className="account-empty-panel">
              <span className="account-empty-icon" style={{ background: '#eaf4f1', color: '#087d70' }}>
                <i className="fas fa-route" aria-hidden="true" />
              </span>
              <div className="account-empty-copy">
                <h2>Aucun itinéraire planifié</h2>
                <p>Cliquez sur «&nbsp;Paramètres du voyage&nbsp;» pour démarrer votre projet de voyage. Yuding orchestrera vols, hébergements, activités et transferts en quelques secondes.</p>
              </div>
              <button type="button" onClick={() => setShowForm(true)} className="account-primary-action">
                <i className="fas fa-wand-magic-sparkles" />
                <span>Créer un plan</span>
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Transport Card Sub-component ────────────────────────────────────────────
interface TransportCardProps {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  item?: TripPlanItemDto | null;
  budgetCurrency?: string;
  emptyLabel: string;
}

function TransportCard({ icon, iconBg, iconColor, label, item, budgetCurrency, emptyLabel }: TransportCardProps) {
  return (
    <div className="library-list-item" style={{ gap: '16px' }}>
      <span style={{ width: '40px', height: '40px', borderRadius: '10px', background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
        <i className={icon} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: '0 0 2px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.07em' }}>{label}</p>
        <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--account-ink)', lineHeight: 1.35 }}>
          {item?.title || emptyLabel}
        </p>
        {item?.provider && (
          <span style={{ display: 'inline-block', marginTop: '4px', padding: '2px 8px', borderRadius: '4px', background: '#f1f5f9', border: '1px solid #e2e8f0', fontSize: '10px', fontWeight: 700, color: '#64748b', fontFamily: 'monospace', textTransform: 'uppercase' }}>
            {item.provider}
          </span>
        )}
      </div>
      {item && (item.priceInBudgetCurrency || item.price) && (
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#087d70' }}>
            {`${Number(item.priceInBudgetCurrency || item.price).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${budgetCurrency || item.currency || 'MAD'}`}
          </p>
          <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
            {item.currency && item.currency !== budgetCurrency ? `(en ${item.currency})` : 'Converti'}
          </p>
        </div>
      )}
    </div>
  );
}
