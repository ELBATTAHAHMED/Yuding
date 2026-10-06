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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
        className="fixed inset-0 bg-black/50 backdrop-blur-xs admin-backdrop-enter"
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div
        className="admin-drawer-open relative z-10 w-full max-w-xl h-full flex flex-col shadow-2xl border-l bg-white dark:bg-[#14171E] border-[#E2E8F0] dark:border-[#1E2430] text-[#0F172A] dark:text-white"
      >
        {/* Header */}
        <div className="p-5 border-b border-[#E2E8F0] dark:border-[#1E2430] bg-[#F8F9FA] dark:bg-[#1A1F28] flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold truncate m-0 text-[#0F172A] dark:text-white">
                {title}
              </h2>
              {badge}
            </div>
            {subtitle && (
              <p className="text-xs truncate mt-0.5 text-[#64748B] dark:text-[#94A3B8] m-0">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {rawJson && (
              <div className="inline-flex rounded-lg p-0.5 bg-[#E2E8F0] dark:bg-[#2D3748]">
                <button
                  type="button"
                  onClick={() => setActiveTab('DETAILS')}
                  className={`text-[11px] font-bold px-2 py-1 rounded transition-colors ${
                    activeTab === 'DETAILS'
                      ? 'bg-white dark:bg-[#14171E] text-[#0F172A] dark:text-white shadow-xs'
                      : 'text-[#64748B] dark:text-[#94A3B8]'
                  }`}
                >
                  Détails
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('JSON')}
                  className={`text-[11px] font-bold px-2 py-1 rounded transition-colors ${
                    activeTab === 'JSON'
                      ? 'bg-white dark:bg-[#14171E] text-[#0F172A] dark:text-white shadow-xs'
                      : 'text-[#64748B] dark:text-[#94A3B8]'
                  }`}
                >
                  JSON
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white hover:bg-[#E2E8F0] dark:hover:bg-[#2D3748] transition-colors"
              title="Fermer"
            >
              <i className="fas fa-times text-sm" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 admin-custom-scrollbar">
          {activeTab === 'DETAILS' ? (
            children
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
                  Structure JSON brute
                </span>
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="admin-btn text-[11px] py-1 px-2.5 bg-[#F8F9FA] dark:bg-[#1A1F28] border border-[#E2E8F0] dark:border-[#2D3748] text-[#0F172A] dark:text-white"
                >
                  <i className={`fas ${copied ? 'fa-check text-emerald-500' : 'fa-copy'}`} />
                  <span>{copied ? 'Copié !' : 'Copier'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl text-xs admin-mono-tabular overflow-x-auto max-h-[70vh] border border-[#E2E8F0] dark:border-[#2D3748] bg-[#F8F9FA] dark:bg-[#0B0D11] text-[#0F172A] dark:text-[#F8FAFC]">
                {JSON.stringify(rawJson, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
