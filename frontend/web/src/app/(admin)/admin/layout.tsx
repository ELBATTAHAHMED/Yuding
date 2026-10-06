'use client';

import React, { useState } from 'react';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import '@/styles/admin.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <ProtectedRoute allowedRoles={['ROLE_ADMIN', 'ROLE_SUPPORT', 'ROLE_CONTENT_MANAGER']}>
      <div className="admin-shell min-h-screen flex">
        {/* Rebuilt 260px Sidebar */}
        <AdminSidebar
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        {/* Workspace Canvas */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <AdminHeader onToggleMobileMenu={() => setMobileMenuOpen(true)} />
          <main className="flex-1 p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
