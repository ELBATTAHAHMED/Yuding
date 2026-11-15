"use client";
import { Empty } from "./OperationsUI";
import { adminStatusLabel } from "./AdminBadge";
import { travelLabels } from "@/lib/admin-travel";
import Link from "next/link";
import { useState, type MouseEvent } from "react";

const palette = ["#087f78", "#547b8d", "#bd966e", "#97aaa3", "#897e94", "#b4b9bc", "#a98f7e", "#80949b", "#aa8a8b", "#74878b"];
const productColors: Record<string, string> = {
  ACTIVITY: "#087f78", HOTEL: "#547b8d", FLIGHT: "#bd966e", TRAIN: "#819a91", TRANSFER: "#897e94",
};
const statusColors: Record<string, string> = {
  PAID: "#087f78", CONFIRMED: "#286b60", PENDING_PAYMENT: "#bc8f56", PENDING: "#bc8f56", DRAFT: "#79838c",
  EXPIRED: "#a26a24", CANCELLED: "#b14852", REFUNDED: "#3474a4", FAILED: "#8f2e45",
};
const format = new Intl.NumberFormat("fr-FR");
type Breakdown = Record<string, number>;

export function OverviewCharts({ products, statuses }: { products?: Breakdown; statuses?: Breakdown }) {
  const [tooltip, setTooltip] = useState<{ label: string; count: number; percent: number; color: string; x: number; y: number } | null>(null);
  const productEntries = Object.entries(products ?? {}).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]);
  const productTotal = productEntries.reduce((sum, [, count]) => sum + count, 0);
  const productMax = Math.max(...productEntries.map(([, count]) => count), 1);
  const statusEntries = Object.entries(statuses ?? {}).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]);
  const statusTotal = statusEntries.reduce((sum, [, count]) => sum + count, 0);
  let position = 0;
  const segments = statusEntries.map(([status, count], index) => {
    const start = position;
    position += (count / statusTotal) * 100;
    return `${statusColors[status] || palette[index % palette.length]} ${start}% ${position}%`;
  });
  const showBar = (event: MouseEvent, label: string, count: number, total: number, color: string) =>
    setTooltip({ label, count, color, percent: Math.round(count / total * 100), x: event.clientX, y: event.clientY });
  const showRing = (event: MouseEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - (box.left + box.width / 2);
    const dy = event.clientY - (box.top + box.height / 2);
    const radius = Math.hypot(dx, dy);
    if (radius < box.width * 0.37 || radius > box.width / 2) { setTooltip(null); return; }
    const angle = (Math.atan2(dx, -dy) + 2 * Math.PI) % (2 * Math.PI);
    let remaining = angle / (2 * Math.PI) * statusTotal;
    const item = statusEntries.find(([, count]) => { remaining -= count; return remaining < 0; });
    if (item) showBar(event, adminStatusLabel(item[0]), item[1], statusTotal, statusColors[item[0]] || palette[statusEntries.indexOf(item) % palette.length]);
  };

  return <div className="dashboard-chart-grid">
    <section className="dashboard-chart dashboard-product-chart">
      <header className="dashboard-chart-header"><div><h2>Voyages par prestation</h2><p>Répartition des dossiers enregistrés</p></div>{!products && <span>Indisponible</span>}</header>
      {!products ? <Empty>Répartition indisponible.</Empty> : !productTotal ? <Empty>Aucun dossier à répartir.</Empty> : <div className="dashboard-chart-scroll"><div className="dashboard-columns" role="list" aria-label="Dossiers par prestation">
        {productEntries.map(([type, count], index) => <div className="dashboard-column-item" role="listitem" key={type}><Link href={`/admin/bookings?type=${encodeURIComponent(type)}`} className="dashboard-column" aria-label={`${travelLabels[type] || type} : ${format.format(count)} dossiers, ${Math.round(count / productTotal * 100)} %. Voir les dossiers`} onMouseMove={(event) => showBar(event, travelLabels[type] || type, count, productTotal, productColors[type] || palette[index % palette.length])} onMouseLeave={() => setTooltip(null)}>
          <strong>{format.format(count)}</strong>
          <div className="dashboard-column-track" aria-hidden="true"><span style={{ height: `${count / productMax * 100}%`, backgroundColor: productColors[type] || palette[index % palette.length] }} /></div>
          <span className="dashboard-column-label">{travelLabels[type as keyof typeof travelLabels] || type}</span>
          <small>{Math.round(count / productTotal * 100)} %</small>
        </Link></div>)}
      </div></div>}
    </section>
    <section className="dashboard-chart dashboard-status-chart">
      <header className="dashboard-chart-header"><div><h2>État des dossiers</h2><p>Suivi de tous les dossiers</p></div>{!statuses && <span>Indisponible</span>}</header>
      {!statuses ? <Empty>Répartition indisponible.</Empty> : !statusTotal ? <Empty>Aucun dossier à répartir.</Empty> : <div className="dashboard-status-content">
        <div className="dashboard-status-ring" style={{ background: `conic-gradient(${segments.join(", ")})` }} onMouseMove={showRing} onMouseLeave={() => setTooltip(null)} aria-hidden="true"><div><strong>{format.format(statusTotal)}</strong><span>dossiers</span></div></div>
        <ul className="dashboard-status-legend">{statusEntries.map(([status, count], index) => <li key={status}>
          <Link href={`/admin/bookings?status=${encodeURIComponent(status)}`} title={`Voir les dossiers : ${adminStatusLabel(status)}`}>
          <span className="dashboard-color-key" style={{ background: statusColors[status] || palette[index % palette.length] }} />
          <span>{adminStatusLabel(status)}</span><strong>{format.format(count)}</strong><small>{Math.round(count / statusTotal * 100)} %</small>
          </Link>
        </li>)}</ul>
      </div>}
    </section>
    {tooltip && <div className="dashboard-chart-tooltip" role="tooltip" style={{ left: `min(${tooltip.x + 14}px, calc(100vw - 200px))`, top: `min(${tooltip.y + 14}px, calc(100vh - 100px))` }}><strong><i style={{ backgroundColor: tooltip.color }} />{tooltip.label}</strong><span><b>{format.format(tooltip.count)}</b> dossier{tooltip.count === 1 ? "" : "s"} <em>{tooltip.percent} %</em></span></div>}
  </div>;
}
