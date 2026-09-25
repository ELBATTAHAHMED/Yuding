'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import { aiService } from '@/services/ai.service';
import { libraryService } from '@/services/library.service';
import type { TripPlanDto, TripPlanRequest } from '@/types/ai.types';
import type { SavedTripItem } from '@/types/library.types';

const PREFERENCE_OPTIONS = [
  { id: 'food', label: 'Gastronomie & Cafés', icon: '🍽️' },
  { id: 'museums', label: 'Musées & Histoire', icon: '🏛️' },
  { id: 'nature', label: 'Nature & Parcs', icon: '🌳' },
  { id: 'local', label: 'Expériences locales', icon: '✨' },
  { id: 'shopping', label: 'Shopping & Marchés', icon: '🛍️' },
  { id: 'relaxation', label: 'Détente & Bien-être', icon: '💆' },
];

export function PlanifierClient() {
  const { isAuthenticated, user } = useAuth();
  const searchParams = useSearchParams();
  const tripRefParam = searchParams.get('tripRef');

  // Form State
  const [origin, setOrigin] = useState('Casablanca');
  const [destination, setDestination] = useState('Paris');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [travelers, setTravelers] = useState(2);
  const [budget, setBudget] = useState('8000');
  const [budgetCurrency, setBudgetCurrency] = useState('MAD');
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>(['food', 'museums', 'local']);
  const [pace, setPace] = useState('relaxed');

  // Execution State
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingTrip, setIsSavingTrip] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<TripPlanDto | null>(null);
  const [userPlans, setUserPlans] = useState<TripPlanDto[]>([]);
  const [savedTrips, setSavedTrips] = useState<SavedTripItem[]>([]);
  const [activeTab, setActiveTab] = useState<'itinerary' | 'budget' | 'details'>('itinerary');

  // Set default dates (15 days from now for 5 days)
  useEffect(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() + 15);
    const end = new Date(start);
    end.setDate(start.getDate() + 5);

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, []);

  // The saved preference is only a default; the currency selector remains an explicit override.
  useEffect(() => {
    if (user?.preferredCurrency) setBudgetCurrency(user.preferredCurrency);
  }, [user?.preferredCurrency]);

  // Load existing plans for user
  useEffect(() => {
    if (isAuthenticated) {
      aiService.getUserTripPlans()
        .then((plans) => setUserPlans(plans))
        .catch(() => {});
      libraryService.getSavedTrips()
        .then((trips) => setSavedTrips(trips))
        .catch(() => {});
    }
  }, [isAuthenticated]);

  // Load specific trip if tripRef param is provided
  useEffect(() => {
    if (tripRefParam && isAuthenticated) {
      aiService.getTripPlanByReference(tripRefParam)
        .then((plan: TripPlanDto) => setCurrentPlan(plan))
        .catch(console.error);
    }
  }, [tripRefParam, isAuthenticated]);

  const isTripSaved = currentPlan ? savedTrips.some(st => st.tripPlanReference === currentPlan.reference) : false;
  const currentSavedTrip = currentPlan ? savedTrips.find(st => st.tripPlanReference === currentPlan.reference) : undefined;

  const handleToggleSaveTrip = async () => {
    if (!currentPlan || !isAuthenticated) return;
    setIsSavingTrip(true);
    try {
      if (isTripSaved && currentSavedTrip) {
        await libraryService.unsaveTrip(currentSavedTrip.publicReference);
        setSavedTrips(prev => prev.filter(st => st.publicReference !== currentSavedTrip.publicReference));
      } else {
        const saved = await libraryService.saveTrip({
          tripPlanReference: currentPlan.reference,
        });
        setSavedTrips(prev => [saved, ...prev]);
      }
    } catch (err) {
      console.error('Failed to toggle save trip:', err);
    } finally {
      setIsSavingTrip(false);
    }
  };

  const togglePreference = (id: string) => {
    setSelectedPreferences((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setError('Veuillez vous connecter pour créer et sauvegarder un plan de voyage.');
      return;
    }

    if (!origin.trim() || !destination.trim() || !startDate || !endDate) {
      setError('Veuillez renseigner la ville de départ, la destination et les dates.');
      return;
    }

    const numBudget = parseFloat(budget);
    if (isNaN(numBudget) || numBudget <= 0) {
      setError('Veuillez indiquer un budget valide.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const request: TripPlanRequest = {
      origin: origin.trim(),
      destination: destination.trim(),
      startDate,
      endDate,
      travelers: Number(travelers),
      budget: numBudget,
      budgetCurrency,
      preferences: selectedPreferences,
      pace,
    };

    try {
      const plan = await aiService.createTripPlan(request);
      setCurrentPlan(plan);
      setUserPlans((prev) => [plan, ...prev.filter((p) => p.reference !== plan.reference)]);
      libraryService.recordRecentSearch({
        searchType: 'TRIP',
        origin: origin.trim(),
        destination: destination.trim(),
        departureDate: startDate,
        returnDate: endDate,
        travelersCount: Number(travelers),
        criteriaPayload: {
          budget: numBudget,
          budgetCurrency,
          preferences: selectedPreferences,
          pace,
        },
      }).catch(() => {});
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Échec de la génération du plan de voyage.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshPlan = async () => {
    if (!currentPlan) return;
    setIsRefreshing(true);
    setError(null);
    try {
      const refreshed = await aiService.refreshTripPlan(currentPlan.reference);
      setCurrentPlan(refreshed);
      setUserPlans((prev) => prev.map((p) => p.reference === refreshed.reference ? refreshed : p));
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Échec de l’actualisation des tarifs.';
      setError(msg);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatCurrency = (amount?: number | null, currency = 'MAD') => {
    if (amount === undefined || amount === null) return 'Non chiffré';
    return `${Number(amount).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Hero */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-700 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-700/80 text-emerald-100 border border-emerald-500/30">
              <span>⚡</span> Intelligence Artificielle & Données Réelles
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Planificateur de Voyage Sur Mesure
            </h1>
            <p className="text-emerald-100 text-sm sm:text-base leading-relaxed">
              Indiquez vos dates, votre destination et votre budget. Yuding orchestre vols vérifiés, hôtels disponibles, activités personnalisées et météo locale dans le respect strict de votre enveloppe budgétaire.
            </p>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-80 h-80 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Existing plans bar if authenticated */}
        {isAuthenticated && userPlans.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">📂</span>
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Vos itinéraires enregistrés</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Consultez ou reprenez un projet précédent</p>
              </div>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0">
              {userPlans.slice(0, 4).map((p) => (
                <button
                  key={p.reference}
                  type="button"
                  onClick={() => setCurrentPlan(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                    currentPlan?.reference === p.reference
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.destination} ({p.reference})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Grid: Form (left) + Result / Overview (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Planner Form */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Paramètres du Voyage</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Configurez votre projet en quelques clics</p>
            </div>

            <form onSubmit={handleGeneratePlan} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ville de départ
                  </label>
                  <input
                    type="text"
                    required
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="Ex: Casablanca"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Destination
                  </label>
                  <input
                    type="text"
                    required
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Ex: Paris"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date de départ
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date de retour
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Budget total
                  </label>
                  <div className="flex">
                    <input
                      type="number"
                      required
                      min="100"
                      step="50"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-l-xl border border-r-0 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <select
                      value={budgetCurrency}
                      onChange={(e) => setBudgetCurrency(e.target.value)}
                      className="px-2 py-2 text-xs font-semibold rounded-r-xl border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    >
                      <option value="MAD">MAD</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Voyageurs
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={travelers}
                    onChange={(e) => setTravelers(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Préférences & Centres d’intérêt
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PREFERENCE_OPTIONS.map((pref) => {
                    const isSelected = selectedPreferences.includes(pref.id);
                    return (
                      <button
                        key={pref.id}
                        type="button"
                        onClick={() => togglePreference(pref.id)}
                        className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium border text-left transition-all ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-400 dark:border-emerald-600 font-semibold'
                            : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <span>{pref.icon}</span>
                        <span>{pref.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Rythme souhaité
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'relaxed', label: 'Relaxé' },
                    { value: 'moderate', label: 'Équilibré' },
                    { value: 'fast', label: 'Intense' },
                  ].map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPace(p.value)}
                      className={`py-1.5 px-3 rounded-lg text-xs font-medium border text-center transition-all ${
                        pace === p.value
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400">
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-4 py-3 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 text-white font-semibold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Orchestration en temps réel…</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Générer mon itinéraire chiffré</span>
                  </>
                )}
              </button>
            </form>

            {!isAuthenticated && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between">
                <span>Connectez-vous pour générer et enregistrer vos plans.</span>
                <Link href="/login" className="underline font-bold">Connexion</Link>
              </div>
            )}
          </div>

          {/* Results View */}
          <div className="lg:col-span-7 space-y-6">
            {!currentPlan ? (
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-dashed border-slate-300 dark:border-slate-700 space-y-4">
                <span className="text-5xl">🗺️</span>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Aucun itinéraire affiché</h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Remplissez le formulaire de gauche ou sélectionnez un de vos voyages sauvegardés pour explorer le détail chiffré jour par jour.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Plan Reference & Status Banner */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                          {currentPlan.reference}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                            currentPlan.budgetStatus === 'WITHIN_BUDGET'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : currentPlan.budgetStatus === 'OVER_BUDGET'
                              ? 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                          }`}
                        >
                          {currentPlan.budgetStatus === 'WITHIN_BUDGET'
                            ? '✅ Dans le budget'
                            : currentPlan.budgetStatus === 'OVER_BUDGET'
                            ? '⚠️ Dépassement de budget'
                            : 'ℹ️ Partiellement chiffré'}
                        </span>
                      </div>
                      <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                        {currentPlan.title}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      {isAuthenticated && (
                        <button
                          type="button"
                          disabled={isSavingTrip}
                          onClick={handleToggleSaveTrip}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                            isTripSaved
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                              : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <i className={isTripSaved ? 'fas fa-bookmark text-emerald-600' : 'far fa-bookmark'} aria-hidden="true" />
                          <span>{isTripSaved ? 'Voyage enregistré' : 'Enregistrer le voyage'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isRefreshing}
                        onClick={handleRefreshPlan}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <span className={isRefreshing ? 'animate-spin' : ''}>🔄</span>
                        <span>{isRefreshing ? 'Actualisation…' : 'Actualiser tarifs'}</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                    {currentPlan.summary}
                  </p>

                  {/* Financial Metrics Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Budget Alloué</p>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                        {formatCurrency(currentPlan.budget, currentPlan.budgetCurrency)}
                      </p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Chiffré</p>
                      <p className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5">
                        {formatCurrency(currentPlan.pricedTotal, currentPlan.budgetCurrency)}
                      </p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Solde Restant</p>
                      <p className={`text-sm font-extrabold mt-0.5 ${currentPlan.remainingBudget >= 0 ? 'text-slate-900 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(currentPlan.remainingBudget, currentPlan.budgetCurrency)}
                      </p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Non Chiffrés</p>
                      <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300 mt-0.5">
                        {currentPlan.unpricedItemsCount} élément(s)
                      </p>
                    </div>
                  </div>

                  {currentPlan.weatherSummary && (
                    <div className="p-3 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-2xl flex items-center gap-3">
                      <span className="text-xl">🌤️</span>
                      <p className="text-xs text-sky-900 dark:text-sky-200">{currentPlan.weatherSummary}</p>
                    </div>
                  )}

                  {currentPlan.warnings && currentPlan.warnings.length > 0 && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-1">
                      {currentPlan.warnings.map((w, idx) => (
                        <p key={idx} className="text-xs text-amber-800 dark:text-amber-200">⚠️ {w}</p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tabs: Itinerary | Transport & Logement */}
                <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('itinerary')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                      activeTab === 'itinerary'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    📅 Itinéraire Jour par Jour ({currentPlan.days?.length || 0} jours)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('details')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                      activeTab === 'details'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    ✈️ Vols & Hébergement
                  </button>
                </div>

                {/* TAB 1: Daily Timeline */}
                {activeTab === 'itinerary' && (
                  <div className="space-y-4">
                    {currentPlan.days?.map((day) => (
                      <div
                        key={day.dayNumber}
                        className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs flex items-center justify-center">
                              J{day.dayNumber}
                            </span>
                            <div>
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                {day.theme || `Jour ${day.dayNumber}`}
                              </h4>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">{day.date}</p>
                            </div>
                          </div>
                          {day.weatherForecast && (
                            <span className="text-xs bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 px-2.5 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
                              🌤️ {day.weatherForecast}
                            </span>
                          )}
                        </div>

                        {/* Activities Slot Timeline */}
                        <div className="space-y-2 text-xs">
                          {day.morning && day.morning.length > 0 && (
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 flex items-start gap-2.5">
                              <span className="font-bold text-slate-500 dark:text-slate-400 w-16 flex-none">Matin :</span>
                              <div className="flex-1">
                                {day.morning.map((m, i) => (
                                  <div key={i} className="flex justify-between items-center">
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{m.title}</span>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                      {m.price ? formatCurrency(m.price, m.currency) : 'Inclus / Libre'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {day.afternoon && day.afternoon.length > 0 && (
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 flex items-start gap-2.5">
                              <span className="font-bold text-slate-500 dark:text-slate-400 w-16 flex-none">Après-midi :</span>
                              <div className="flex-1">
                                {day.afternoon.map((a, i) => (
                                  <div key={i} className="flex justify-between items-center">
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{a.title}</span>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                      {a.price ? formatCurrency(a.price, a.currency) : 'Inclus / Libre'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {day.evening && day.evening.length > 0 && (
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 flex items-start gap-2.5">
                              <span className="font-bold text-slate-500 dark:text-slate-400 w-16 flex-none">Soirée :</span>
                              <div className="flex-1">
                                {day.evening.map((e, i) => (
                                  <div key={i} className="flex justify-between items-center">
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{e.title}</span>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                      {e.price ? formatCurrency(e.price, e.currency) : 'Inclus / Libre'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* TAB 2: Transport & Hotel Details */}
                {activeTab === 'details' && (
                  <div className="space-y-4">
                    {/* Flight Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">✈️</span>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Vol sélectionné</h4>
                        </div>
                        {currentPlan.flight?.price && (
                          <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">
                            {formatCurrency(currentPlan.flight.price, currentPlan.flight.currency)} / voyageur
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                        {currentPlan.flight?.title || 'Aucun vol direct associé.'}
                      </p>
                      {currentPlan.flight?.offerReference && (
                        <p className="text-[11px] text-slate-400 font-mono">
                          Réf. offre : {currentPlan.flight.offerReference} ({currentPlan.flight.provider})
                        </p>
                      )}
                    </div>

                    {/* Hotel Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🏨</span>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Hébergement sélectionné</h4>
                        </div>
                        {currentPlan.hotel?.price && (
                          <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">
                            {formatCurrency(currentPlan.hotel.price, currentPlan.hotel.currency)} / nuit
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                        {currentPlan.hotel?.title || 'Aucun hébergement sélectionné.'}
                      </p>
                      {currentPlan.hotel?.offerReference && (
                        <p className="text-[11px] text-slate-400 font-mono">
                          Réf. hébergement : {currentPlan.hotel.offerReference} ({currentPlan.hotel.provider})
                        </p>
                      )}
                    </div>

                    {/* Transfer Card */}
                    {currentPlan.transfer && (
                      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">🚕</span>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Transfert</h4>
                          </div>
                          {currentPlan.transfer.price && (
                            <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">
                              {formatCurrency(currentPlan.transfer.price, currentPlan.transfer.currency)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                          {currentPlan.transfer.title}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Sources & Knowledge Citations */}
                {currentPlan.sources && currentPlan.sources.length > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-2">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span>📚</span> Sources et guides officiels Yuding consultés
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {currentPlan.sources.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 text-[11px] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
                        >
                          {s.title} {s.section && `— ${s.section}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Disclaimer */}
                <p className="text-[11px] text-slate-400 text-center leading-normal">
                  Ce plan de voyage est un instantané d’aide à la planification. Les tarifs et disponibilités sont issus de fournisseurs réels mais restent indicatifs jusqu’à validation sur les pages de réservation officielles Yuding.
                </p>

              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
