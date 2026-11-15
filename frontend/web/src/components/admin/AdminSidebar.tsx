"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/useAuth";
import { UserPhotoAvatar } from "./UserPhotoAvatar";
import { AdminIcon } from "./AdminIcon";
import { fullName, roleLabels } from "./OperationsUI";
import { useDeveloperMode } from "./useDeveloperMode";

const navigationIcons: Record<string, string> = {
  overview: "fa-chart-pie",
  travel: "fa-suitcase-rolling",
  finance: "fa-wallet",
  users: "fa-user-shield",
  reviews: "fa-star",
  content: "fa-pen-to-square",
  audit: "fa-clipboard-list",
  health: "fa-chart-line",
};

export const ADMIN_NAV_GROUPS = [
  {
    title: "OPÉRATIONS VOYAGE",
    items: [
      { href: "/admin", label: "Vue d’ensemble", icon: "overview" },
      { href: "/admin/bookings", label: "Dossiers Voyage", icon: "travel" },
    ],
  },
  {
    title: "TRÉSORERIE & FINANCES",
    items: [
      {
        href: "/admin/finance",
        label: "Trésorerie / Grand Livre",
        icon: "finance",
      },
    ],
  },
  {
    title: "VOYAGEURS & CONTENU",
    items: [
      { href: "/admin/users", label: "Comptes & Sécurité", icon: "users" },
      { href: "/admin/reviews", label: "Modération des Avis", icon: "reviews" },
      { href: "/admin/content", label: "Gestion de Contenu", icon: "content" },
    ],
  },
  {
    title: "SYSTÈME & CONFORMITÉ",
    items: [
      { href: "/admin/audit", label: "Journal d’Audit", icon: "audit" },
      {
        href: "/admin/providers",
        label: "Supervision Plateforme",
        icon: "health",
      },
    ],
  },
];
export const ADMIN_NAV_ITEMS = ADMIN_NAV_GROUPS.flatMap((g) =>
  g.items.map((i) => ({ ...i, category: g.title })),
);
export function AdminSidebar({
  collapsed = false,
  mobileOpen = false,
  onCloseMobile,
}: {
  collapsed?: boolean;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const developerMode = useDeveloperMode();
  const [profile, setProfile] = useState(false);
  const compact = collapsed;
  const mobile = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    setProfile(false);
    onCloseMobile?.();
  }, [pathname]);
  useEffect(() => {
    if (!profile) return;
    const close = (e: PointerEvent) => {
      if (!(e.target as Element)?.closest(".ops-operator")) setProfile(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProfile(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [profile]);
  useEffect(() => {
    if (mobileOpen && !mobile.current?.open) mobile.current?.showModal();
    if (!mobileOpen) mobile.current?.close();
  }, [mobileOpen]);
  const role =
    user?.roles.find((r) => r === "ROLE_ADMIN") ||
    user?.roles.find((r) => r === "ROLE_SUPPORT") ||
    user?.roles[0];
  const toggleDeveloperMode = () => {
    const isLeavingSupervision = developerMode.enabled && pathname === "/admin/providers";
    developerMode.toggle();
    if (isLeavingSupervision) router.replace("/admin");
  };
  const content = (small: boolean) => (
    <>
      <nav className="ops-navigation" aria-label="Navigation d’administration">
        {ADMIN_NAV_GROUPS.map((group) => (
          <div className="ops-nav-group" key={group.title}>
            {!small && <h2>{group.title}</h2>}
            {group.items
              .filter((item) => {
                // Platform supervision exposes implementation-level telemetry. It is
                // deliberately kept out of the everyday operations navigation.
                if (item.href === "/admin/providers" && !developerMode.enabled) {
                  return false;
                }
                const isContentManagerOnly =
                  user?.roles.includes("ROLE_CONTENT_MANAGER") &&
                  !user.roles.includes("ROLE_ADMIN") &&
                  !user.roles.includes("ROLE_SUPPORT");
                if (isContentManagerOnly) {
                  return item.href === "/admin/reviews" || item.href === "/admin/content";
                }
                if (item.href === "/admin/content") {
                  return user?.roles.includes("ROLE_ADMIN") || user?.roles.includes("ROLE_CONTENT_MANAGER");
                }
                return true;
              })
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  title={small ? item.label : undefined}
                  className="ops-nav-link"
                  aria-label={item.label}
                  aria-current={pathname === item.href ? "page" : undefined}
                >
                  <i
                    className={`fas ${navigationIcons[item.icon] ?? "fa-circle"} ops-nav-symbol`}
                    aria-hidden="true"
                  />
                  {!small && <span>{item.label}</span>}
                </Link>
              ))}
          </div>
        ))}
      </nav>
      <div className="ops-operator">
        {profile && (
          <div className="ops-profile-menu">
            <div className="ops-profile-identity">
              <UserPhotoAvatar user={user} />
              <div className="ops-profile-details">
                <strong>{fullName(user)}</strong>
                <span>{user?.email}</span>
                <small>{roleLabels[role || ""] || role}</small>
              </div>
            </div>
            <div className="ops-profile-actions">
              <Link href="/account"><AdminIcon name="profile" /><span>Mon profil</span><AdminIcon name="chevron" /></Link>
              <Link href="/"><AdminIcon name="portal" /><span>Retour au portail Yuding</span><AdminIcon name="chevron" /></Link>
              <button type="button" role="switch" aria-checked={developerMode.enabled} onClick={toggleDeveloperMode}><AdminIcon name="settings" /><span>Mode développeur : {developerMode.enabled ? "activé" : "désactivé"}</span></button>
            </div>
            <div className="ops-profile-signout"><button onClick={() => logout()}><AdminIcon name="logout" /><span>Déconnexion</span></button></div>
          </div>
        )}
        <button
          className="ops-profile-trigger"
          aria-expanded={profile}
          aria-label="Menu du profil opérateur"
          onClick={() => setProfile(!profile)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setProfile(false);
          }}
        >
          <UserPhotoAvatar user={user} />
          {!small && (
            <span>
              <strong>{fullName(user)}</strong>
              <small>{roleLabels[role || ""] || role}</small>
            </span>
          )}
        </button>
        {!small && <button className="ops-footer-logout" aria-label="Déconnexion" title="Déconnexion" onClick={() => logout()}><AdminIcon name="logout" /></button>}
      </div>
    </>
  );
  return (
    <>
      <aside id="admin-navigation" className="ops-sidebar" data-collapsed={compact}>
        {content(compact)}
      </aside>
      <dialog
        ref={mobile}
        id="admin-mobile-navigation"
        className="ops-mobile-nav"
        aria-label="Navigation d’administration"
        onCancel={(e) => {
          e.preventDefault();
          onCloseMobile?.();
        }}
      >
        <Link href="/admin" className="ops-mobile-brand" aria-label="Yuding — console opérations">
          <img className="ops-logo-light" src="/image/yuding-logo-ai-light-green.png" alt="Yuding" />
          <img className="ops-logo-dark" src="/image/yuding-logo-ai-inverse-green.png" alt="Yuding" />
        </Link>
        <button className="ops-btn ops-mobile-close" onClick={onCloseMobile}>
          <AdminIcon name="close" />
          Fermer le menu
        </button>
        {content(false)}
      </dialog>
    </>
  );
}
