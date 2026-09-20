'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle, className = '' }) => {
  const pathname = usePathname();

  const navItems = [
    { label: 'Overview', href: '/admin', icon: 'fa-chart-line' },
    { label: 'Utilisateurs', href: '/admin/users', icon: 'fa-users' },
    { label: 'Hébergements', href: '/hotels', icon: 'fa-bed' },
    { label: 'Transports', href: '/flights', icon: 'fa-plane' },
    { label: 'Activités', href: '/activities', icon: 'fa-calendar-alt' },
  ];

  return (
    <aside
      className={`bg-[#1A1F2E] text-white border-r border-white/10 flex flex-col transition-all duration-300 z-20 shrink-0 ${
        collapsed ? 'w-20' : 'w-64'
      } ${className}`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-white/10">
        <Link href="/" className="flex items-center gap-2 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/image/logo1.png"
            alt="Yuding Admin"
            className={`max-h-8 transition-opacity ${collapsed ? 'hidden' : 'block'}`}
          />
          {collapsed && (
            <span className="font-extrabold text-[#00D4AA] text-lg tracking-wider">YD</span>
          )}
        </Link>
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-white p-1.5 rounded-lg transition-colors focus:outline-none"
          title={collapsed ? 'Déplier le menu' : 'Replier le menu'}
          type="button"
        >
          <i className="fas fa-bars text-sm" />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 px-3 py-2">
          {!collapsed && 'Administration'}
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-[#00D4AA]/15 text-[#00D4AA] shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <i className={`fas ${item.icon} w-5 text-center text-base`} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </div>

      {/* Footer Return Link */}
      <div className="p-3 border-t border-white/10">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <i className="fas fa-arrow-left w-5 text-center" />
          {!collapsed && <span>Retour au site</span>}
        </Link>
      </div>
    </aside>
  );
};
