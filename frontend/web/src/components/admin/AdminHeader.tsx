"use client";
import Link from "next/link";
import { DarkModeToggle } from "@/components/common/DarkModeToggle";
import { AdminIcon } from "./AdminIcon";
import { AdminNotifications } from "./AdminNotifications";
import { AdminCommandPalette } from "./AdminCommandPalette";
export function AdminHeader({
  sidebarCollapsed = false,
  mobileMenuOpen = false,
  onToggleSidebar,
  onToggleMobileMenu,
}: {
  sidebarCollapsed?: boolean;
  mobileMenuOpen?: boolean;
  onToggleSidebar?: () => void;
  onToggleMobileMenu?: () => void;
}) {
  return (
    <header className="ops-topbar">
      <div className="ops-topbar-start">
        <button
          type="button"
          className="ops-btn ops-icon-btn ops-sidebar-toggle"
          aria-label={sidebarCollapsed ? "Déployer le volet latéral" : "Réduire le volet latéral"}
          title={sidebarCollapsed ? "Déployer le volet latéral" : "Réduire le volet latéral"}
          aria-expanded={!sidebarCollapsed}
          aria-controls="admin-navigation"
          onClick={onToggleSidebar}
        >
          <AdminIcon name="panelCollapse" />
        </button>
        <button
          className="ops-btn ops-icon-btn ops-mobile-trigger"
          aria-label="Ouvrir le menu"
          aria-expanded={mobileMenuOpen}
          aria-controls="admin-mobile-navigation"
          onClick={onToggleMobileMenu}
        >
          <AdminIcon name="menu" />
        </button>
        <Link className="ops-topbar-logo" href="/admin" aria-label="Yuding — console opérations">
          <img className="ops-logo-light" src="/image/yuding-logo-ai-light-green.png" alt="Yuding" />
          <img className="ops-logo-dark" src="/image/yuding-logo-ai-inverse-green.png" alt="Yuding" />
        </Link>
      </div>
      <div className="ops-topbar-search">
        <AdminCommandPalette />
      </div>
      <div className="ops-topbar-actions">
        <AdminNotifications />
        <DarkModeToggle />
      </div>
    </header>
  );
}
