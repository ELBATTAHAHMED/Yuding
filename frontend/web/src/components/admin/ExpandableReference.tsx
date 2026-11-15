"use client";
import { useEffect, useRef, useState } from "react";
import { AdminIcon } from "./AdminIcon";

export function ExpandableReference({ value }: { value?: string | null }) {
  const text = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflow, setOverflow] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  useEffect(() => { setExpanded(false); setCopyState("idle"); }, [value]);
  useEffect(() => {
    const element = text.current;
    if (!element || expanded) return;
    const measure = () => setOverflow(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [value, expanded]);
  if (!value) return <span title="Non renseigné">—</span>;
  return (
    <div className="ops-reference">
      <button className="ops-reference-copy" type="button" aria-label={copyState === "copied" ? "Référence copiée" : "Copier la référence"} title={copyState === "copied" ? "Copié" : "Copier la référence"} onClick={async () => {
        try { await navigator.clipboard.writeText(value); setCopyState("copied"); }
        catch { setCopyState("error"); }
      }}><AdminIcon name={copyState === "copied" ? "check" : "copy"} /></button>
      <div className="ops-reference-preview">
        <div className={`ops-reference-text ${expanded ? "" : "is-clamped"}`} ref={text}>{value}</div>
        {!expanded && overflow && <span className="ops-reference-fade" aria-hidden="true" />}
        {!expanded && overflow && <button className="ops-reference-more" type="button" onClick={() => setExpanded(true)} aria-expanded={false}>Voir plus</button>}
      </div>
      {expanded && <button className="ops-reference-less" type="button" onClick={() => setExpanded(false)} aria-expanded={true}>Voir moins</button>}
      {copyState === "error" && <small role="status">Copie indisponible. Sélectionnez la référence pour la copier.</small>}
    </div>
  );
}
