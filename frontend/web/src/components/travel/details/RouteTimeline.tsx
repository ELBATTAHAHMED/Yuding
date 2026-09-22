import React from 'react';

export interface TimelineSegment {
  origin: string;
  originDetail?: string; // e.g. "Aéroport Mohammed V (CMN)" or "Gare Casa-Port"
  departureTime?: string;
  destination: string;
  destinationDetail?: string;
  arrivalTime?: string;
  durationLabel?: string;
  carrierName?: string;
  carrierCode?: string;
  flightOrTrainNumber?: string;
  mode?: string;
  layoverAfter?: string; // e.g. "Escale 1h 45m à Madrid (MAD)" or "Correspondance 25m à Rabat"
  stopsCount?: number;
  intermediateStops?: { stationName: string; departureTime?: string }[];
}

export interface RouteTimelineProps {
  title?: string;
  segments: TimelineSegment[];
}

export const RouteTimeline: React.FC<RouteTimelineProps> = ({
  title = 'Itinéraire & Horaires',
  segments = [],
}) => {
  if (!segments || segments.length === 0) return null;

  return (
    <div className="bg-white dark:bg-[#062523] rounded-xl p-5 md:p-6 border border-slate-200 dark:border-[#01796F]/30 shadow-md">
      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-5">
        {title}
      </h3>

      <div className="flex flex-col gap-5">
        {segments.map((seg, idx) => (
          <div key={idx} className="flex flex-col gap-3">
            {/* Segment Card */}
            <div className="bg-slate-50 dark:bg-[#021817] rounded-xl p-4 md:p-5 border border-slate-200 dark:border-[#01796F]/20">
              {/* Carrier & Mode Bar */}
              {(seg.carrierName || seg.flightOrTrainNumber || seg.mode) && (
                <div className="flex justify-between items-center mb-3.5 flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#01796F] dark:text-[#02E0D5]">
                    <i className="fas fa-route" />
                    <span>{seg.carrierName || seg.mode || 'Trajet'}</span>
                    {seg.flightOrTrainNumber && (
                      <span className="text-slate-500 dark:text-slate-400 font-semibold">• N° {seg.flightOrTrainNumber}</span>
                    )}
                  </div>

                  {seg.durationLabel && (
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold bg-white dark:bg-[#062523] px-2 py-0.5 rounded border border-slate-200 dark:border-[#01796F]/30 flex items-center gap-1">
                      <i className="fas fa-clock text-slate-400" />
                      {seg.durationLabel}
                    </span>
                  )}
                </div>
              )}

              {/* Departure & Arrival Points */}
              <div className="flex flex-col gap-4 relative">
                {/* Departure node */}
                <div className="flex items-start gap-3.5">
                  <div className="w-3 h-3 rounded-full bg-[#01796F] dark:bg-[#02E0D5] mt-1 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2.5">
                      <span className="font-extrabold text-base text-slate-900 dark:text-white">
                        {seg.departureTime || '—'}
                      </span>
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                        {seg.origin}
                      </span>
                    </div>
                    {seg.originDetail && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {seg.originDetail}
                      </div>
                    )}
                  </div>
                </div>

                {/* Vertical connecting line */}
                <div className="absolute top-4 bottom-4 left-[5px] w-0.5 bg-slate-300 dark:bg-[#01796F]/40" />

                {/* Arrival node */}
                <div className="flex items-start gap-3.5">
                  <div className="w-3 h-3 rounded-full bg-[#01796F] dark:bg-[#02E0D5] mt-1 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2.5">
                      <span className="font-extrabold text-base text-slate-900 dark:text-white">
                        {seg.arrivalTime || '—'}
                      </span>
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                        {seg.destination}
                      </span>
                    </div>
                    {seg.destinationDetail && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {seg.destinationDetail}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Intermediate stops list if present */}
              {seg.intermediateStops && seg.intermediateStops.length > 0 && (
                <div className="mt-3.5 pt-3 border-t border-dashed border-slate-200 dark:border-[#01796F]/20 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Arrêts intermédiaires ({seg.intermediateStops.length}) : </span>
                  {seg.intermediateStops.map((st, sIdx) => (
                    <span key={sIdx}>
                      {st.stationName}{st.departureTime ? ` (${st.departureTime})` : ''}
                      {sIdx < seg.intermediateStops!.length - 1 ? ' → ' : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Layover / Connection Banner (between segments) */}
            {seg.layoverAfter && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg p-3 flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-200">
                <i className="fas fa-hourglass-half text-amber-500" />
                <span>{seg.layoverAfter}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
