"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { adminService } from "@/services/admin.service";
import { AdminTable } from "@/components/admin/AdminTable";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import {
  PageHeading,
  FilterToolbar,
  useAdminUrl,
  Section,
  Fields,
  formatDate,
  ErrorState,
} from "@/components/admin/OperationsUI";
import { AccountLink } from "@/components/admin/EntityContext";
import { AdminBadge, adminStatusLabel } from "@/components/admin/AdminBadge";
const entityHref = (type: string, id: string) =>
  type === "user"
    ? `/admin/users?id=${id}`
    : type === "booking"
      ? `/admin/bookings?booking=${id}`
      : type === "payment"
        ? `/admin/finance?payment=${id}`
        : type === "cancellation"
          ? `/admin/finance?tab=refunds&cancellation=${id}`
          : type === "review"
            ? `/admin/reviews?review=${id}`
            : type === "refund"
              ? `/admin/finance?tab=refunds&refund=${id}`
              : null;
export default function AdminAuditPage() {
  const url = useAdminUrl();
  const filters = {
    ...url.filters,
    type: url.get("type"),
    target: url.get("target"),
    sort: url.get("sort"),
  };
  const logs = useQuery({
    queryKey: ["admin", "audit", filters],
    queryFn: () => adminService.getAuditPage(filters),
  });
  const detail = useQuery({
    queryKey: ["admin", "audit-event", url.get("event")],
    queryFn: () => adminService.getAuditEvent(url.get("event")),
    enabled: !!url.get("event"),
  });
  const selected = detail.data;
  return (
    <>
      <PageHeading
        title="Journal d’Audit"
      >
        <span className="ops-muted">
          {logs.data ? `${logs.data.totalElements} ${logs.data.totalElements > 1 ? "événements enregistrés" : "événement enregistré"}` : "—"}
        </span>
        <Link className="ops-btn" href="/admin/finance?tab=refunds">Annulations & remboursements</Link>
        <Link className="ops-btn" href="/admin/reviews?status=ALL">Historique des avis</Link>
      </PageHeading>
      <FilterToolbar
        url={url}
        dates
        refresh={() => logs.refetch()}
        busy={logs.isFetching}
        filters={[
          {
            key: "type",
            label: "Action",
            options: [
              "ROLE_CHANGE",
              "USER_STATUS_CHANGE",
              "ACCOUNT_UNLOCK",
              "USER_DELETE",
            ].map((value) => ({ value, label: adminStatusLabel(value) })),
          },
        ]}
      />
      {url.get("target") && (
        <p className="ops-muted" style={{ marginBottom: 16 }}>
          Historique de l’entité sélectionnée.{" "}
          <button
            className="ops-btn ops-ghost"
            onClick={() => url.set({ target: null, page: null })}
          >
            Toutes les entités
          </button>
        </p>
      )}
      <AdminTable
        data={logs.data?.content || []}
        keyExtractor={(l) => l.id}
        isLoading={logs.isLoading}
        error={logs.error}
        retry={() => logs.refetch()}
        onRowClick={(l) => url.set({ event: l.id }, true)}
        sortKey="date"
        sortDirection={
          url.get("sort", "date.desc").endsWith(".asc") ? "asc" : "desc"
        }
        onSort={(key) => {
          if (key === "date")
            url.set({
              sort:
                url.get("sort", "date.desc") === "date.desc"
                  ? "date.asc"
                  : "date.desc",
              page: null,
            });
        }}
        columns={[
          {
            key: "date",
            header: "Horodatage",
            render: (l) => formatDate(l.createdAt),
          },
          {
            key: "operator",
            sortable: false,
            header: "Opérateur",
            render: (l) => <AccountLink id={l.adminUserId} />,
          },
          {
            key: "action",
            sortable: false,
            header: "Action",
            render: (l) => (
              <div className="ops-cell">
                <strong>{adminStatusLabel(l.actionType)}</strong>
                <small>{l.reason || l.targetService}</small>
              </div>
            ),
          },
          {
            key: "target",
            sortable: false,
            header: "Cible",
            render: (l) => {
              const href = entityHref(l.targetEntityType, l.targetEntityId);
              return href ? (
                <Link onClick={(e) => e.stopPropagation()} href={href}>
                  {l.targetEntityType} →
                </Link>
              ) : (
                l.targetEntityType
              );
            },
          },
          {
            key: "outcome",
            sortable: false,
            header: "Trace",
            className: "ops-secondary-col",
            render: () => (
              <AdminBadge variant="neutral">Enregistrée</AdminBadge>
            ),
          },
        ]}
        footer={
          <AdminPagination
            currentPage={url.page + 1}
            pageSize={url.size}
            totalItems={logs.data?.totalElements || 0}
            onPageChange={(p) => url.set({ page: p - 1 })}
            onPageSizeChange={(size) => url.set({ size, page: null })}
          />
        }
      />
      <AdminDrawer
        isOpen={!!url.get("event")}
        onClose={() => url.set({ event: null }, true)}
        title={selected ? adminStatusLabel(selected.actionType) : "Événement d’audit"}
        subtitle={selected ? formatDate(selected.createdAt) : "Journal"}
        rawJson={selected}
      >
        {selected ? (
          <>
            <Section title="Action enregistrée">
              <Fields
                items={[
                  ["Date", formatDate(selected.createdAt)],
                  [
                    "Opérateur",
                    <Link href={`/admin/users?id=${selected.adminUserId}`}>
                      Ouvrir le compte
                    </Link>,
                  ],
                  ["Service", selected.targetService],
                  ["Action", adminStatusLabel(selected.actionType)],
                  ["Contexte", selected.reason],
                  [
                    "Cible",
                    entityHref(
                      selected.targetEntityType,
                      selected.targetEntityId,
                    ) ? (
                      <Link
                        href={
                          entityHref(
                            selected.targetEntityType,
                            selected.targetEntityId,
                          )!
                        }
                      >
                        Ouvrir l’entité
                      </Link>
                    ) : (
                      selected.targetEntityType
                    ),
                  ],
                ]}
              />
            </Section>
            <Section title="Détails techniques">
              <Fields
                items={[
                  ["Identifiant", selected.id],
                  ["Identifiant cible", selected.targetEntityId],
                  [
                    "Métadonnées",
                    <pre className="ops-json">
                      {selected.metadataJson || "Aucune métadonnée"}
                    </pre>,
                  ],
                ]}
              />
            </Section>
          </>
        ) : (
          <ErrorState error={detail.error} />
        )}
      </AdminDrawer>
    </>
  );
}
