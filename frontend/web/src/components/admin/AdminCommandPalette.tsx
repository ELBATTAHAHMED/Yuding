"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/useAuth";
import { adminService } from "@/services/admin.service";
import { ADMIN_NAV_ITEMS } from "./AdminSidebar";
import { AdminIcon } from "./AdminIcon";
import { useDeveloperMode } from "./useDeveloperMode";

export function AdminCommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const path = usePathname();
  const developerMode = useDeveloperMode();
  const { user, isAdmin, isSupport } = useAuth();
  const canSearch = isAdmin || isSupport;
  const results = useQuery({
    queryKey: ["admin", "command-dossiers", search],
    queryFn: () => adminService.getBookings({ q: search, size: 5 }),
    enabled: open && canSearch && search.length >= 2,
  });
  const pages = ADMIN_NAV_ITEMS.filter((item) => {
    if (item.href === "/admin/providers" && !developerMode.enabled) return false;
    if (!canSearch) return item.href === "/admin/reviews" || item.href === "/admin/content";
    if (item.href === "/admin/content") return !!user?.roles.includes("ROLE_ADMIN") || !!user?.roles.includes("ROLE_CONTENT_MANAGER");
    return true;
  }).filter((item) => item.label.toLocaleLowerCase("fr-FR").includes(query.trim().toLocaleLowerCase("fr-FR")));

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setOpen(true); }
    };
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) { node.showModal(); input.current?.focus(); }
    if (!open && node.open) node.close();
  }, [open]);

  return <>
    <button type="button" className="ops-command-trigger" onClick={() => setOpen(true)} aria-label="Rechercher dans l’administration">
      <AdminIcon name="search" /><span>Rechercher un dossier, une page…</span><kbd>Ctrl K</kbd>
    </button>
    <dialog ref={dialog} className="ops-command-dialog" aria-labelledby="ops-command-title" onCancel={() => setOpen(false)} onClose={() => setOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="ops-command-heading"><div><h2 id="ops-command-title">Recherche</h2><p>Accédez rapidement à une page ou à un dossier.</p></div><button type="button" className="ops-command-close" onClick={() => setOpen(false)} aria-label="Fermer la recherche"><AdminIcon name="close" /></button></div>
      <form onSubmit={(event) => { event.preventDefault(); setSearch(query.trim()); }} className="ops-command-form">
        <AdminIcon name="search" />
        <input ref={input} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une page ou un dossier…" aria-label="Page ou référence de dossier" />
        {query && <button type="button" className="ops-command-clear" onClick={() => setQuery("")} aria-label="Effacer la recherche"><AdminIcon name="close" /></button>}
      </form>
      <div className="ops-command-results">
        <section className="ops-command-section" aria-label="Pages">
          <div className="ops-command-section-heading"><h3>Pages</h3><span>{pages.length}</span></div>
          {pages.length ? pages.map((item) => <Link href={item.href} key={item.href} onClick={() => setOpen(false)}><span className="ops-command-result-icon"><AdminIcon name={item.icon} /></span><span>{item.label}</span><AdminIcon name="chevron" /></Link>) : <p>Aucune page correspondante.</p>}
        </section>
        {canSearch && query.trim().length >= 2 && <section className="ops-command-section" aria-label="Dossiers">
          <div className="ops-command-section-heading"><h3>Dossiers</h3>{results.data?.content?.length ? <span>{results.data.content.length}</span> : null}</div>
          {search !== query.trim() || results.isLoading ? <p>Recherche en cours…</p> : results.isError ? <p>Recherche indisponible. Réessayez.</p> : results.data?.content.length ? results.data.content.map((booking) => <Link href={`/admin/bookings?booking=${encodeURIComponent(booking.id)}`} key={booking.id} onClick={() => setOpen(false)}><span className="ops-command-result-icon"><AdminIcon name="travel" /></span><span>{booking.bookingReference}</span><AdminIcon name="chevron" /></Link>) : <p>Aucun dossier trouvé.</p>}
        </section>}
      </div>
    </dialog>
  </>;
}
