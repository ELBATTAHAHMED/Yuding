"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminService } from "@/services/admin.service";
import { AdminIcon } from "./AdminIcon";
import { formatDate } from "./OperationsUI";
import { useAuth } from "@/features/auth/useAuth";

export function AdminNotifications() {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { isAdmin, isSupport } = useAuth();
  const canViewOperations = isAdmin || isSupport;
  const incidents = useQuery({ queryKey: ["admin", "attention"], queryFn: adminService.getAttention, enabled: canViewOperations, refetchInterval: 30000, refetchOnWindowFocus: true });
  const locked = useQuery({ queryKey: ["admin", "users", "locked"], queryFn: () => adminService.getUsers({ status: "LOCKED", size: 10 }), enabled: canViewOperations, refetchInterval: 30000, refetchOnWindowFocus: true });
  const reviews = useQuery({ queryKey: ["admin", "reviews", "count"], queryFn: () => import("@/services/admin-reviews.service").then((m) => m.adminReviews.page({ size: 1 })), refetchInterval: 30000, refetchOnWindowFocus: true });
  const count = (canViewOperations ? (incidents.data?.length || 0) + (locked.data?.totalElements || 0) : 0) + (reviews.data?.totalElements || 0);
  const loading = (canViewOperations && (incidents.isLoading || locked.isLoading)) || reviews.isLoading;
  const error = (canViewOperations && (incidents.error || locked.error)) || reviews.error;

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); container.current?.querySelector("button")?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);

  return <div className="ops-notifications" ref={container}>
    <button className="ops-notification-trigger" aria-label={count ? `Notifications, ${count} ${count === 1 ? "élément" : "éléments"} à examiner` : "Notifications"} aria-expanded={open} aria-controls="admin-notifications" onClick={() => { if (!open) { if (canViewOperations) { incidents.refetch(); locked.refetch(); } reviews.refetch(); } setOpen(!open); }}>
      <AdminIcon name="bell" />
      {count > 0 && <span className="ops-notification-count" aria-hidden="true">{count > 99 ? "99+" : count}</span>}
    </button>
    {open && <div className="ops-notification-panel" id="admin-notifications">
      <div className="ops-notification-heading"><div><strong>Notifications</strong><span>{loading ? "Chargement…" : error ? "Certaines données sont indisponibles" : `${count} à examiner`}</span></div><button className="ops-notification-refresh" onClick={() => { if (canViewOperations) { incidents.refetch(); locked.refetch(); } reviews.refetch(); }} aria-label="Actualiser les notifications"><AdminIcon name="refresh" /></button></div>
      <div className="ops-notification-list">
        {error && <p className="ops-notification-message" role="status">Impossible de charger toutes les notifications. Actualisez pour réessayer.</p>}
        {canViewOperations && incidents.data?.map((item) => <Link key={item.id} href={item.href} onClick={() => setOpen(false)} className="ops-notification-item"><span className="ops-notification-icon"><AdminIcon name="alert" /></span><span><strong>{item.title}</strong><small>{item.context} · {formatDate(item.createdAt)}</small></span></Link>)}
        {canViewOperations && !!locked.data?.totalElements && <Link href="/admin/users?status=LOCKED" onClick={() => setOpen(false)} className="ops-notification-item"><span className="ops-notification-icon"><AdminIcon name="users" /></span><span><strong>{locked.data.totalElements} {locked.data.totalElements === 1 ? "compte verrouillé" : "comptes verrouillés"}</strong><small>Vérifier la sécurité avant déverrouillage.</small></span></Link>}
        {!!reviews.data?.totalElements && <Link href="/admin/reviews" onClick={() => setOpen(false)} className="ops-notification-item"><span className="ops-notification-icon"><AdminIcon name="reviews" /></span><span><strong>{reviews.data.totalElements} avis en attente</strong><small>Une décision de modération est attendue.</small></span></Link>}
        {!loading && !error && count === 0 && <p className="ops-notification-message">Aucun élément à examiner pour le moment.</p>}
      </div>
    </div>}
  </div>;
}
