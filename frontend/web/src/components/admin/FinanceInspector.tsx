"use client";
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminService } from "@/services/admin.service";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/features/auth/useAuth";
import { AdminDrawer } from "./AdminDrawer";
import { AdminBadge, adminStatusLabel, getStatusBadgeVariant } from "./AdminBadge";
import {
  Section,
  Fields,
  ErrorState,
  Loading,
  Empty,
  money,
  formatDate,
  ConfirmDialog,
} from "./OperationsUI";
import {
  AdminCancellation,
  AdminPayment,
  AdminRefund,
} from "@/types/admin.types";
export function FinanceInspector({
  id,
  kind,
  onClose,
}: {
  id: string;
  kind: "payment" | "refund" | "cancellation";
  onClose: () => void;
}) {
  const { isAdmin } = useAuth();
  const client = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const [feedback, setFeedback] = useState("");
  const query = useQuery<AdminPayment | AdminRefund | AdminCancellation>({
    queryKey: ["admin", kind, id],
    queryFn: () =>
      kind === "payment"
        ? adminService.getPayment(id)
        : kind === "refund"
          ? adminService.getRefund(id)
          : adminService.getCancellation(id),
    enabled: !!id,
  });
  const r = query.data;
  const payment = kind === "payment" ? (r as AdminPayment) : undefined;
  const refund = kind === "refund" ? (r as AdminRefund) : undefined;
  const cancellation =
    kind === "cancellation" ? (r as AdminCancellation) : undefined;
  const dossier = useQuery({
    queryKey: ["admin", "booking", r?.bookingId],
    queryFn: () => adminService.getBooking(r!.bookingId),
    enabled: !!r?.bookingId,
  });
  const related = useQuery({
    queryKey: ["admin", "refunds", "booking", r?.bookingId],
    queryFn: () => adminService.getRefunds({ bookingId: r!.bookingId }),
    enabled: !!r?.bookingId,
  });
  const ledger = useQuery({
    queryKey: ["admin", "payments", "booking", r?.bookingId],
    queryFn: () =>
      adminService.getPayments({ bookingId: r!.bookingId, size: 100 }),
    enabled: !!cancellation,
  });
  const retryHistory = useQuery({
    queryKey: ["admin", "retry-history", id],
    queryFn: () =>
      apiClient.get<
        { operatorId: string; outcome: string; createdAt: string }[]
      >(`/apir/admin/cancellations/${id}/history`, true),
    enabled: !!id && kind === "cancellation",
  });
  const retry = useMutation({
    mutationFn: () => adminService.retryRefund(id),
    onSuccess: async () => {
      setConfirm(false);
      setFeedback(
        "Relance traitée. Le résultat du fournisseur est affiché ci-dessous.",
      );
      await client.invalidateQueries({ queryKey: ["admin"] });
    },
  });
  const original = ledger.data?.content.find((p) =>
    ["SUCCEEDED", "REFUNDED"].includes(p.status),
  );
  const title =
    payment?.paymentReference ||
    refund?.refundReference ||
    "Annulation du voyage";
  const state = cancellation?.refundStatus || r?.status;
  return (
    <>
      <AdminDrawer
        isOpen={!!id}
        onClose={onClose}
        title={title}
        subtitle={dossier.data?.bookingReference || "Trésorerie & Règlements"}
        badge={
          state && (
            <AdminBadge variant={getStatusBadgeVariant(state)}>{state}</AdminBadge>
          )
        }
        rawJson={r}
      >
        <ErrorState error={query.error} retry={() => query.refetch()} />
        {query.isLoading && <Loading />}
        {r && (
          <>
            {feedback && (
              <div className="ops-feedback" role="status">
                {feedback}
              </div>
            )}
            <Section
              title={cancellation ? "Annulation & politique" : "Transaction"}
            >
              {cancellation ? (
                <>
                  <div className="ops-lifecycle">
                    Paiement → Annulation → Politique → Frais → Remboursement →
                    Résultat
                  </div>
                  <ErrorState error={ledger.error} />
                  {original && original.currency === cancellation.currency && (
                    <div className="ops-amount-equation">
                      {money(original.amount, original.currency)} −{" "}
                      {money(
                        cancellation.cancellationFee,
                        cancellation.currency,
                      )}{" "}
                      ={" "}
                      {money(cancellation.refundAmount, cancellation.currency)}
                    </div>
                  )}
                  <Fields
                    items={[
                      ["État de l’annulation", adminStatusLabel(cancellation.status)],
                      ["Politique", cancellation.policyType ? adminStatusLabel(cancellation.policyType) : null],
                      [
                        "Frais d’annulation",
                        money(
                          cancellation.cancellationFee,
                          cancellation.currency,
                        ),
                      ],
                      [
                        "Remboursement prévu",
                        money(cancellation.refundAmount, cancellation.currency),
                      ],
                      ["Motif", cancellation.reason],
                      ["Fournisseur", cancellation.providerName],
                      [
                        "Référence fournisseur",
                        cancellation.providerCancellationReference,
                      ],
                      ["Contexte d’échec", cancellation.failureMessage],
                    ]}
                  />
                </>
              ) : (
                <Fields
                  items={[
                    [
                      "Montant",
                      money(
                        (r as AdminPayment | AdminRefund).amount,
                        (r as AdminPayment | AdminRefund).currency,
                      ),
                    ],
                    ["État", state ? adminStatusLabel(state) : null],
                    ["Passerelle", payment?.providerName],
                    ["Moyen de paiement", payment?.paymentMethodType],
                    [
                      "Référence PSP",
                      payment?.providerTransactionId ||
                        payment?.providerOrderId ||
                        refund?.providerRefundId,
                    ],
                    ["Contexte d’échec", payment?.errorMessage],
                    ["Motif du remboursement", refund?.reason],
                  ]}
                />
              )}
            </Section>
            <Section title="Dossier & voyageur">
              <ErrorState error={dossier.error} />
              <Fields
                items={[
                  [
                    "Dossier",
                    <Link href={`/admin/bookings?booking=${r.bookingId}`}>
                      {dossier.data?.bookingReference || "Ouvrir le dossier"}
                    </Link>,
                  ],
                  [
                    "Voyageur",
                    dossier.data ? (
                      <Link href={`/admin/users?id=${dossier.data.userId}`}>
                        Ouvrir le compte voyageur
                      </Link>
                    ) : (
                      "Chargement…"
                    ),
                  ],
                ]}
              />
            </Section>
            <Section title="Remboursements liés">
              <ErrorState error={related.error} />
              {related.data?.content.map((ref) => (
                <div className="ops-activity-row" key={ref.id}>
                  <div>
                    <Link href={`/admin/finance?tab=refunds&refund=${ref.id}`}>
                      {ref.refundReference}
                    </Link>
                  </div>
                  <span className="ops-numeric">
                    {money(ref.amount, ref.currency)}
                  </span>
                  <AdminBadge variant={getStatusBadgeVariant(ref.status)}>{ref.status}</AdminBadge>
                </div>
              ))}
              {related.data?.totalElements === 0 && (
                <Empty>Aucun remboursement enregistré.</Empty>
              )}
              {refund?.paymentId && (
                <Link href={`/admin/finance?payment=${refund.paymentId}`}>
                  Paiement d’origine →
                </Link>
              )}
            </Section>
            <Section title="Dates & traçabilité">
              <Fields
                items={
                  cancellation
                    ? [
                        ["Demandée", formatDate(cancellation.requestedAt)],
                        ["Traitée", formatDate(cancellation.processedAt)],
                        ["Remboursée", formatDate(cancellation.refundedAt)],
                      ]
                    : [
                        [
                          "Créée",
                          formatDate(
                            (r as AdminPayment | AdminRefund).createdAt,
                          ),
                        ],
                        [
                          "Mise à jour",
                          formatDate(
                            (r as AdminPayment | AdminRefund).updatedAt,
                          ),
                        ],
                      ]
                }
              />
              {cancellation && (
                <>
                  <ErrorState error={retryHistory.error} />
                  {retryHistory.data?.map((h, i) => (
                    <Fields
                      key={i}
                      items={[
                        ["Relance · " + formatDate(h.createdAt), h.outcome],
                        [
                          "Opérateur",
                          <Link href={`/admin/users?id=${h.operatorId}`}>
                            Compte opérateur
                          </Link>,
                        ],
                      ]}
                    />
                  ))}
                </>
              )}
              <Link href={`/admin/audit?target=${r.id}`}>
                Consulter le journal →
              </Link>
            </Section>
            {cancellation?.retryEligible && isAdmin && (
              <Section title="Action financière">
                <p className="ops-empty">
                  La relance utilise le fournisseur sandbox et la référence de
                  remboursement existante.
                </p>
                <button
                  className="ops-btn ops-primary"
                  onClick={() => {
                    retry.reset();
                    setConfirm(true);
                  }}
                >
                  Relancer le remboursement
                </button>
              </Section>
            )}
            <Section title="Détails techniques">
              <Fields
                items={[
                  ["Identifiant", r.id],
                  ["Dossier lié", r.bookingId],
                ]}
              />
            </Section>
          </>
        )}
      </AdminDrawer>
      <ConfirmDialog
        open={confirm}
        title="Relancer ce remboursement ?"
        description="Le fournisseur sandbox recevra une nouvelle demande avec la même clé d’idempotence. Le résultat sera enregistré dans le dossier."
        pending={retry.isPending}
        error={retry.error}
        onClose={() => setConfirm(false)}
        onConfirm={() => retry.mutate()}
      />
    </>
  );
}
