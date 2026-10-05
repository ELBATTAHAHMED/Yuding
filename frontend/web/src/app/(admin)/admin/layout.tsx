'use client';

import React, { useState } from 'react';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import '@/styles/admin.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <ProtectedRoute allowedRoles={['ROLE_ADMIN', 'ROLE_SUPPORT', 'ROLE_CONTENT_MANAGER']}>
      <div className="admin-shell">
        {/* Desktop Sidebar & Mobile Off-canvas Drawer */}
        <AdminSidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        {/* Main Content Viewport */}
        <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          {/* Topbar Header */}
          <AdminHeader onToggleMobileMenu={() => setMobileOpen(!mobileOpen)} />

          {/* Main Content Workspace */}
          <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
