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
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-xs">
      {/* Chart Topbar with Metric Switcher and Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Flux en Temps Réel
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
              +{growthPercent}% vs S-1
            </span>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100 admin-mono-tabular mt-0.5">
            {isRevenue ? `${totalCurrent.toLocaleString('fr-FR')} MAD` : `${totalCurrent} dossiers`}
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 ml-2">
              volume consolidé
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Metric Toggle */}
          <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMetric('revenue')}
              className={`px-3 py-1 rounded-lg transition-all ${
                isRevenue
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Volume MAD
            </button>
            <button
              type="button"
              onClick={() => setMetric('volume')}
              className={`px-3 py-1 rounded-lg transition-all ${
                !isRevenue
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Réservations
            </button>
          </div>

          {/* Timeframe switch */}
          <div className="hidden sm:inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <button
              type="button"
              onClick={() => setTimeframe('7d')}
              className={`px-2.5 py-1 rounded-lg ${
                timeframe === '7d' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-bold' : ''
              }`}
            >
              7J
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('30d')}
              className={`px-2.5 py-1 rounded-lg ${
                timeframe === '30d' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-bold' : ''
              }`}
            >
              30J
            </button>
          </div>
        </div>
      </div>

      {/* SVG Multi-Bar Comparison Chart Area (Inspired by Real-Time Sale in Reference) */}
      <div className="relative pt-4">
        {isLoading ? (
          <div className="w-full h-48 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse flex items-center justify-center text-xs text-slate-400">
            Synchronisation des métriques en temps réel...
          </div>
        ) : (
          <div className="w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-48 select-none overflow-visible"
            >
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

              {/* Multi-Bar Groups for each day (Triple bar: Black, Blue, Tan like Reference) */}
              {data.map((d, i) => {
                const groupX = paddingX + (i / (data.length - 1)) * (chartWidth - paddingX * 2);
                const currentVal = isRevenue ? d.revenue : d.volume;
                const prevVal = isRevenue ? d.revenuePrev || 0 : d.volumePrev || 0;
                const estVal = Math.round(currentVal * 0.75);

                const currentH = (currentVal / maxVal) * (chartHeight - paddingY * 2);
                const prevH = (prevVal / maxVal) * (chartHeight - paddingY * 2);
                const estH = (estVal / maxVal) * (chartHeight - paddingY * 2);

                const baseY = chartHeight - paddingY;
                const barWidth = 4.5;
                const gap = 3;

                return (
                  <g
                    key={i}
                    className="cursor-pointer group"
                    onMouseEnter={() => setHoverIndex(i)}
                    onMouseLeave={() => setHoverIndex(null)}
                  >
                    {/* Invisible hit column */}
                    <rect
                      x={groupX - 20}
                      y={0}
                      width={40}
                      height={chartHeight}
                      fill="transparent"
                    />

                    {/* Bar 1: Deep Navy/Black (Primary Current) */}
                    <rect
                      x={groupX - barWidth - gap}
                      y={baseY - currentH}
                      width={barWidth}
                      height={currentH}
                      rx={2}
                      className="fill-slate-900 dark:fill-white transition-opacity group-hover:opacity-80"
                    />

                    {/* Bar 2: Soft Blue (Previous Cycle) */}
                    <rect
                      x={groupX}
                      y={baseY - prevH}
                      width={barWidth}
                      height={prevH}
                      rx={2}
                      className="fill-[#A5C9FF] dark:fill-[#3B82F6] transition-opacity group-hover:opacity-80"
                    />

                    {/* Bar 3: Soft Sand / Peach (Estimate / Baseline) */}
                    <rect
                      x={groupX + barWidth + gap}
                      y={baseY - estH}
                      width={barWidth}
                      height={estH}
                      rx={2}
                      className="fill-[#F6D0B5] dark:fill-[#F59E0B] transition-opacity group-hover:opacity-80"
                    />

                    {/* Day label */}
                    <text
                      x={groupX}
                      y={chartHeight - 6}
                      textAnchor="middle"
                      className="text-[10px] font-semibold fill-slate-400 dark:fill-slate-500"
                    >
                      {d.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoverIndex !== null && data[hoverIndex] && (
              <div
                className="absolute top-2 pointer-events-none transform -translate-x-1/2 bg-slate-900 text-white text-xs py-1.5 px-3 rounded-xl shadow-lg border border-slate-700 z-10 admin-mono-tabular"
                style={{
                  left: `${(points[hoverIndex].x / chartWidth) * 100}%`,
                }}
              >
                <div className="font-bold text-[11px] text-slate-300">
                  {data[hoverIndex].label} · Détails du flux
                </div>
                <div className="text-emerald-400 font-black text-xs mt-0.5">
                  Courant: {isRevenue
                    ? `${data[hoverIndex].revenue.toLocaleString('fr-FR')} MAD`
                    : `${data[hoverIndex].volume} réservations`}
                </div>
                <div className="text-[10px] text-blue-300">
                  Précédent: {isRevenue
                    ? `${(data[hoverIndex].revenuePrev || 0).toLocaleString('fr-FR')} MAD`
                    : `${data[hoverIndex].volumePrev || 0} rés.`}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend & Indicator */}
      <div className="flex items-center justify-between text-[11px] pt-3 text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-slate-900 dark:bg-white rounded-xs" />
            <span className="font-medium text-slate-600 dark:text-slate-400">Captures réelles</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-[#A5C9FF] dark:bg-[#3B82F6] rounded-xs" />
            <span className="font-medium text-slate-600 dark:text-slate-400">Cycle précédent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-[#F6D0B5] dark:bg-[#F59E0B] rounded-xs" />
            <span className="font-medium text-slate-600 dark:text-slate-400">Moyenne projetée</span>
          </div>
        </div>
        <span className="hidden sm:inline admin-mono-tabular">
          Temps réel : Passerelle :8888
        </span>
      </div>
    </div>
  );
}
