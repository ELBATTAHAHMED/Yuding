"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { adminService } from "@/services/admin.service";
import { apiClient } from "@/lib/api-client";
import { parseTravelContext } from "@/lib/admin-travel";
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
  fullName,
} from "./OperationsUI";
import { TravelImage } from "./EntityContext";
import { UserPhotoAvatar } from "./UserPhotoAvatar";
import { ExpandableReference } from "./ExpandableReference";
export function TravelDossierInspector({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const dossier = useQuery({
    queryKey: ["admin", "booking", id],
    queryFn: () => adminService.getBooking(id),
    enabled: !!id,
  });
  const b = dossier.data;
  const traveler = useQuery({
    queryKey: ["admin", "user", b?.userId],
    queryFn: () => adminService.getUser(b!.userId),
    enabled: !!b?.userId,
  });
  const payments = useQuery({
    queryKey: ["admin", "payments", "booking", b?.id],
    queryFn: () => adminService.getPayments({ bookingId: b!.id, size: 100 }),
    enabled: !!b,
  });
  const cancellations = useQuery({
    queryKey: ["admin", "cancellations", "booking", b?.id],
    queryFn: () => adminService.getCancellations({ bookingId: b!.id }),
    enabled: !!b,
  });
  const refunds = useQuery({
    queryKey: ["admin", "refunds", "booking", b?.id],
    queryFn: () => adminService.getRefunds({ bookingId: b!.id }),
    enabled: !!b,
  });
  const history = useQuery({
    queryKey: ["admin", "lifecycle", b?.id],
    queryFn: () =>
      apiClient.get<{ status: string; changedAt: string; reason?: string }[]>(
        `/apir/admin/bookings/${b!.id}/history`,
        true,
      ),
    enabled: !!b,
  });
  const travel = b ? parseTravelContext(b) : null;
  return (
    <AdminDrawer
      isOpen={!!id}
      onClose={onClose}
      title={b?.bookingReference || "Dossier Voyage"}
      subtitle={travel?.title}
      badge={
        b && (
          <AdminBadge variant={getStatusBadgeVariant(b.status)}>{adminStatusLabel(b.status)}</AdminBadge>
        )
      }
      rawJson={b}
    >
      <ErrorState error={dossier.error} retry={() => dossier.refetch()} />
      {dossier.isLoading && <Loading />}
      {b && travel && (
        <>
          <Section title="Voyage">
            <TravelImage src={travel.imageUrl} type={b.productType} large />
            {b.selectedDetails && Object.keys(b.selectedDetails).length > 0 ? (
              <Fields items={travel.details.map((d) => [d.label, d.value])} />
            ) : (
              <Empty>Les détails de l’offre n’ont pas été enregistrés pour ce dossier.</Empty>
            )}
          </Section>
          <Section title="Voyageur">
            <ErrorState error={traveler.error} />
            {traveler.data ? (
              <>
                <div className="ops-person" style={{ paddingTop: 16 }}>
                  <UserPhotoAvatar user={traveler.data} />
                  <Link href={`/admin/users?id=${b.userId}`}>
                    {fullName(traveler.data)}
                  </Link>
                </div>
                <Fields
                  items={[
                    ["Email", traveler.data.email],
                    ["Compte", adminStatusLabel(traveler.data.status)],
                  ]}
                />
              </>
            ) : traveler.isLoading ? (
              <Loading />
            ) : (
              <Empty>Identité non disponible.</Empty>
            )}
          </Section>
          <Section title="Finance">
            <Fields
              items={[
                ["Prix du dossier", money(b.amount, b.currency)],
                ["Paiements", payments.data?.totalElements ?? "Non disponible"],
              ]}
            />
            <ErrorState error={payments.error} />
            {payments.data?.content.map((p) => (
              <div className="ops-activity-row" key={p.id}>
                <div>
                  <Link href={`/admin/finance?payment=${p.id}`}>
                    {p.paymentReference}
                  </Link>
                  <small>{p.providerName}</small>
                </div>
                <span className="ops-numeric">
                  {money(p.amount, p.currency)}
                </span>
                <AdminBadge variant={getStatusBadgeVariant(p.status)}>{p.status}</AdminBadge>
              </div>
            ))}
          </Section>
          <Section title="Fournisseur">
            <Fields
              items={[
                ["Fournisseur", b.provider],
                ["Référence de l’offre", <ExpandableReference value={b.providerOfferId} />],
              ]}
            />
          </Section>
          <Section title="Cycle de vie">
            <ErrorState error={history.error} />
            {history.data?.map((h, i) => (
              <Fields
                key={i}
                items={[
                  [h.status, formatDate(h.changedAt)],
                  ...(h.reason
                    ? [["Contexte", h.reason] as [string, string]]
                    : []),
                ]}
              />
            ))}
            {!history.data?.length && (
              <Fields
                items={[
                  ["Créé", formatDate(b.createdAt)],
                  ["Dernier changement", formatDate(b.statusChangedAt)],
                  ["Expiration", formatDate(b.expiresAt)],
                ]}
              />
            )}
          </Section>
          <Section title="Annulation & remboursement">
            <ErrorState error={cancellations.error || refunds.error} />
            {cancellations.data?.content.map((c) => (
              <div className="ops-activity-row" key={c.id}>
                <div>
                  <Link
                    href={`/admin/finance?tab=refunds&cancellation=${c.id}`}
                  >
                    Ouvrir l’annulation
                  </Link>
                  <small>{c.policyType ? adminStatusLabel(c.policyType) : <span title="Non renseigné">—</span>}</small>
                </div>
                <AdminBadge variant={getStatusBadgeVariant(c.refundStatus || c.status)}>{c.refundStatus || c.status}</AdminBadge>
              </div>
            ))}
            {refunds.data?.content.map((r) => (
              <div className="ops-activity-row" key={r.id}>
                <Link href={`/admin/finance?tab=refunds&refund=${r.id}`}>
                  {r.refundReference}
                </Link>
                <span className="ops-numeric">
                  {money(r.amount, r.currency)}
                </span>
              </div>
            ))}
            {cancellations.data?.totalElements === 0 &&
              refunds.data?.totalElements === 0 && (
                <Empty>Aucune annulation ni aucun remboursement.</Empty>
              )}
          </Section>
          <Section title="Avis & audit">
            <div className="ops-inspector-actions">
              <Link href={`/admin/reviews?bookingId=${b.id}&status=ALL`}>
                Avis de ce voyage
              </Link>
              <Link href={`/admin/audit?target=${b.id}`}>
                Journal du dossier
              </Link>
            </div>
          </Section>
        </>
      )}
    </AdminDrawer>
  );
}
