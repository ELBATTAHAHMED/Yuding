"use client";
import { useQuery } from "@tanstack/react-query";
import { adminService } from "@/services/admin.service";
import { AdminTable } from "@/components/admin/AdminTable";
import { AdminBadge, adminStatusLabel, getStatusBadgeVariant } from "@/components/admin/AdminBadge";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { UserPhotoAvatar } from "@/components/admin/UserPhotoAvatar";
import { TravelerBalance } from "@/components/admin/EntityContext";
import { UserInspector } from "@/components/admin/UserInspector";
import {
  PageHeading,
  FilterToolbar,
  useAdminUrl,
  fullName,
  roleLabels,
  formatDate,
} from "@/components/admin/OperationsUI";
export default function AdminUsersPage() {
  const url = useAdminUrl();
  const filters = {
    ...url.filters,
    role: url.get("role"),
    sort: url.get("sort"),
  };
  const users = useQuery({
    queryKey: ["admin", "users", filters],
    queryFn: () => adminService.getUsers(filters),
  });
  return (
    <>
      <PageHeading
        title="Comptes & Sécurité"
      >
        <span className="ops-muted">
          {users.data
            ? users.data.totalElements + " comptes"
            : "Registre des comptes"}
        </span>
      </PageHeading>
      <FilterToolbar
        url={url}
        refresh={() => users.refetch()}
        busy={users.isFetching}
        filters={[
          {
            key: "role",
            label: "Rôle",
            options: Object.entries(roleLabels).map(([value, label]) => ({
              value,
              label,
            })),
          },
          {
            key: "status",
            label: "État du compte",
            options: [
              "ACTIVE",
              "PENDING",
              "SUSPENDED",
              "DELETED",
              "LOCKED",
            ].map((value) => ({ value, label: adminStatusLabel(value) })),
          },
        ]}
      />
      <AdminTable
        data={users.data?.content || []}
        keyExtractor={(u) => u.id}
        isLoading={users.isLoading}
        error={users.error}
        retry={() => users.refetch()}
        onRowClick={(u) => url.set({ id: u.id }, true)}
        columns={[
          {
            key: "name",
            header: "Compte",
            render: (u) => (
              <div className="ops-person">
                <UserPhotoAvatar user={u} />
                <div>
                  <strong>{fullName(u)}</strong>
                  <small>{u.email}</small>
                </div>
              </div>
            ),
          },
          {
            key: "travel",
            header: "Voyages & encaissements",
            sortable: false,
            render: (u) => <TravelerBalance id={u.id} />,
          },
          {
            key: "roles",
            sortable: false,
            header: "Rôle",
            render: (u) => (
              <div className="ops-cell">
                <strong>
                  {[
                    "ROLE_ADMIN",
                    "ROLE_SUPPORT",
                    "ROLE_CONTENT_MANAGER",
                    "ROLE_USER",
                  ]
                    .filter((r) => u.roles.includes(r))
                    .map((r) => roleLabels[r])
                    .join(" · ")}
                </strong>
              </div>
            ),
          },
          {
            key: "status",
            header: "État",
            render: (u) => (
              <AdminBadge variant={getStatusBadgeVariant(u.lockedUntil && Date.parse(u.lockedUntil) > Date.now() ? "LOCKED" : u.status)}>{adminStatusLabel(u.lockedUntil && Date.parse(u.lockedUntil) > Date.now() ? "LOCKED" : u.status)}</AdminBadge>
            ),
          },
          {
            key: "date",
            header: "Inscription",
            className: "ops-secondary-col",
            render: (u) => formatDate(u.createdAt),
          },
          {
            key: "lastLogin",
            sortable: false,
            header: "Dernière activité",
            className: "ops-secondary-col",
            render: (u) => formatDate(u.lastLoginAt),
          },
        ]}
        sortKey={url.get("sort", "name.asc").split(".")[0]}
        sortDirection={url.get("sort").endsWith(".desc") ? "desc" : "asc"}
        onSort={(key) => {
          if (["name", "date", "status"].includes(key))
            url.set({
              sort:
                key + "." + (url.get("sort") === key + ".asc" ? "desc" : "asc"),
              page: null,
            });
        }}
        footer={
          <AdminPagination
            currentPage={url.page + 1}
            pageSize={url.size}
            totalItems={users.data?.totalElements || 0}
            onPageChange={(p) => url.set({ page: p - 1 })}
            onPageSizeChange={(size) => url.set({ size, page: null })}
          />
        }
      />
      <UserInspector
        key={url.get("id")}
        id={url.get("id")}
        onClose={() => url.set({ id: null }, true)}
      />
    </>
  );
}
