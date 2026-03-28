import { useEffect, useRef } from "react";

export function useDraftState<T extends object>(
  key: string,
  state: T,
  setState: React.Dispatch<React.SetStateAction<T>>,
  enabled: boolean = true
) {
  const restoredRef = useRef(false);

  // Restore on mount (only once)
  useEffect(() => {
    if (!enabled || restoredRef.current) return;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setState(s => ({ ...s, ...parsed }));
      } catch {}
    }
    restoredRef.current = true;
  }, [key, enabled]);

  // Save on every change + pagehide/visibilitychange
  useEffect(() => {
    if (!enabled) return;
    const save = () => localStorage.setItem(key, JSON.stringify(state));
    const onVisChange = () => {
      if (document.visibilityState === "hidden") save();
    };
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", onVisChange);
    save();
    return () => {
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", onVisChange);
    };
  }, [key, state, enabled]);
}

export function clearDraft(key: string) {
  localStorage.removeItem(key);
}
