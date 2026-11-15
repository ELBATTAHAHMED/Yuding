"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminIcon } from "@/components/admin/AdminIcon";
import { ConfirmDialog, PageHeading, Section } from "@/components/admin/OperationsUI";
import { adminService } from "@/services/admin.service";
import { FeaturedDestinationItem } from "@/types/admin.types";

const isInternalPath = (value: string) => /^\/(?!\/)/.test(value) && !value.includes("\\");

const emptyDestination = (order: number): FeaturedDestinationItem => ({
  id: "", city: "", country: "", countryLabel: "", editorialTitle: "", editorialLine: "", editorialDetail: "",
  targetUrl: "/hotels", displayOrder: order, status: "DRAFT", imageUrl: "",
});

export default function AdminContentPage() {
  const queryClient = useQueryClient();
  const [destinations, setDestinations] = useState<FeaturedDestinationItem[]>([]);
  const [editing, setEditing] = useState<FeaturedDestinationItem | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDestinations = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      setDestinations(await adminService.getFeaturedDestinations());
      setUnavailable(false);
    } catch (cause: any) {
      setDestinations([]); setUnavailable(true);
      setError(cause?.message || "Les destinations n’ont pas pu être chargées.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadDestinations(); }, [loadDestinations]);

  const saveDestination = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    if (!isInternalPath(editing.targetUrl)) {
      setError("Utilisez un chemin du site, par exemple /hotels.");
      return;
    }
    setSaving(true); setError(null); setNotice(null);
    try {
      await adminService.saveFeaturedDestination(editing);
      await queryClient.invalidateQueries({ queryKey: ["travel", "featured-destinations"] });
      setEditing(null); setNotice("Destination enregistrée.");
      await loadDestinations();
    } catch (cause: any) {
      setError(cause?.message || "La destination n’a pas été enregistrée.");
    } finally { setSaving(false); }
  };

  const archiveDestination = async () => {
    if (!archiveId) return;
    setSaving(true); setError(null);
    try {
      await adminService.archiveFeaturedDestination(archiveId);
      await queryClient.invalidateQueries({ queryKey: ["travel", "featured-destinations"] });
      setArchiveId(null); setNotice("Destination archivée.");
      await loadDestinations();
    } catch (cause: any) {
      setError(cause?.message || "La destination n’a pas pu être archivée.");
    } finally { setSaving(false); }
  };

  const statusBadge = (status: FeaturedDestinationItem["status"]) => {
    if (status === "PUBLISHED") return <AdminBadge variant="confirmed">Publié</AdminBadge>;
    if (status === "DRAFT") return <AdminBadge variant="draft">Brouillon</AdminBadge>;
    return <AdminBadge variant="neutral">Archivé</AdminBadge>;
  };

  return (
    <div className="ops-content-page ops-new-admin">
      <PageHeading title="Gestion de contenu">
        <button type="button" className="ops-btn ops-btn-secondary" onClick={loadDestinations} disabled={loading}>
          <AdminIcon name="refresh" className={loading ? "spin" : ""} /><span>Actualiser</span>
        </button>
      </PageHeading>

      {notice && <div className="ops-attention-banner ops-attention-success" role="status">{notice}</div>}
      {error && <div className="ops-attention-banner ops-attention-error" role="alert">{error}</div>}

      <Section className="ops-content-register" title="Destinations à la une" aside={
        <button type="button" className="ops-btn ops-btn-primary" disabled={loading || unavailable} onClick={() => setEditing(emptyDestination(destinations.length + 1))}>
          Ajouter une destination
        </button>
      }>
        <div className="ops-table-responsive">
          <table className="ops-table">
            <thead><tr><th>Ordre</th><th>Destination</th><th>Présentation</th><th>Lien</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>
              {destinations.length > 0 ? destinations.map((destination) => (
                <tr key={destination.id}>
                  <td data-label="Ordre">{destination.displayOrder}</td>
                  <td data-label="Destination"><strong>{destination.city}</strong><br /><span className="ops-secondary-text">{destination.countryLabel || destination.country}</span></td>
                  <td data-label="Présentation"><strong>{destination.editorialTitle}</strong><br /><span className="ops-secondary-text">{destination.editorialLine}</span></td>
                  <td data-label="Lien">{isInternalPath(destination.targetUrl) ? <Link href={destination.targetUrl}>Voir la page</Link> : <span aria-label="Lien indisponible">—</span>}</td>
                  <td data-label="Statut">{statusBadge(destination.status)}</td>
                  <td data-label="Actions"><div className="ops-content-actions">
                    <button type="button" className="ops-btn ops-btn-secondary" onClick={() => setEditing(destination)}>Modifier</button>
                    {destination.status !== "ARCHIVED" && <button type="button" className="ops-btn ops-btn-danger" onClick={() => setArchiveId(destination.id)}>Archiver</button>}
                  </div></td>
                </tr>
              )) : <tr><td colSpan={6} className="ops-empty-table">{loading ? "Chargement des destinations…" : unavailable ? "Données indisponibles." : "Aucune destination mise en avant."}</td></tr>}
            </tbody>
          </table>
        </div>

        {editing && (
          <div className="ops-content-editor">
            <h2>{editing.id ? "Modifier la destination" : "Nouvelle destination à la une"}</h2>
            <form onSubmit={saveDestination} className="ops-content-form">
              <Field label="Ville"><input required value={editing.city} onChange={(event) => setEditing({ ...editing, city: event.target.value })} /></Field>
              <Field label="Pays"><input required value={editing.country} onChange={(event) => setEditing({ ...editing, country: event.target.value })} /></Field>
              <Field label="Libellé pays"><input required value={editing.countryLabel} onChange={(event) => setEditing({ ...editing, countryLabel: event.target.value })} /></Field>
              <Field label="Ordre d’affichage"><input type="number" min="1" required value={editing.displayOrder} onChange={(event) => setEditing({ ...editing, displayOrder: Number(event.target.value) || 1 })} /></Field>
              <Field label="Titre éditorial" wide><input required value={editing.editorialTitle} onChange={(event) => setEditing({ ...editing, editorialTitle: event.target.value })} /></Field>
              <Field label="Accroche"><input required value={editing.editorialLine} onChange={(event) => setEditing({ ...editing, editorialLine: event.target.value })} /></Field>
              <Field label="Chemin de destination"><input required value={editing.targetUrl} onChange={(event) => setEditing({ ...editing, targetUrl: event.target.value })} /></Field>
              <Field label="Description" wide><textarea required rows={3} value={editing.editorialDetail} onChange={(event) => setEditing({ ...editing, editorialDetail: event.target.value })} /></Field>
              <Field label="Statut"><select value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value as FeaturedDestinationItem["status"] })}><option value="PUBLISHED">Publié</option><option value="DRAFT">Brouillon</option><option value="ARCHIVED">Archivé</option></select></Field>
              <Field label="URL de l’image"><input value={editing.imageUrl || ""} onChange={(event) => setEditing({ ...editing, imageUrl: event.target.value })} /></Field>
              <div className="ops-form-actions"><button type="submit" className="ops-btn ops-btn-primary" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</button><button type="button" className="ops-btn ops-btn-secondary" disabled={saving} onClick={() => setEditing(null)}>Annuler</button></div>
            </form>
          </div>
        )}
      </Section>

      <ConfirmDialog open={Boolean(archiveId)} title="Archiver cette destination ?" description="Elle ne sera plus affichée sur le site." pending={saving} error={null} onClose={() => setArchiveId(null)} onConfirm={archiveDestination} />
    </div>
  );
}

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={wide ? "ops-content-field ops-content-field-wide" : "ops-content-field"}><span>{label}</span>{children}</label>;
}
