"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminReviews, AdminReview } from "@/services/admin-reviews.service";
import { adminService } from "@/services/admin.service";
import { AdminTable } from "@/components/admin/AdminTable";
import { AdminBadge, adminStatusLabel, getStatusBadgeVariant } from "@/components/admin/AdminBadge";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import { UserPhotoAvatar } from "@/components/admin/UserPhotoAvatar";
import {
  PageHeading,
  FilterToolbar,
  useAdminUrl,
  Section,
  Fields,
  ErrorState,
  Empty,
  ConfirmDialog,
  formatDate,
  fullName,
} from "@/components/admin/OperationsUI";

const rejectionReasons = {
  SPAM: "Spam",
  PROFANITY: "Langage inapproprié",
  ABUSIVE: "Contenu abusif",
  UNVERIFIED_EXPERIENCE: "Expérience non vérifiable",
  IRRELEVANT: "Hors sujet",
  OTHER: "Autre",
};

function Reviewer({ review }: { review: AdminReview }) {
  const u = useQuery({
    queryKey: ["admin", "user", review.userId],
    queryFn: () => adminService.getUser(review.userId),
    enabled: !!review.userId,
  });
  return (
    <div className="ops-person">
      <UserPhotoAvatar
        user={u.data || { firstName: review.displayName || "" }}
        size="sm"
      />
      <div>
        <strong>
          {u.data
            ? fullName(u.data)
            : review.displayName || "Identité non disponible"}
        </strong>
        <small>
          {review.verifiedBooking
            ? "Voyage vérifié"
            : "Expérience non liée à un voyage"}
        </small>
      </div>
    </div>
  );
}
export default function AdminReviewsPage() {
  const url = useAdminUrl();
  const client = useQueryClient();
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED" | null>(
    null,
  );
  const [reason, setReason] = useState("OTHER");
  const [feedback, setFeedback] = useState("");
  useEffect(() => {
    if (!feedback) return;
    const timeoutId = window.setTimeout(() => setFeedback(""), 4200);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);
  const filters = {
    ...url.filters,
    type: url.get("type"),
    userId: url.get("userId"),
    bookingId: url.get("bookingId"),
    sort: url.get("sort"),
    status: url.get("status", "PENDING_MODERATION"),
  };
  const query = useQuery({
    queryKey: ["admin", "reviews", filters],
    queryFn: () => adminReviews.page(filters),
  });
  const selected = query.data?.content.find((r) => r.id === url.get("review"));
  const detail = useQuery({
    queryKey: ["admin", "review-detail", url.get("review")],
    queryFn: () => adminReviews.detail(url.get("review")),
    enabled: !!url.get("review"),
  });
  const r = selected || detail.data;
  const history = useQuery({
    queryKey: ["admin", "review-history", r?.id],
    queryFn: () => adminReviews.history(r!.id),
    enabled: !!r,
  });
  const mutation = useMutation({
    mutationFn: () => adminReviews.moderate(r!.id, decision!, reason),
    onSuccess: async () => {
      const message =
        decision === "REJECTED" && r?.status === "APPROVED"
          ? "Avis retiré de l’affichage public."
          : decision === "APPROVED" && r?.status === "REJECTED"
            ? "Avis publié à nouveau."
            : decision === "APPROVED"
              ? "Avis approuvé et publié."
              : "Avis rejeté et retiré de l’affichage public.";
      setDecision(null);
      setFeedback(message);
      await client.invalidateQueries({ queryKey: ["admin"] });
    },
  });
  const isWithdrawal = decision === "REJECTED" && r?.status === "APPROVED";
  return (
    <>
      <PageHeading
        title="Modération des Avis"
      >
        <span className="ops-muted">
          {query.data?.totalElements ?? "—"} avis {filters.status === "PENDING_MODERATION" ? "dans la file d’attente" : "affichés"}
        </span>
      </PageHeading>
      {feedback && (
        <div className="ops-feedback ops-toast" role="status">
          <span>{feedback}</span>
          <button
            type="button"
            className="ops-toast__dismiss"
            onClick={() => setFeedback("")}
            aria-label="Fermer la notification"
          >
            <i className="fas fa-xmark" aria-hidden="true" />
          </button>
        </div>
      )}
      <FilterToolbar
        url={url}
        refresh={() => query.refetch()}
        busy={query.isFetching}
        filters={[
          {
            key: "status",
            label: "État",
            defaultValue: "PENDING_MODERATION",
            allValue: "ALL",
            options: [
              { value: "PENDING_MODERATION", label: "À examiner" },
              { value: "APPROVED", label: "Approuvés" },
              { value: "REJECTED", label: "Rejetés" },
            ],
          },
          {
            key: "type",
            label: "Cible",
            options: [
              "ACCOMMODATION",
              "FLIGHT",
              "ACTIVITY",
              "TRANSFER",
              "TRAIN",
              "PLATFORM",
              "EXPERIENCE",
            ].map((value) => ({ value, label: adminStatusLabel(value) })),
          },
        ]}
      />
      <AdminTable
        data={query.data?.content || []}
        keyExtractor={(r) => r.id}
        isLoading={query.isLoading}
        error={query.error}
        retry={() => query.refetch()}
        onRowClick={(r) => url.set({ review: r.id }, true)}
        columns={[
          {
            key: "reviewer",
            sortable: false,
            header: "Voyageur",
            render: (r) => <Reviewer review={r} />,
          },
          {
            key: "rating",
            sortable: false,
            header: "Note",
            render: (r) => <span className="ops-numeric">{r.rating} / 5</span>,
          },
          {
            key: "target",
            sortable: false,
            header: "Cible du témoignage",
            render: (r) => (
              <div className="ops-cell">
                <strong>{r.entityName || adminStatusLabel(r.entityType)}</strong>
                <small>
                  {adminStatusLabel(r.entityType)} · {r.content.slice(0, 70)}
                  {r.content.length > 70 ? "…" : ""}
                </small>
              </div>
            ),
          },
          {
            key: "status",
            sortable: false,
            header: "État",
            render: (r) => (
              <AdminBadge variant={getStatusBadgeVariant(r.status)}>{adminStatusLabel(r.status)}</AdminBadge>
            ),
          },
          {
            key: "date",
            header: "Reçu",
            className: "ops-secondary-col",
            render: (r) => formatDate(r.createdAt),
          },
        ]}
        sortKey="date"
        sortDirection={
          url.get("sort", "date.asc").endsWith(".desc") ? "desc" : "asc"
        }
        onSort={(key) => {
          if (key === "date")
            url.set({
              sort:
                url.get("sort", "date.asc") === "date.asc"
                  ? "date.desc"
                  : "date.asc",
              page: null,
            });
        }}
        footer={
          <AdminPagination
            currentPage={url.page + 1}
            pageSize={url.size}
            totalItems={query.data?.totalElements || 0}
            onPageChange={(p) => url.set({ page: p - 1 })}
            onPageSizeChange={(size) => url.set({ size, page: null })}
          />
        }
      />
      <AdminDrawer
        isOpen={!!url.get("review")}
        onClose={() => url.set({ review: null }, true)}
        title={r?.entityName || "Avis voyageur"}
        subtitle={r ? formatDate(r.createdAt) : "Modération"}
        badge={
          r && (
            <AdminBadge variant={getStatusBadgeVariant(r.status)}>
              {adminStatusLabel(r.status)}
            </AdminBadge>
          )
        }
        rawJson={r}
      >
        <ErrorState error={detail.error} />
        {r && (
          <>
            <Section title="Témoignage">
              <div style={{ paddingTop: 18 }}>
                <Reviewer review={r} />
              </div>
              <Fields
                items={[
                  ["Note", r.rating + " / 5"],
                  ["Expérience vérifiée", r.verifiedBooking ? "Oui" : "Non"],
                ]}
              />
              <p className="ops-review-content">{r.content}</p>
            </Section>
            <Section title="Contexte du voyage">
              <Fields
                items={[
                  ["Cible", r.entityName || r.entityType],
                  ["Fournisseur", r.provider],
                  [
                    "Dossier",
                    r.bookingReference ? (
                      <Link
                        href={`/admin/bookings?booking=${r.bookingReference}`}
                      >
                        {r.bookingReference}
                      </Link>
                    ) : (
                      "Aucun dossier lié"
                    ),
                  ],
                  [
                    "Voyageur",
                    r.userId ? (
                      <Link href={`/admin/users?id=${r.userId}`}>
                        Ouvrir le compte
                      </Link>
                    ) : (
                      "Non renseigné"
                    ),
                  ],
                ]}
              />
            </Section>
            <Section title="Historique de modération">
              <ErrorState error={history.error} />
              {history.data?.map((h, i) => (
                <Fields
                  key={i}
                  items={[
                    ["Décision", adminStatusLabel(h.decision)],
                    ["Motif", h.rejectionReason],
                    ["Date", formatDate(h.createdAt)],
                    [
                      "Opérateur",
                      <Link href={`/admin/users?id=${h.operatorId}`}>
                        Compte opérateur
                      </Link>,
                    ],
                  ]}
                />
              ))}
              {history.data?.length === 0 && (
                <Empty>Aucune décision enregistrée dans cet historique.</Empty>
              )}
            </Section>
            {["PENDING_MODERATION", "APPROVED", "REJECTED"].includes(r.status) && (
              <Section
                title={
                  r.status === "APPROVED"
                    ? "Visibilité publique"
                    : r.status === "REJECTED"
                      ? "Publication"
                      : "Décision"
                }
              >
                {r.status === "APPROVED" && (
                  <p className="ops-review-visibility-copy">
                    Cet avis est visible sur Yuding. Vous pouvez le retirer de
                    l’affichage à tout moment.
                  </p>
                )}
                {r.status === "REJECTED" && (
                  <p className="ops-review-visibility-copy">
                    Cet avis n’est pas visible publiquement. Sa republication
                    sera enregistrée dans l’historique.
                  </p>
                )}
                {r.status !== "REJECTED" && (
                <label className="ops-filter" style={{ paddingTop: 16 }}>
                  <span>
                    {r.status === "APPROVED"
                      ? "Motif du retrait"
                      : "Motif de rejet"}
                  </span>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  >
                    {Object.entries(rejectionReasons).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                )}
                <div className="ops-actions" style={{ paddingTop: 16 }}>
                  {r.status !== "APPROVED" && (
                    <button
                      className="ops-btn ops-primary"
                      onClick={() => {
                        mutation.reset();
                        setDecision("APPROVED");
                      }}
                    >
                      {r.status === "REJECTED" ? "Publier à nouveau" : "Approuver"}
                    </button>
                  )}
                  {r.status !== "REJECTED" && (
                    <button
                      className="ops-btn ops-danger"
                      onClick={() => {
                        mutation.reset();
                        setDecision("REJECTED");
                      }}
                    >
                      {r.status === "APPROVED" ? "Retirer de l’affichage" : "Rejeter"}
                    </button>
                  )}
                </div>
              </Section>
            )}
          </>
        )}
      </AdminDrawer>
      <ConfirmDialog
        open={!!decision}
        title={
          decision === "APPROVED"
            ? r?.status === "REJECTED"
              ? "Publier à nouveau cet avis ?"
              : "Publier cet avis ?"
            : isWithdrawal
              ? "Retirer cet avis de l’affichage ?"
              : "Rejeter cet avis ?"
        }
        description={
          isWithdrawal
            ? "L’avis ne sera plus visible publiquement. Cette action et son motif seront conservés dans l’historique."
            : "La décision et l’opérateur seront conservés dans l’historique de modération."
        }
        pending={mutation.isPending}
        error={mutation.error}
        onClose={() => setDecision(null)}
        onConfirm={() => mutation.mutate()}
      />
    </>
  );
}
