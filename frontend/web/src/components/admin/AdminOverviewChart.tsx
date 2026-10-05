'use client';

import React, { useState, useId } from 'react';

export interface DataPoint {
  label: string;
  volume: number; // booking count
  volumePrev?: number;
  revenue: number; // net MAD
  revenuePrev?: number;
}

interface AdminOverviewChartProps {
  data?: DataPoint[];
  isLoading?: boolean;
}

const DEFAULT_CHART_DATA: DataPoint[] = [
  { label: 'Lun', volume: 18, volumePrev: 14, revenue: 24500, revenuePrev: 19800 },
  { label: 'Mar', volume: 24, volumePrev: 19, revenue: 38200, revenuePrev: 28400 },
  { label: 'Mer', volume: 31, volumePrev: 22, revenue: 47900, revenuePrev: 32100 },
  { label: 'Jeu', volume: 28, volumePrev: 25, revenue: 41300, revenuePrev: 36700 },
  { label: 'Ven', volume: 45, volumePrev: 34, revenue: 69400, revenuePrev: 51200 },
  { label: 'Sam', volume: 52, volumePrev: 41, revenue: 84100, revenuePrev: 63800 },
  { label: 'Dim', volume: 39, volumePrev: 30, revenue: 58600, revenuePrev: 45900 },
];

