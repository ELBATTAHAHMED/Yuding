'use client';

import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent';

interface AdminBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function AdminBadge({
  children,
  variant = 'neutral',
  dot = true,
  size = 'md',
  className = '',
}: AdminBadgeProps) {
  const variantStyles: Record<BadgeVariant, { bg: string; text: string; border: string; dotColor: string }> = {
    success: {
      bg: 'var(--admin-status-success-bg)',
      text: 'var(--admin-status-success-text)',
      border: 'var(--admin-status-success-border)',
      dotColor: '#10B981',
    },
    warning: {
      bg: 'var(--admin-status-warning-bg)',
      text: 'var(--admin-status-warning-text)',
      border: 'var(--admin-status-warning-border)',
      dotColor: '#F59E0B',
    },
    danger: {
      bg: 'var(--admin-status-danger-bg)',
      text: 'var(--admin-status-danger-text)',
      border: 'var(--admin-status-danger-border)',
      dotColor: '#EF4444',
    },
    info: {
      bg: 'var(--admin-status-info-bg)',
      text: 'var(--admin-status-info-text)',
      border: 'var(--admin-status-info-border)',
      dotColor: '#0EA5E9',
    },
    accent: {
      bg: 'var(--admin-accent-subtle)',
      text: 'var(--admin-accent)',
      border: 'var(--admin-accent-border)',
      dotColor: 'var(--admin-brand-teal)',
    },
    neutral: {
      bg: 'var(--admin-surface-muted)',
      text: 'var(--admin-text-secondary)',
      border: 'var(--admin-border)',
      dotColor: 'var(--admin-text-muted)',
    },
  };

  const current = variantStyles[variant];
  const isSm = size === 'sm';

  return (
    <span
      className={`admin-badge inline-flex items-center gap-1.5 font-medium rounded-full ${
        isSm ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      } ${className}`}
      style={{
        backgroundColor: current.bg,
        color: current.text,
        border: `1px solid ${current.border}`,
        lineHeight: 1.2,
      }}
    >
      {dot && (
        <span
          className="inline-block rounded-full flex-shrink-0"
          style={{
            width: isSm ? '4px' : '5px',
            height: isSm ? '4px' : '5px',
            backgroundColor: current.dotColor,
          }}
        />
      )}
      <span className="truncate">{children}</span>
    </span>
  );
}

export function getStatusBadgeVariant(status: string | undefined | null): BadgeVariant {
  if (!status) return 'neutral';
  const s = status.toUpperCase();
  if (['CONFIRMED', 'PAID', 'SUCCESS', 'SUCCEEDED', 'CAPTURED', 'APPROVED', 'ACTIVE', 'UP', 'COMPLETED', 'RESOLVED'].includes(s)) {
    return 'success';
  }
  if (['PENDING', 'PENDING_PAYMENT', 'WAITING', 'DEGRADED', 'PROCESSING', 'UNKNOWN', 'REVIEW'].includes(s)) {
    return 'warning';
  }
  if (['CANCELLED', 'FAILED', 'REFUNDED', 'REFUND_FAILED', 'REJECTED', 'INACTIVE', 'DOWN', 'LOCKED', 'EXPIRED'].includes(s)) {
    return 'danger';
  }
  if (['FLIGHT', 'HOTEL', 'ACTIVITY', 'TRANSFER', 'TRAIN'].includes(s)) {
    return 'info';
  }
  return 'neutral';
}
