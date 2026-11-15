"use client";

import { useEffect, useState } from "react";

const KEY = "yuding_admin_developer_mode";
const EVENT = "yuding-admin-developer-mode";

export function useDeveloperMode() {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => {
      try { setEnabled(localStorage.getItem(KEY) === "true"); } catch { setEnabled(false); }
      setReady(true);
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(EVENT, sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener(EVENT, sync); };
  }, []);
  const toggle = () => {
    try { localStorage.setItem(KEY, String(!enabled)); window.dispatchEvent(new Event(EVENT)); } catch { /* preference unavailable */ }
  };
  return { enabled, ready, toggle };
}
