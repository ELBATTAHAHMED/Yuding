"use client";
import React, { useEffect, useId, useRef, useState } from "react";
import { AdminIcon } from "./AdminIcon";
import { useDeveloperMode } from "./useDeveloperMode";
export function AdminDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  children,
  rawJson,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  rawJson?: unknown;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [tab, setTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const { enabled: developerMode } = useDeveloperMode();
  const showJson = developerMode && rawJson != null;
  useEffect(() => { if (!showJson) setTab(0); }, [showJson]);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    let timer: ReturnType<typeof setTimeout>;
    if (isOpen) {
      setTab(0);
      setCopied(false);
      setCopyError(false);
      if (!dialog.open) dialog.showModal();
      dialog.dataset.open = "true";
    } else {
      dialog.dataset.open = "false";
      timer = setTimeout(() => dialog.close(), 150);
    }
    return () => clearTimeout(timer);
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
    };
  }, [isOpen]);
  return (
    <dialog
      ref={ref}
      className="ops-inspector"
      aria-labelledby={`${id}-title`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <header className="ops-inspector-header">
        <div className="ops-inspector-identity">
          <div className="ops-inspector-title-row"><h2 id={`${id}-title`}>{title}</h2>{badge}</div>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button
          autoFocus
          className="ops-btn ops-icon-btn"
          aria-label="Fermer l’inspecteur"
          onClick={onClose}
        >
          <AdminIcon name="close" />
        </button>
      </header>
      {showJson && (
        <div
          className="ops-tabs"
          role="tablist"
          aria-label="Affichage du dossier"
          onKeyDown={(e) => {
            if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
              e.preventDefault();
              const next = e.key === "Home" ? 0 : e.key === "End" ? 1 : 1 - tab;
              setTab(next);
              e.currentTarget
                .querySelectorAll<HTMLButtonElement>("button")
                [next]?.focus();
            }
          }}
        >
          {["Détails", "JSON"].map((label, i) => (
            <button
              key={label}
              id={`${id}-tab-${i}`}
              role="tab"
              aria-selected={tab === i}
              aria-controls={`${id}-panel`}
              tabIndex={tab === i ? 0 : -1}
              onClick={() => setTab(i)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <div
        id={`${id}-panel`}
        role={showJson ? "tabpanel" : undefined}
        aria-labelledby={showJson ? `${id}-tab-${tab}` : undefined}
        className="ops-inspector-body"
      >
        {tab === 0 ? (
          children
        ) : (
          <div className="ops-json-view">
            <div className="ops-json-heading">
              <span>Données JSON</span>
              <button className="ops-btn" onClick={async () => {
                try { await navigator.clipboard.writeText(JSON.stringify(rawJson, null, 2)); setCopied(true); setCopyError(false); }
                catch { setCopied(false); setCopyError(true); }
              }}><AdminIcon name={copied ? "check" : "copy"} />{copied ? "Copié" : "Copier"}</button>
            </div>
            {copyError && <p className="ops-json-error" role="status">Copie indisponible. Sélectionnez le texte pour le copier.</p>}
            <pre className="ops-json" tabIndex={0} aria-label="Données JSON"><code>{JSON.stringify(rawJson, null, 2)}</code></pre>
          </div>
        )}
      </div>
    </dialog>
  );
}
