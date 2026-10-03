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
  // Map variant to styles using CSS variables or inline styles for exact color fidelity
  const variantStyles: Record<BadgeVariant, { bg: string; text: string; border: string; dotColor: string }> = {
    success: {
      bg: 'var(--admin-badge-success-bg, rgba(16, 185, 129, 0.12))',
      text: 'var(--admin-badge-success-text, #10B981)',
      border: 'var(--admin-badge-success-border, rgba(16, 185, 129, 0.25))',
      dotColor: '#10B981',
    },
    warning: {
      bg: 'var(--admin-badge-warning-bg, rgba(245, 158, 11, 0.12))',
      text: 'var(--admin-badge-warning-text, #F59E0B)',
      border: 'var(--admin-badge-warning-border, rgba(245, 158, 11, 0.25))',
      dotColor: '#F59E0B',
    },
    danger: {
      bg: 'var(--admin-badge-danger-bg, rgba(239, 68, 68, 0.12))',
      text: 'var(--admin-badge-danger-text, #EF4444)',
      border: 'var(--admin-badge-danger-border, rgba(239, 68, 68, 0.25))',
      dotColor: '#EF4444',
    },
    info: {
      bg: 'var(--admin-badge-info-bg, rgba(14, 165, 233, 0.12))',
      text: 'var(--admin-badge-info-text, #0EA5E9)',
      border: 'var(--admin-badge-info-border, rgba(14, 165, 233, 0.25))',
      dotColor: '#0EA5E9',
    },
    accent: {
      bg: 'var(--admin-accent-subtle, rgba(0, 212, 170, 0.12))',
      text: 'var(--admin-accent, #00D4AA)',
      border: 'var(--admin-accent-border, rgba(0, 212, 170, 0.25))',
      dotColor: 'var(--admin-accent, #00D4AA)',
    },
    neutral: {
      bg: 'var(--admin-surface-muted, #F1F5F9)',
      text: 'var(--admin-text-secondary, #64748B)',
      border: 'var(--admin-border, #E2E8F0)',
      dotColor: 'var(--admin-text-muted, #94A3B8)',
    },
  };

  const current = variantStyles[variant];
  const isSm = size === 'sm';

  return (
    <span
      className={`admin-badge inline-flex items-center gap-1.5 font-medium rounded-full ${
        isSm ? 'px-2 py-0.5 text-[0.6875rem]' : 'px-2.5 py-1 text-xs'
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

/**
 * Helper to auto-pick badge variant from status string
 */
export function getStatusBadgeVariant(status: string | undefined | null): BadgeVariant {
  if (!status) return 'neutral';
  const s = status.toUpperCase();
  if (['CONFIRMED', 'PAID', 'SUCCESS', 'APPROVED', 'ACTIVE', 'UP', 'COMPLETED', 'RESOLVED'].includes(s)) {
    return 'success';
  }
  if (['PENDING', 'PENDING_PAYMENT', 'WAITING', 'DEGRADED', 'PROCESSING', 'UNKNOWN', 'REVIEW'].includes(s)) {
    return 'warning';
  }
  if (['CANCELLED', 'FAILED', 'REFUNDED', 'REJECTED', 'INACTIVE', 'DOWN', 'LOCKED', 'EXPIRED'].includes(s)) {
    return 'danger';
  }
  if (['FLIGHT', 'HOTEL', 'ACTIVITY', 'TRANSFER', 'MICROSERVICE', 'INFRASTRUCTURE'].includes(s)) {
    return 'info';
  }
  return 'neutral';
}
