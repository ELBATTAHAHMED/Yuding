"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { AdminIcon } from "./AdminIcon";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "@/services/admin.service";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/features/auth/useAuth";
import { AdminDrawer } from "./AdminDrawer";
import { AdminBadge, adminStatusLabel, getStatusBadgeVariant } from "./AdminBadge";
import { UserPhotoAvatar } from "./UserPhotoAvatar";
import {
  Section,
  Fields,
  ErrorState,
  Loading,
  Empty,
  ConfirmDialog,
  formatDate,
  fullName,
  money,
  roleLabels,
} from "./OperationsUI";
const descriptions: Record<string, string> = {
  ROLE_USER: "Voyageur : réserve et gère ses propres dossiers.",
  ROLE_SUPPORT:
    "Lit les dossiers et la finance, modère les avis et déverrouille les comptes.",
  ROLE_CONTENT_MANAGER:
    "Rôle de contenu. Aucun accès aux opérations Admin dans le RBAC actuel.",
  ROLE_ADMIN:
    "Accès complet aux opérations, aux relances sandbox et à la gouvernance des comptes.",
};
export function UserInspector({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const { user: operator, isAdmin } = useAuth();
  const client = useQueryClient();
  const [roles, setRoles] = useState<string[]>([]);
  const [action, setAction] = useState("");
  const [feedback, setFeedback] = useState("");
  const [deleteInfo, setDeleteInfo] = useState(false);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const deleteTitle = useId();
  useEffect(() => {
    const dialog = deleteDialog.current;
    if (!dialog) return;
    if (deleteInfo && !dialog.open) dialog.showModal();
    if (!deleteInfo && dialog.open) dialog.close();
  }, [deleteInfo]);
  const query = useQuery({
    queryKey: ["admin", "user", id],
    queryFn: () => adminService.getUser(id),
    enabled: !!id,
  });
  const u = query.data;
  const self = u?.id === operator?.id;
  const travel = useQuery({
    queryKey: ["admin", "bookings", "user", id],
    queryFn: () => adminService.getBookings({ userId: id, size: 5 }),
    enabled: !!id,
  });
  const finance = useQuery({
    queryKey: ["admin", "traveler-summary", id],
    queryFn: () =>
      apiClient.get<{
        bookingCount: number;
        capturedByCurrency: Record<string, number>;
        refundedByCurrency: Record<string, number>;
      }>(`/apir/admin/travelers/${id}/summary`, true),
    enabled: !!id,
  });
  useEffect(() => {
    if (u) setRoles(u.roles);
  }, [u]);
  const mutation = useMutation<unknown, Error, void>({
    mutationFn: () =>
      action === "roles"
        ? adminService.updateUserRoles(id, roles)
        : action === "unlock"
          ? adminService.unlockUser(id)
          : adminService.updateUserStatus(id, action),
    onSuccess: async () => {
      setAction("");
      setFeedback("Modification enregistrée.");
      await client.invalidateQueries({ queryKey: ["admin"] });
    },
  });
  const request = (a: string) => {
    mutation.reset();
    setAction(a);
  };
  return (
    <>
      <AdminDrawer
        isOpen={!!id}
        onClose={onClose}
        title={fullName(u)}
        subtitle={u?.email || "Compte voyageur"}
        badge={
          u && (
            <AdminBadge variant={getStatusBadgeVariant(u.status)}>{u.status}</AdminBadge>
          )
        }
        rawJson={u}
      >
        <ErrorState error={query.error} retry={() => query.refetch()} />
        {query.isLoading && <Loading />}
        {u && (
          <>
            {feedback && (
              <div className="ops-feedback" role="status">
                {feedback}
              </div>
            )}
            <Section title="Identité">
              <div className="ops-person" style={{ padding: "18px 0" }}>
                <UserPhotoAvatar user={u} size="lg" />
                <div>
                  <strong>{fullName(u)}</strong>
                  <small>{u.email}</small>
                </div>
              </div>
              <Fields
                items={[
                  ["Email vérifié", u.isEmailVerified ? "Oui" : "Non"],
                  ["Téléphone", u.phoneNumber],
                  ["Pays", u.countryCode],
                  ["Inscription", formatDate(u.createdAt)],
                  ["Dernière connexion", formatDate(u.lastLoginAt)],
                ]}
              />
            </Section>
            <Section
              title="Voyages"
              aside={
                <Link href={`/admin/bookings?userId=${id}`}>
                  Tous les dossiers →
                </Link>
              }
            >
              <ErrorState error={travel.error} />
              <Fields
                items={[
                  [
                    "Dossiers enregistrés",
                    travel.data?.totalElements ?? "Non disponible",
                  ],
                ]}
              />
              {travel.data?.content.map((b) => (
                <div className="ops-activity-row" key={b.id}>
                  <div>
                    <Link href={`/admin/bookings?booking=${b.id}`}>
                      {b.bookingReference}
                    </Link>
                    <small>{formatDate(b.createdAt)}</small>
                  </div>
                  <AdminBadge variant={getStatusBadgeVariant(b.status)}>{b.status}</AdminBadge>
                </div>
              ))}
              {travel.data?.totalElements === 0 && (
                <Empty>Aucun voyage enregistré.</Empty>
              )}
            </Section>
            <Section title="Finance">
              <ErrorState error={finance.error} />
              {finance.data ? (
                <Fields
                  items={[
                    [
                      "Paiements encaissés",
                      Object.entries(finance.data.capturedByCurrency).map(
                        ([c, a]) => <div key={c}>{money(a, c)}</div>,
                      ),
                    ],
                    [
                      "Remboursements effectués",
                      Object.entries(finance.data.refundedByCurrency).map(
                        ([c, a]) => <div key={c}>{money(a, c)}</div>,
                      ),
                    ],
                  ]}
                />
              ) : finance.isLoading ? (
                <Loading />
              ) : (
                <Empty>Contexte financier indisponible.</Empty>
              )}
              {finance.data &&
                Object.keys(finance.data.capturedByCurrency).length === 0 && (
                  <Empty>Aucun encaissement enregistré.</Empty>
                )}
            </Section>
            <Section title="Sécurité">
              <Fields
                items={[
                  ["État du compte", adminStatusLabel(u.status)],
                  ["Tentatives échouées", u.failedLoginAttempts],
                  [
                    "Verrouillage",
                    u.lockedUntil && Date.parse(u.lockedUntil) > Date.now()
                      ? formatDate(u.lockedUntil)
                      : "Aucun verrouillage actif",
                  ],
                ]}
              />
              <div className="ops-user-security-actions">
                {u.lockedUntil && Date.parse(u.lockedUntil) > Date.now() && (
                  <button className="ops-btn" onClick={() => request("unlock")}>
                    Déverrouiller
                  </button>
                )}
                {isAdmin && !self && (
                  <>
                    {u.status === "ACTIVE" ? (
                      <button
                        className="ops-btn ops-danger"
                        onClick={() => request("SUSPENDED")}
                      >
                        Suspendre
                      </button>
                    ) : (
                      <button
                        className="ops-btn"
                        onClick={() => request("ACTIVE")}
                      >
                        Réactiver
                      </button>
                    )}
                    {u.status !== "DELETED" && (
                      <button className="ops-btn ops-danger" onClick={() => setDeleteInfo(true)}>
                        Supprimer le compte
                      </button>
                    )}
                  </>
                )}
              </div>
              {self && (
                <Empty>
                  La désactivation de votre propre compte est bloquée.
                </Empty>
              )}
            </Section>
            <Section title="Rôles & permissions">
              {Object.entries(roleLabels).map(([role, label]) => (
                <label className="ops-role-option" key={role}>
                  <input
                    type="checkbox"
                    checked={roles.includes(role)}
                    disabled={!isAdmin || self}
                    onChange={(e) =>
                      setRoles(
                        e.target.checked
                          ? [...roles, role]
                          : roles.filter((r) => r !== role),
                      )
                    }
                  />
                  <span>
                    <strong>{label}</strong>
                    <small>{descriptions[role]}</small>
                  </span>
                </label>
              ))}
              {isAdmin && !self && (
                <div className="ops-role-save">
                  <button
                    className="ops-btn ops-primary"
                    disabled={
                      !roles.length ||
                      JSON.stringify([...roles].sort()) ===
                        JSON.stringify([...u.roles].sort())
                    }
                    onClick={() => request("roles")}
                  >
                    Enregistrer les rôles
                  </button>
                </div>
              )}
            </Section>
            <Section title="Avis & audit">
              <div className="ops-inspector-actions">
                <Link href={`/admin/reviews?userId=${id}&status=ALL`}>
                  Avis du voyageur
                </Link>
                <Link href={`/admin/audit?target=${id}`}>
                  Historique de gouvernance
                </Link>
              </div>
            </Section>
            <Section title="Détails techniques">
              <Fields items={[["Identifiant", id]]} />
            </Section>
          </>
        )}
      </AdminDrawer>
      <dialog ref={deleteDialog} className="ops-delete-notice" aria-labelledby={deleteTitle} onCancel={(e) => { e.preventDefault(); setDeleteInfo(false); }}>
        <div className="ops-delete-notice-icon"><AdminIcon name="alert" /></div>
        <h2 id={deleteTitle}>Suppression indisponible</h2>
        <p>{u?.roles.includes("ROLE_ADMIN") ? "Les comptes administrateurs sont protégés et ne peuvent pas être supprimés." : "La vérification des réservations, avis et autres données liées n’est pas encore disponible. Ce compte ne peut pas être supprimé pour le moment."}</p>
        <button autoFocus className="ops-btn ops-primary" onClick={() => setDeleteInfo(false)}>Compris</button>
      </dialog>
      <ConfirmDialog
        open={!!action}
        title={
          action === "roles"
            ? "Modifier les rôles ?"
            : action === "unlock"
              ? "Déverrouiller ce compte ?"
              : action === "SUSPENDED"
                ? "Suspendre ce compte ?"
                : action === "DELETED"
                  ? "Désactiver ce compte ?"
                  : "Réactiver ce compte ?"
        }
        description="Cette action est contrôlée et journalisée par le serveur. Les dossiers et l’historique financier sont conservés."
        pending={mutation.isPending}
        error={mutation.error}
        onClose={() => setAction("")}
        onConfirm={() => mutation.mutate()}
      />
    </>
  );
}
