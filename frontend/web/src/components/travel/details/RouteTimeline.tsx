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
    <div className="travel-details-card travel-route-timeline">
      <h3 className="travel-details-card__title text-base font-bold mb-5">
        {title}
      </h3>

      <div className="flex flex-col gap-5">
        {segments.map((seg, idx) => (
          <div key={idx} className="flex flex-col gap-3">
            {/* Segment Card */}
            <div className="travel-route-segment rounded-xl p-4 md:p-5">
              {/* Carrier & Mode Bar */}
              {(seg.carrierName || seg.flightOrTrainNumber || seg.mode) && (
                <div className="travel-route-segment__meta flex justify-between items-center mb-3.5 flex-wrap gap-2">
                  <div className="travel-route-segment__carrier flex items-center gap-2 text-xs font-bold">
                    <i className="fas fa-route" />
                    <span>{seg.carrierName || seg.mode || 'Trajet'}</span>
                    {seg.flightOrTrainNumber && (
                    <span className="travel-route-segment__number font-semibold">• N° {seg.flightOrTrainNumber}</span>
                    )}
                  </div>

                  {seg.durationLabel && (
                    <span className="travel-route-segment__duration text-xs font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                      <i className="fas fa-clock" />
                      {seg.durationLabel}
                    </span>
                  )}
                </div>
              )}

              {/* Departure & Arrival Points */}
              <div className="flex flex-col gap-4 relative">
                {/* Departure node */}
                <div className="flex items-start gap-3.5">
                  <div className="travel-route-point__node w-3 h-3 rounded-full mt-1 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2.5">
                      <span className="travel-route-point__time font-extrabold text-base">
                        {seg.departureTime || '—'}
                      </span>
                      <span className="travel-route-point__name font-bold text-sm">
                        {seg.origin}
                      </span>
                    </div>
                    {seg.originDetail && (
                      <div className="travel-route-point__detail text-xs mt-0.5">
                        {seg.originDetail}
                      </div>
                    )}
                  </div>
                </div>

                {/* Vertical connecting line */}
                <div className="travel-route-point-line absolute top-4 bottom-4 left-[5px] w-0.5" />

                {/* Arrival node */}
                <div className="flex items-start gap-3.5">
                  <div className="travel-route-point__node w-3 h-3 rounded-full mt-1 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2.5">
                      <span className="travel-route-point__time font-extrabold text-base">
                        {seg.arrivalTime || '—'}
                      </span>
                      <span className="travel-route-point__name font-bold text-sm">
                        {seg.destination}
                      </span>
                    </div>
                    {seg.destinationDetail && (
                      <div className="travel-route-point__detail text-xs mt-0.5">
                        {seg.destinationDetail}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Intermediate stops list if present */}
              {seg.intermediateStops && seg.intermediateStops.length > 0 && (
                <div className="travel-route-stops mt-3.5 pt-3 text-xs">
                  <span className="font-semibold">Arrêts intermédiaires ({seg.intermediateStops.length}) : </span>
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
              <div className="travel-route-layover rounded-lg p-3 flex items-center gap-2 text-xs font-semibold">
                <i className="fas fa-hourglass-half" />
                <span>{seg.layoverAfter}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
