"use client";
import React, { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import "@/styles/admin.css";
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobile, setMobile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useEffect(() => {
    try {
      setSidebarCollapsed(
        localStorage.getItem("yuding_admin_sidebar_collapsed") === "true",
      );
    } catch {}
  }, []);
  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    try {
      localStorage.setItem("yuding_admin_sidebar_collapsed", String(next));
    } catch {}
  };
  const pathname = usePathname();
  const allowedRoles = pathname === "/admin/content"
    ? ["ROLE_ADMIN", "ROLE_CONTENT_MANAGER"]
    : pathname === "/admin/reviews"
      ? ["ROLE_ADMIN", "ROLE_SUPPORT", "ROLE_CONTENT_MANAGER"]
      : ["ROLE_ADMIN", "ROLE_SUPPORT"];
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <div
        className="admin-shell"
        data-sidebar-collapsed={sidebarCollapsed}
      >
        <a className="ops-skip" href="#admin-workspace">
          Aller au contenu
        </a>
        <Suspense fallback={null}>
          <AdminSidebar
            collapsed={sidebarCollapsed}
            mobileOpen={mobile}
            onCloseMobile={() => setMobile(false)}
          />
          <div className="ops-workspace">
            <AdminHeader
              sidebarCollapsed={sidebarCollapsed}
              mobileMenuOpen={mobile}
              onToggleSidebar={toggleSidebar}
              onToggleMobileMenu={() => setMobile(true)}
            />
            <main id="admin-workspace" className="ops-main">
              {children}
            </main>
          </div>
        </Suspense>
      </div>
    </ProtectedRoute>
  );
}
