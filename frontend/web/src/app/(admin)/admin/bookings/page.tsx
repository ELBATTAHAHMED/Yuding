"use client";
import { useQuery } from "@tanstack/react-query";
import { adminService } from "@/services/admin.service";
import { parseTravelContext, travelLabels } from "@/lib/admin-travel";
import { AdminTable } from "@/components/admin/AdminTable";
import { AdminBadge, adminStatusLabel, getStatusBadgeVariant } from "@/components/admin/AdminBadge";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { TravelImage } from "@/components/admin/EntityContext";
import {
  PageHeading,
  FilterToolbar,
  useAdminUrl,
  money,
  formatDate,
} from "@/components/admin/OperationsUI";
import { TravelDossierInspector } from "@/components/admin/TravelDossierInspector";
export default function AdminBookingsPage() {
  const url = useAdminUrl();
  const query = useQuery({
    queryKey: [
      "admin",
      "bookings",
      url.filters,
      url.get("type"),
      url.get("userId"),
      url.get("sort"),
    ],
    queryFn: () =>
      adminService.getBookings({
        ...url.filters,
        productType: url.get("type"),
        userId: url.get("userId"),
        sort: url.get("sort"),
      }),
  });
  const sort = url.get("sort", "date.desc").split(".");
  return (
    <>
      <PageHeading
        title="Dossiers Voyage"
      >
        <span className="ops-muted">
          {query.data
            ? query.data.totalElements + " dossiers"
            : "Registre des voyages"}
        </span>
      </PageHeading>
      <FilterToolbar
        url={url}
        dates
        refresh={() => query.refetch()}
        busy={query.isFetching}
        filters={[
          {
            key: "type",
            label: "Prestation",
            options: Object.entries(travelLabels).map(([value, label]) => ({
              value,
              label,
            })),
          },
          {
            key: "status",
            label: "État",
            options: [
              "DRAFT",
              "PENDING_PAYMENT",
              "PAID",
              "CONFIRMED",
              "FAILED",
              "EXPIRED",
              "CANCELLED",
              "REFUNDED",
            ].map((value) => ({ value, label: adminStatusLabel(value) })),
          },
        ]}
      />
      <AdminTable
        className="ops-bookings-register"
        data={query.data?.content || []}
        keyExtractor={(b) => b.id}
        isLoading={query.isLoading}
        error={query.error}
        retry={() => query.refetch()}
        onRowClick={(b) => url.set({ booking: b.id }, true)}
        sortKey={sort[0]}
        sortDirection={sort[1] === "asc" ? "asc" : "desc"}
        onSort={(key) => {
          if (["reference", "type", "status"].includes(key))
            url.set({
              sort:
                key +
                "." +
                (sort[0] === key && sort[1] === "desc" ? "asc" : "desc"),
              page: null,
            });
        }}
        columns={[
          {
            key: "reference",
            header: "Dossier",
            render: (b) => (
              <div className="ops-cell">
                <strong>{b.bookingReference}</strong>
                <small>{formatDate(b.createdAt)}</small>
              </div>
            ),
          },
          {
            key: "type",
            header: "Voyage",
            render: (b) => {
              const t = parseTravelContext(b);
              const missingOffer = b.selectedDetails == null;
              return (
                <div className="ops-person">
                  <TravelImage src={t.imageUrl} type={b.productType} />
                  <div className="ops-cell">
                    <strong>{missingOffer ? "Offre indisponible" : t.title}</strong>
                    <small>
                      {missingOffer ? `${t.badge} · Détails de l’offre non enregistrés` : `${t.badge} · ${t.subtitle}`}
                    </small>
                  </div>
                </div>
              );
            },
          },
          {
            key: "date",
            sortable: false,
            header: "Dates du voyage",
            className: "ops-secondary-col",
            render: (b) => (
              <span className="ops-muted">{parseTravelContext(b).dates}</span>
            ),
          },
          {
            key: "provider",
            sortable: false,
            header: "Fournisseur",
            className: "ops-secondary-col",
            render: (b) => b.provider || <span title="Non renseigné">—</span>,
          },
          {
            key: "amount",
            sortable: false,
            header: "Montant",
            align: "right",
            render: (b) => (
              <span className="ops-numeric">{money(b.amount, b.currency)}</span>
            ),
          },
          {
            key: "status",
            header: "État",
            render: (b) => (
              <div className="ops-cell"><AdminBadge variant={getStatusBadgeVariant(b.status)}>{adminStatusLabel(b.status)}</AdminBadge>{b.pastDue && <small>Échéance dépassée · à vérifier</small>}</div>
            ),
          },
        ]}
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
      <TravelDossierInspector
        id={url.get("booking") || url.get("id")}
        onClose={() => url.set({ booking: null, id: null }, true)}
      />
    </>
  );
}
