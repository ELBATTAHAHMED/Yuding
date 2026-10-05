'use client';

import React, { useEffect, useState } from 'react';

interface AdminDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  rawJson?: any;
}

export function AdminDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  children,
  rawJson,
}: AdminDrawerProps) {
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'JSON'>('DETAILS');
  const [copied, setCopied] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyJson = () => {
    if (!rawJson) return;
    navigator.clipboard.writeText(JSON.stringify(rawJson, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div
        className="admin-drawer-open relative z-10 w-full max-w-xl h-full flex flex-col shadow-2xl border-l"
        style={{
          backgroundColor: 'var(--admin-surface)',
          borderColor: 'var(--admin-border)',
          color: 'var(--admin-text-primary)',
        }}
      >
        {/* Drawer Header */}
        <div
          className="p-4 border-b flex items-center justify-between gap-3"
          style={{
            borderColor: 'var(--admin-border)',
            backgroundColor: 'var(--admin-surface-muted)',
          }}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold truncate m-0" style={{ color: 'var(--admin-text-primary)' }}>
                {title}
              </h2>
              {badge}
            </div>
            {subtitle && (
              <p className="text-xs truncate mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {rawJson && (
              <div
                className="inline-flex rounded-md p-0.5"
                style={{
                  backgroundColor: 'var(--admin-border)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('DETAILS')}
                  className={`text-[0.7rem] font-bold px-2 py-1 rounded transition-colors ${
                    activeTab === 'DETAILS' ? 'shadow-xs' : 'opacity-70'
                  }`}
                  style={{
                    backgroundColor: activeTab === 'DETAILS' ? 'var(--admin-surface)' : 'transparent',
                    color: activeTab === 'DETAILS' ? 'var(--admin-text-primary)' : 'var(--admin-text-muted)',
                  }}
                >
                  Détails
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('JSON')}
                  className={`text-[0.7rem] font-bold px-2 py-1 rounded transition-colors ${
                    activeTab === 'JSON' ? 'shadow-xs' : 'opacity-70'
                  }`}
                  style={{
                    backgroundColor: activeTab === 'JSON' ? 'var(--admin-surface)' : 'transparent',
                    color: activeTab === 'JSON' ? 'var(--admin-text-primary)' : 'var(--admin-text-muted)',
                  }}
                >
                  JSON
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-md flex items-center justify-center transition-colors hover:bg-slate-200 dark:hover:bg-zinc-800"
              style={{ color: 'var(--admin-text-secondary)' }}
              title="Fermer (Échap)"
            >
              <i className="fas fa-times text-sm" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 admin-custom-scrollbar">
          {activeTab === 'DETAILS' ? (
            children
          ) : (
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color: 'var(--admin-text-secondary)' }}>
                  Payload brut du modèle
                </span>
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="admin-btn text-[0.7rem] py-1 px-2"
                  style={{
                    backgroundColor: 'var(--admin-surface-muted)',
                    border: '1px solid var(--admin-border)',
                    color: 'var(--admin-text-secondary)',
                  }}
                >
                  <i className={`fas ${copied ? 'fa-check text-emerald-500' : 'fa-copy'}`} />
                  <span>{copied ? 'Copié !' : 'Copier'}</span>
                </button>
              </div>
              <pre
                className="p-3 rounded-md text-xs admin-mono-tabular overflow-x-auto max-h-[70vh] border"
                style={{
                  backgroundColor: 'var(--admin-code-bg)',
                  borderColor: 'var(--admin-border)',
                  color: 'var(--admin-code-text)',
                }}
              >
                {JSON.stringify(rawJson, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
