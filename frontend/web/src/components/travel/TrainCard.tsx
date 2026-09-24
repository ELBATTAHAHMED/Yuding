'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { TrainOffer, TrainLeg } from '@/types/travel.types';

export interface TrainCardProps {
  offer: TrainOffer;
}

export const TrainCard: React.FC<TrainCardProps> = ({ offer }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [selected, setSelected] = useState(false);

  const getProductColor = (product?: string) => {
    const p = (product || '').toUpperCase();
    if (p.includes('BORAQ') || p.includes('TGV') || p.includes('AVE') || p.includes('ICE') || p.includes('HIGHSPEED')) {
      return { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' };
    }
    if (p.includes('ATLAS') || p.includes('INTERCIT') || p.includes('LONG_DISTANCE')) {
      return { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' };
    }
    if (p.includes('TNR') || p.includes('REGIONAL')) {
      return { bg: '#dcfce7', text: '#15803d', border: '#86efac' };
    }
    return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
  };

  const badgeStyle = getProductColor(offer.productType);

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '--:--';
    if (timeStr.length >= 5) {
      return timeStr.substring(0, 5);
    }
    return timeStr;
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  };

  const isTransitous = offer.provider === 'TRANSITOUS';
  const hasTransfers = (offer.numberOfTransfers ?? 0) > 0;

  const renderModeIcon = (mode?: string) => {
    if (!mode) return <i className="fas fa-train text-[#01796F] dark:text-[#02E0D5]" />;
    switch (mode.toUpperCase()) {
      case 'WALK':
        return <i className="fas fa-walking text-slate-400" />;
      case 'SUBWAY':
        return <i className="fas fa-subway text-teal-500" />;
      case 'TRAM':
        return <i className="fas fa-tram text-emerald-500" />;
      default:
        return <i className="fas fa-train text-[#01796F] dark:text-[#02E0D5]" />;
    }
  };

  return (
    <div
      className={`bg-white dark:bg-[#062523] rounded-2xl p-5 shadow-sm flex flex-col gap-4 transition-[border-color,box-shadow] text-slate-900 dark:text-slate-100 ${
        selected
          ? 'border-2 border-[#02E0D5] shadow-lg shadow-[#02E0D5]/10'
          : 'border border-slate-200 dark:border-[#01796F]/30 hover:border-[#01796F]/50'
      }`}
    >
      {/* Header bar: Product badge + Operator + Source Badge */}
      <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-100 dark:border-[#01796F]/20 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: badgeStyle.bg,
              color: badgeStyle.text,
              border: `1px solid ${badgeStyle.border}`,
            }}
          >
            {offer.productType || 'TRAIN'}
          </span>

          {offer.trainNumber && (
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              N° {offer.trainNumber}
            </span>
          )}

          {offer.operator && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              · {offer.operator}
            </span>
          )}
        </div>

        {/* Source provenance badge */}
        <div>
          {isTransitous ? (
            <span
              className="text-[11px] text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/40 px-2 py-0.5 rounded font-semibold flex items-center gap-1"
              title="Données horaires mondiales Transitous (NeTEx / GTFS)"
            >
              <i className="fas fa-globe-europe text-teal-600 dark:text-teal-400" />
              Transitous Global
            </span>
          ) : (
            <span
              className="text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 px-2 py-0.5 rounded font-semibold flex items-center gap-1"
              title="Données horaires ONCF vérifiées"
            >
              <i className="fas fa-database text-emerald-600 dark:text-emerald-400" />
              GTFS communautaire ONCF
            </span>
          )}
        </div>
      </div>

      {/* Main schedule layout: Origin -> Duration / Transfers -> Destination */}
      <div className="grid grid-cols-1 items-center gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(235px,.38fr)]">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(105px,.8fr)_minmax(0,1fr)] items-center gap-3 rounded-xl bg-slate-50/70 px-3 py-4 dark:bg-[#0a302d]/60">
        {/* Origin */}
        <div className="min-w-0">
          <div className="text-xl font-extrabold tabular-nums text-slate-900 dark:text-white">
            {formatTime(offer.departureTime)}
          </div>
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {offer.originStation}
          </div>
          <div className="text-[11px] text-slate-400">Départ prévu</div>
        </div>

        {/* Journey Duration & Route Indicator */}
        <div className="flex min-w-0 flex-col items-center">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            {formatDuration(offer.durationMinutes) || 'Direct'}
          </span>
          <div className="w-full max-w-[180px] h-0.5 bg-slate-300 dark:bg-[#01796F]/40 relative flex items-center justify-between">
            <div className="w-2 h-2 rounded-full bg-[#01796F] dark:bg-[#02E0D5]" />
            <div className="bg-[#01796F]/10 dark:bg-[#01796F]/30 px-1.5 py-0.5 rounded-full flex items-center gap-1">
              <i className="fas fa-train text-[10px] text-[#01796F] dark:text-[#02E0D5]" />
            </div>
            <div className="w-2 h-2 rounded-full bg-[#01796F] dark:bg-[#02E0D5]" />
          </div>
          <span
            className={`text-[11px] font-semibold mt-1 ${
              hasTransfers ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {hasTransfers
              ? `${offer.numberOfTransfers} correspondance${offer.numberOfTransfers! > 1 ? 's' : ''}`
              : 'Direct'}
          </span>
        </div>

        {/* Destination */}
        <div className="min-w-0 text-right">
          <div className="text-xl font-extrabold tabular-nums text-slate-900 dark:text-white">
            {formatTime(offer.arrivalTime)}
          </div>
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {offer.destinationStation}
          </div>
          <div className="text-[11px] text-slate-400">Arrivée prévue</div>
        </div>
        </div>

        {/* Pricing & Selection */}
        <div className="flex min-w-0 flex-col gap-3 border-t border-slate-100 pt-4 lg:border-l lg:border-t-0 lg:py-1 lg:pl-5 dark:border-[#01796F]/25">
          <div className="text-xs leading-relaxed text-slate-500 lg:text-right dark:text-slate-400">
            Tarif non disponible via cette source
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/trains/${encodeURIComponent(offer.offerId)}`}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#01796F]/50 bg-[#01796F]/10 px-2 text-center text-xs font-bold text-[#01796F] transition-colors hover:bg-[#01796F]/20 dark:border-[#02E0D5]/50 dark:bg-[#02E0D5]/10 dark:text-[#02E0D5]"
            >
              Détails
            </Link>

            <button
              type="button"
              onClick={() => setSelected((prev) => !prev)}
              className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-center text-xs font-bold text-white shadow-sm transition-colors ${
                selected ? 'bg-emerald-600' : 'bg-[#01796F] hover:bg-[#015f57]'
              }`}
              title="Mémoriser ce trajet pour votre itinéraire Yuding"
            >
              {selected ? (
                <>
                  <i className="fas fa-check-circle" />
                  <span>Sélectionné</span>
                </>
              ) : (
                <>
                  <i className="fas fa-hand-pointer" />
                  <span>Choisir</span>
                </>
              )}
            </button>
          </div>

          {offer.officialScheduleUrl && (
            <a
              href={offer.officialScheduleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-2 text-[11px] font-medium text-slate-700 transition-colors hover:text-[#01796F] dark:border-[#01796F]/30 dark:bg-[#0a302d] dark:text-slate-300 dark:hover:text-[#02E0D5]"
            >
              <span>Vérifier sur le site officiel</span>
              <i className="fas fa-external-link-alt text-[9px]" />
            </a>
          )}
        </div>
      </div>

      {/* Expandable journey details (legs and intermediate stops) */}
      {((offer.legs && offer.legs.length > 0) || (offer.intermediateStops && offer.intermediateStops.length > 0)) && (
        <div>
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs font-semibold text-[#01796F] dark:text-[#02E0D5] flex items-center gap-1 hover:underline p-0 bg-transparent border-none cursor-pointer"
          >
            <span>
              {showDetails
                ? 'Masquer les détails du trajet'
                : hasTransfers
                ? `Voir les ${offer.legs?.length || 2} étapes du trajet`
                : `Voir le parcours (${offer.intermediateStops?.length || 0} gares)`}
            </span>
            <i className={`fas fa-chevron-${showDetails ? 'up' : 'down'} text-[10px]`} />
          </button>

          {showDetails && (
            <div className="mt-2 p-3 bg-slate-50 dark:bg-[#021817] rounded-lg border border-slate-200 dark:border-[#01796F]/30 flex flex-col gap-2">
              {/* If structured multi-leg journey */}
              {offer.legs && offer.legs.length > 0 ? (
                <div>
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Étapes de l&apos;itinéraire :
                  </div>
                  <div className="flex flex-col gap-2">
                    {offer.legs.map((leg: TrainLeg, idx: number) => (
                      <div
                        key={idx}
                        className="bg-white dark:bg-[#062523] rounded-lg border border-slate-200 dark:border-[#01796F]/20 p-2.5 flex flex-col gap-1 text-xs"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                            {renderModeIcon(leg.mode)}
                            <span>{leg.serviceName || leg.mode}</span>
                            {leg.operator && <span className="text-slate-400 font-normal">({leg.operator})</span>}
                          </div>
                          {leg.durationMinutes && (
                            <span className="text-[11px] text-slate-400">
                              {formatDuration(leg.durationMinutes)}
                            </span>
                          )}
                        </div>

                        <div className="text-slate-600 dark:text-slate-300 flex justify-between">
                          <span>{leg.origin} ({formatTime(leg.departureTime)})</span>
                          <span>→</span>
                          <span>{leg.destination} ({formatTime(leg.arrivalTime)})</span>
                        </div>

                        {leg.intermediateStops && leg.intermediateStops.length > 0 && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {leg.intermediateStops.length} arrêt(s) intermédiaire(s)
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Standard intermediate stops list for single train */
                <div>
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Gares desservies sur ce trajet :
                  </div>
                  <ul className="m-0 pl-4 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                    {offer.intermediateStops?.map((st, idx) => (
                      <li key={idx}>
                        <strong>{st.stationName}</strong>
                        {st.departureTime && (
                          <span className="text-slate-400 ml-1.5">
                            (Départ: {formatTime(st.departureTime)})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
