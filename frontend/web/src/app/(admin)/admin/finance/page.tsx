"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { adminService } from "@/services/admin.service";
import { AdminTable } from "@/components/admin/AdminTable";
import { AdminBadge, adminStatusLabel, getStatusBadgeVariant } from "@/components/admin/AdminBadge";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { BookingContext } from "@/components/admin/EntityContext";
import { FinanceInspector } from "@/components/admin/FinanceInspector";
import type { AdminPayment } from "@/types/admin.types";
import {
  PageHeading,
  FilterToolbar,
  useAdminUrl,
  money,
  formatDate,
  Section,
} from "@/components/admin/OperationsUI";
export default function AdminFinancePage() {
  const url = useAdminUrl();
  const refundTab = url.get("tab") === "refunds";
  const filters = {
    ...url.filters,
    bookingId: url.get("bookingId"),
    sort: url.get("sort"),
    provider: url.get("provider"),
  };
  const payments = useQuery({
    queryKey: ["admin", "payments", filters],
    queryFn: () => adminService.getPayments(filters),
    enabled: !refundTab,
  });
  const cancellations = useQuery({
    queryKey: ["admin", "cancellations", filters],
    queryFn: () => adminService.getCancellations(filters),
    enabled: refundTab,
  });
  const refundFilters = {
    ...filters,
    page: Number(url.get("refundPage")) || 0,
    status:
      (
        {
          REFUND_FAILED: "FAILED",
          REFUNDED: "SUCCEEDED",
          PROCESSING: "PENDING",
          NOT_APPLICABLE: "__NO_REFUND__",
        } as Record<string, string>
      )[filters.status || ""] || filters.status,
  };
  const refunds = useQuery({
    queryKey: ["admin", "refunds", refundFilters],
    queryFn: () => adminService.getRefunds(refundFilters),
    enabled: refundTab,
  });
  const stats = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: adminService.getAdminStats,
  });
  const providers = Object.keys(stats.data?.paymentsByProvider ?? {});
  // Preserve an active filter and avoid hiding information while totals are unavailable.
  const showProvider = !!url.get("provider") || !stats.data?.paymentsByProvider || providers.length !== 1 || providers[0].toLowerCase() !== "mock";
  const pagination = (total: number, refunds = false) => (
    <AdminPagination
      currentPage={(refunds ? refundFilters.page : url.page) + 1}
      pageSize={url.size}
      totalItems={total}
      onPageChange={(p) =>
        url.set({ [refunds ? "refundPage" : "page"]: p - 1 })
      }
      onPageSizeChange={(size) =>
        url.set({ size, page: null, refundPage: null })
      }
    />
  );
  const sort = url.get("sort", "date.desc").split(".");
  const sorting = (key: string) =>
    url.set({
      sort:
        key + "." + (sort[0] === key && sort[1] === "desc" ? "asc" : "desc"),
      page: null,
    });
  const kind = url.get("payment")
    ? "payment"
    : url.get("refund")
      ? "refund"
      : "cancellation";
  const id = url.get(kind) || url.get("cancellationId");
  return (
    <>
      <PageHeading title="Trésorerie & Règlements" />
      <nav
        className="ops-tabs ops-finance-tabs"
        aria-label="Espaces financiers"
      >
        <Link
          href="/admin/finance"
          aria-current={!refundTab ? "page" : undefined}
        >
          Encaissements
        </Link>
        <Link
          href="/admin/finance?tab=refunds"
          aria-current={refundTab ? "page" : undefined}
        >
          Annulations & Remboursements
        </Link>
      </nav>
      <FilterToolbar
        url={url}
        dates
        refresh={() => {
          if (refundTab) {
            cancellations.refetch();
            refunds.refetch();
          } else payments.refetch();
        }}
        busy={
          payments.isFetching || cancellations.isFetching || refunds.isFetching
        }
        filters={[
          {
            key: "status",
            label: "État",
            options: (refundTab
              ? [
                  "PENDING",
                  "PROCESSING",
                  "REFUND_FAILED",
                  "REFUNDED",
                  "NOT_APPLICABLE",
                ]
              : ["SUCCEEDED", "FAILED", "REFUNDED", "REQUIRES_ACTION"]
            ).map((value) => ({ value, label: adminStatusLabel(value) })),
          },
          ...(!refundTab && showProvider
            ? [
                {
                  key: "provider",
                  label: "Passerelle",
                  options: Object.keys(
                    stats.data?.paymentsByProvider || {},
                  ).map((value) => ({ value, label: value.toLowerCase() === "mock" ? "Simulation" : value })),
                },
              ]
            : []),
        ]}
      />
      {!refundTab ? (
        <AdminTable
          data={payments.data?.content || []}
          keyExtractor={(p) => p.id}
          isLoading={payments.isLoading}
          error={payments.error}
          retry={() => payments.refetch()}
          onRowClick={(p) =>
            url.set({ payment: p.id, refund: null, cancellation: null }, true)
          }
          sortKey={sort[0]}
          sortDirection={sort[1] === "asc" ? "asc" : "desc"}
          onSort={(key) => {
            if (
              ["reference", "date", "amount", "provider", "status"].includes(
                key,
              )
            )
              sorting(key);
          }}
          columns={[
            {
              key: "reference",
              header: "Transaction",
              render: (p) => (
                <div className="ops-cell">
                  <strong>{p.paymentReference}</strong>
                  {p.paymentMethodType && <small>{p.paymentMethodType === "DEMO_CARD" ? "Carte de démonstration" : p.paymentMethodType}</small>}
                </div>
              ),
            },
            {
              key: "booking",
              sortable: false,
              header: "Dossier",
              render: (p) => <BookingContext id={p.bookingId} />,
            },
            ...(showProvider ? [{
              key: "provider",
              header: "Passerelle",
              render: (p: AdminPayment) => p.providerName?.toLowerCase() === "mock" ? "Simulation" : p.providerName,
            }] : []),
            {
              key: "date",
              header: "Enregistrée",
              className: "ops-secondary-col",
              render: (p) => formatDate(p.createdAt),
            },
            {
              key: "amount",
              header: "Montant",
              align: "right",
              render: (p) => (
                <span className="ops-numeric">
                  {money(p.amount, p.currency)}
                </span>
              ),
            },
            {
              key: "status",
              header: "État",
              render: (p) => (
                <AdminBadge variant={getStatusBadgeVariant(p.status)}>{p.status}</AdminBadge>
              ),
            },
          ]}
          footer={pagination(payments.data?.totalElements || 0)}
        />
      ) : (
        <div style={{ display: "grid", gap: 22 }}>
          <Section title="Annulations & politiques" className="ops-finance-section">
            <AdminTable
              data={cancellations.data?.content || []}
              keyExtractor={(c) => c.id}
              isLoading={cancellations.isLoading}
              error={cancellations.error}
              retry={() => cancellations.refetch()}
              onRowClick={(c) =>
                url.set(
                  { cancellation: c.id, payment: null, refund: null },
                  true,
                )
              }
              sortKey={sort[0]}
              sortDirection={sort[1] === "asc" ? "asc" : "desc"}
              onSort={sorting}
              columns={[
                {
                  key: "date",
                  header: "Demande",
                  render: (c) => (
                    <div className="ops-cell">
                      <strong>{formatDate(c.requestedAt)}</strong>
                      <small>{c.reason || <span title="Non renseigné">—</span>}</small>
                    </div>
                  ),
                },
                {
                  key: "booking",
                  header: "Dossier",
                  render: (c) => <BookingContext id={c.bookingId} />,
                },
                {
                  key: "policy",
                  sortable: false,
                  header: "Politique",
                  className: "ops-secondary-col",
                  render: (c) => c.policyType ? adminStatusLabel(c.policyType) : <span title="Non renseigné">—</span>,
                },
                {
                  key: "fee",
                  sortable: false,
                  header: "Frais",
                  align: "right",
                  render: (c) => (
                    <span className="ops-numeric">
                      {money(c.cancellationFee, c.currency)}
                    </span>
                  ),
                },
                {
                  key: "amount",
                  header: "Remboursement",
                  align: "right",
                  render: (c) => (
                    <span className="ops-numeric">
                      {money(c.refundAmount, c.currency)}
                    </span>
                  ),
                },
                {
                  key: "status",
                  header: "Résultat",
                  render: (c) => (
                    <AdminBadge variant={getStatusBadgeVariant(c.refundStatus || c.status)}>{c.refundStatus || c.status}</AdminBadge>
                  ),
                },
              ]}
              footer={pagination(cancellations.data?.totalElements || 0)}
            />
          </Section>
          <Section title="Registre des remboursements" className="ops-finance-section">
            <AdminTable
              data={refunds.data?.content || []}
              keyExtractor={(r) => r.id}
              isLoading={refunds.isLoading}
              error={refunds.error}
              retry={() => refunds.refetch()}
              onRowClick={(r) =>
                url.set(
                  { refund: r.id, payment: null, cancellation: null },
                  true,
                )
              }
              columns={[
                {
                  key: "reference",
                  header: "Remboursement",
                  render: (r) => (
                    <div className="ops-cell">
                      <strong>{r.refundReference}</strong>
                      <small>{formatDate(r.createdAt)}</small>
                    </div>
                  ),
                },
                {
                  key: "booking",
                  header: "Dossier",
                  render: (r) => <BookingContext id={r.bookingId} />,
                },
                {
                  key: "amount",
                  header: "Montant",
                  align: "right",
                  render: (r) => (
                    <span className="ops-numeric">
                      {money(r.amount, r.currency)}
                    </span>
                  ),
                },
                {
                  key: "status",
                  header: "État",
                  render: (r) => (
                    <AdminBadge variant={getStatusBadgeVariant(r.status)}>{r.status}</AdminBadge>
                  ),
                },
              ]}
              footer={pagination(refunds.data?.totalElements || 0, true)}
            />
          </Section>
        </div>
      )}
      <FinanceInspector
        key={kind + id}
        id={id}
        kind={kind}
        onClose={() =>
          url.set(
            {
              payment: null,
              refund: null,
              cancellation: null,
              cancellationId: null,
            },
            true,
          )
        }
      />
    </>
  );
}