export function AdminOverviewChart({
  data = DEFAULT_CHART_DATA,
  isLoading = false,
}: AdminOverviewChartProps) {
  const [metric, setMetric] = useState<'volume' | 'revenue'>('revenue');
  const [timeframe, setTimeframe] = useState<'7d' | '30d'>('7d');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const chartId = useId();

  const isRevenue = metric === 'revenue';
  const values = data.map((d) => (isRevenue ? d.revenue : d.volume));
  const prevValues = data.map((d) => (isRevenue ? d.revenuePrev || 0 : d.volumePrev || 0));

  const maxVal = Math.max(...values, ...prevValues, 1);
  const chartHeight = 180;
  const chartWidth = 540;
  const paddingX = 30;
  const paddingY = 24;

  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * (chartWidth - paddingX * 2);
    const val = isRevenue ? d.revenue : d.volume;
    const y = chartHeight - paddingY - (val / maxVal) * (chartHeight - paddingY * 2);
    return { x, y, ...d };
  });

  const prevPoints = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * (chartWidth - paddingX * 2);
    const val = isRevenue ? d.revenuePrev || 0 : d.volumePrev || 0;
    const y = chartHeight - paddingY - (val / maxVal) * (chartHeight - paddingY * 2);
    return { x, y };
  });

  const currentPath = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const prevPath = prevPoints.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const currentArea = `${currentPath} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`;

  // Total summary calculation
  const totalCurrent = values.reduce((a, b) => a + b, 0);
  const totalPrev = prevValues.reduce((a, b) => a + b, 0);
  const growthPercent = totalPrev > 0 ? Math.round(((totalCurrent - totalPrev) / totalPrev) * 100) : 0;

  return (
    <div className="admin-concentric-card bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-2xs">
      {/* Chart Topbar with Metric Switcher and Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Activité Opérationnelle
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
              +{growthPercent}% vs S-1
            </span>
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-slate-100 admin-mono-tabular mt-0.5">
            {isRevenue ? `${totalCurrent.toLocaleString('fr-FR')} MAD` : `${totalCurrent} dossiers`}
            <span className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-1.5">
              enregistrés (7j)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Metric Toggle */}
          <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200/60 dark:border-slate-700/60 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMetric('revenue')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                isRevenue
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Volume Net (MAD)
            </button>
            <button
              type="button"
              onClick={() => setMetric('volume')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                !isRevenue
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Réservations
            </button>
          </div>

          {/* Timeframe switch */}
          <div className="hidden sm:inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200/60 dark:border-slate-700/60 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <button
              type="button"
              onClick={() => setTimeframe('7d')}
              className={`px-2 py-1 rounded ${
                timeframe === '7d' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-bold' : ''
              }`}
            >
              7J
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('30d')}
              className={`px-2 py-1 rounded ${
                timeframe === '30d' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-bold' : ''
              }`}
            >
              30J
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative pt-3">
        {isLoading ? (
          <div className="w-full h-44 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse flex items-center justify-center text-xs text-slate-400">
            Synchronisation des flux télémétriques...
          </div>
        ) : (
          <div className="w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-44 select-none overflow-visible"
            >
              <defs>
                <linearGradient id={`${chartId}-gradient`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00D4AA" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#00D4AA" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Gridlines */}
              {[0.25, 0.5, 0.75, 1.0].map((ratio) => {
                const y = chartHeight - paddingY - ratio * (chartHeight - paddingY * 2);
                return (
                  <line
                    key={ratio}
                    x1={paddingX}
                    y1={y}
                    x2={chartWidth - paddingX}
                    y2={y}
                    stroke="currentColor"
                    className="text-slate-100 dark:text-slate-800"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Baseline */}
              <line
                x1={paddingX}
                y1={chartHeight - paddingY}
                x2={chartWidth - paddingX}
                y2={chartHeight - paddingY}
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-700"
                strokeWidth="1"
              />

              {/* Previous period line (dotted neutral) */}
              <path
                d={prevPath}
                fill="none"
                stroke="currentColor"
                className="text-slate-300 dark:text-slate-600"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />

              {/* Current area fill */}
              <path d={currentArea} fill={`url(#${chartId}-gradient)`} />

              {/* Current period line */}
              <path
                d={currentPath}
                fill="none"
                stroke="#00D4AA"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Interactive points & hover detection */}
              {points.map((p, i) => (
                <g key={i}>
                  {/* Invisible hit column */}
                  <rect
                    x={p.x - 20}
                    y={0}
                    width={40}
                    height={chartHeight}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoverIndex(i)}
                    onMouseLeave={() => setHoverIndex(null)}
                  />

                  {/* Dot */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={hoverIndex === i ? 5 : 3}
                    className="transition-all duration-150"
                    fill={hoverIndex === i ? '#00D4AA' : '#FFFFFF'}
                    stroke="#00D4AA"
                    strokeWidth={hoverIndex === i ? 3 : 2}
                  />

                  {/* X-axis label */}
                  <text
                    x={p.x}
                    y={chartHeight - 6}
                    textAnchor="middle"
                    className="text-[10px] font-semibold fill-slate-400 dark:fill-slate-500"
                  >
                    {p.label}
                  </text>
                </g>
              ))}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoverIndex !== null && points[hoverIndex] && (
              <div
                className="absolute top-1 pointer-events-none transform -translate-x-1/2 bg-slate-900 text-white text-xs py-1 px-2.5 rounded-lg shadow-lg border border-slate-700 z-10 admin-mono-tabular"
                style={{
                  left: `${(points[hoverIndex].x / chartWidth) * 100}%`,
                }}
              >
                <div className="font-bold text-[11px] text-slate-300">
                  {points[hoverIndex].label}
                </div>
                <div className="text-emerald-400 font-extrabold text-xs">
                  {isRevenue
                    ? `${points[hoverIndex].revenue.toLocaleString('fr-FR')} MAD`
                    : `${points[hoverIndex].volume} réservations`}
                </div>
                <div className="text-[10px] text-slate-400">
                  Semaine préc: {isRevenue
                    ? `${(points[hoverIndex].revenuePrev || 0).toLocaleString('fr-FR')} MAD`
                    : `${points[hoverIndex].volumePrev || 0} rés.`}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend & Indicator */}
      <div className="flex items-center justify-between text-[11px] pt-2 text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-[#00D4AA] rounded-full" />
            <span>Période courante</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-slate-300 dark:bg-slate-600 rounded-full border-t border-dotted" />
            <span>Semaine précédente</span>
          </div>
        </div>
        <span className="hidden sm:inline admin-mono-tabular">
          Fréquence: Temps réel (Passerelle 8888)
        </span>
      </div>
    </div>
  );
}
