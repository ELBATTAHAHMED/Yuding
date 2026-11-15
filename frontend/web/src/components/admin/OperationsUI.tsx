"use client";
import React, { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AdminIcon } from "./AdminIcon";
export const formatDate = (v?: string | null) => {
  if (!v) return "—";
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(v);
  const date = new Date(dateOnly ? `${v}T12:00:00` : v);
  if (Number.isNaN(date.getTime())) return "—";
  const day = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
  return dateOnly ? day : `${day}, ${new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(date)}`;
};
export const money = (a?: number | null, c?: string | null) =>
  a != null && c
    ? `${Number(a).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${c}`
    : "—";
export const fullName = (
  u?: { firstName?: string; lastName?: string } | null,
) =>
  [u?.firstName, u?.lastName].filter(Boolean).join(" ") ||
  "Identité non disponible";
export const roleLabels: Record<string, string> = {
  ROLE_ADMIN: "Administrateur",
  ROLE_SUPPORT: "Support",
  ROLE_CONTENT_MANAGER: "Contenu",
  ROLE_USER: "Voyageur",
};
export function useAdminUrl() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const get = (key: string, fallback = "") => params.get(key) ?? fallback;
  const set = (
    values: Record<string, string | number | null>,
    push = false,
  ) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(values).forEach(([k, v]) =>
      v == null || v === "" ? next.delete(k) : next.set(k, String(v)),
    );
    const href = `${pathname}${next.size ? `?${next}` : ""}`;
    if (push) router.push(href, { scroll: false });
    else router.replace(href, { scroll: false });
  };
  const page = Math.max(0, Number(get("page")) || 0);
  const size = [10, 25, 50, 100].includes(Number(get("size")))
    ? Number(get("size"))
    : 10;
  return {
    get,
    set,
    page,
    size,
    filters: {
      page,
      size,
      q: get("q") || undefined,
      status: get("status") || undefined,
      createdFrom: get("from") || undefined,
      createdTo: get("to") || undefined,
    },
  };
}
export function PageHeading({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="ops-page-heading">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="ops-heading-actions">{children}</div>
    </div>
  );
}
export function Section({
  title,
  aside,
  children,
  className = "",
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`ops-section ${className}`}>
      <header className="ops-section-heading">
        <h2>{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}
export function Fields({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="ops-fields">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value == null || value === "" || value === "—" ? <span title="Non renseigné" aria-label="Non renseigné">—</span> : value}</dd>
        </div>
      ))}
    </dl>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error?: unknown;
  retry?: () => void;
}) {
  if (!error) return null;
  return (
    <div className="ops-error" role="alert">
      <AdminIcon name="alert" />
      <div>
        <strong>Données indisponibles</strong>
        <p>{error instanceof Error ? error.message : "La requête a échoué."}</p>
      </div>
      {retry && (
        <button className="ops-btn" onClick={retry}>
          Réessayer
        </button>
      )}
    </div>
  );
}
export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="ops-empty">{children}</p>;
}
export function Loading() {
  return (
    <div
      className="ops-skeleton"
      role="status"
      aria-label="Chargement des données"
    />
  );
}
type Filter = {
  key: string;
  label: string;
  defaultValue?: string;
  allValue?: string;
  options: { value: string; label: string }[];
};
export function FilterToolbar({
  url,
  filters = [],
  dates = false,
  refresh,
  busy,
}: {
  url: ReturnType<typeof useAdminUrl>;
  filters?: Filter[];
  dates?: boolean;
  refresh?: () => void;
  busy?: boolean;
}) {
  const [query, setQuery] = useState(url.get("q"));
  useEffect(() => setQuery(url.get("q")), [url.get("q")]);
  const change = (key: string, value: string) =>
    url.set({ [key]: value, page: null, refundPage: null });
  const datePreset = (value: string) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    if (value === "7") start.setDate(start.getDate() - 6);
    if (value === "30") start.setDate(start.getDate() - 29);
    url.set({
      period: value,
      from: value && value !== "custom" ? start.toISOString() : null,
      to: value && value !== "custom" ? new Date().toISOString() : null,
      page: null,
      refundPage: null,
    });
  };
  return (
    <div className="ops-toolbar">
      <form
        className="ops-search"
        onSubmit={(e) => {
          e.preventDefault();
          change("q", query);
        }}
      >
        <AdminIcon name="search" />
        <input
          aria-label="Rechercher"
          placeholder="Rechercher…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="ops-btn ops-ghost" type="submit">
          Chercher
        </button>
      </form>
      {filters.map((f) => (
        <label className="ops-filter" key={f.key}>
          <span>{f.label}</span>
          <select
            value={url.get(f.key, f.defaultValue)}
            onChange={(e) => change(f.key, e.target.value)}
          >
            <option value={f.allValue ?? ""}>Tous</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      {dates && (
        <label className="ops-filter">
          <span>Période</span>
          <select
            value={url.get("period")}
            onChange={(e) => datePreset(e.target.value)}
          >
            <option value="">Toutes les dates</option>
            <option value="today">Aujourd’hui</option>
            <option value="7">7 derniers jours</option>
            <option value="30">30 derniers jours</option>
            <option value="custom">Personnalisée</option>
          </select>
        </label>
      )}
      {dates && url.get("period") === "custom" && (
        <>
          <label className="ops-filter">
            <span>Du</span>
            <input
              aria-label="Date de début"
              type="date"
              value={url.get("from").slice(0, 10)}
              onChange={(e) =>
                change(
                  "from",
                  e.target.value
                    ? new Date(`${e.target.value}T00:00:00`).toISOString()
                    : "",
                )
              }
            />
          </label>
          <label className="ops-filter">
            <span>Au</span>
            <input
              aria-label="Date de fin"
              type="date"
              value={url.get("to").slice(0, 10)}
              onChange={(e) =>
                change(
                  "to",
                  e.target.value
                    ? new Date(`${e.target.value}T23:59:59.999`).toISOString()
                    : "",
                )
              }
            />
          </label>
        </>
      )}
      <div className="ops-toolbar-actions">
        <button
          className="ops-btn ops-ghost"
          onClick={() =>
            url.set({
              q: null,
              status: null,
              type: null,
              role: null,
              from: null,
              to: null,
              period: null,
              sort: null,
              page: null,
              refundPage: null,
              provider: null,
              bookingId: null,
              userId: null,
              target: null,
            })
          }
        >
          Réinitialiser
        </button>
        {refresh && (
          <button
            className="ops-btn ops-icon-btn"
            aria-label="Actualiser les données"
            disabled={busy}
            onClick={refresh}
          >
            <AdminIcon name="refresh" />
          </button>
        )}
      </div>
    </div>
  );
}
export function ConfirmDialog({
  open,
  title,
  description,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  pending?: boolean;
  error?: unknown;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="ops-confirm"
      aria-labelledby="confirm-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!pending) onClose();
      }}
    >
      <h2 id="confirm-title">{title}</h2>
      <p>{description}</p>
      <ErrorState error={error} />
      <div className="ops-actions">
        <button className="ops-btn" disabled={pending} onClick={onClose}>
          Annuler
        </button>
        <button
          className="ops-btn ops-primary"
          disabled={pending}
          onClick={onConfirm}
        >
          {pending ? "Traitement…" : "Confirmer"}
        </button>
      </div>
    </dialog>
  );
}
