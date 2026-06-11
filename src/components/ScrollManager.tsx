import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const STORAGE_KEY = "locus:scroll";
const RESERVE_ATTR = "data-scroll-reserve";
const SAFETY_TIMEOUT_MS = 8000;

type PositionsMap = Record<string, number>;

function loadPositions(): PositionsMap {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function persistPositions(positions: PositionsMap) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    /* ignore quota / privacy errors */
  }
}

function clearReserve() {
  document.documentElement.style.minHeight = "";
  document.documentElement.removeAttribute(RESERVE_ATTR);
}

function setReserve(target: number) {
  const reserved = target + window.innerHeight;
  document.documentElement.style.minHeight = `${reserved}px`;
  document.documentElement.setAttribute(RESERVE_ATTR, "1");
}

export const ScrollManager = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const currentKeyRef = useRef<string>(location.key);
  const positionsRef = useRef<PositionsMap>({});
  const persistTimerRef = useRef<number | null>(null);

  // Init: disable browser native restoration and hydrate positions from sessionStorage.
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    positionsRef.current = loadPositions();
  }, []);

  // Track scroll position (rAF-throttled) + debounced persist to sessionStorage.
  useEffect(() => {
    let ticking = false;

    const schedulePersist = () => {
      if (persistTimerRef.current != null) return;
      persistTimerRef.current = window.setTimeout(() => {
        persistTimerRef.current = null;
        persistPositions(positionsRef.current);
      }, 200);
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        // Do not record scroll while we are still reserving height for a restore —
        // otherwise the in-progress restore could overwrite the saved target with 0.
        if (!document.documentElement.hasAttribute(RESERVE_ATTR)) {
          positionsRef.current[currentKeyRef.current] = window.scrollY;
          schedulePersist();
        }
        ticking = false;
      });
    };

    const flush = () => {
      if (!document.documentElement.hasAttribute(RESERVE_ATTR)) {
        positionsRef.current[currentKeyRef.current] = window.scrollY;
      }
      persistPositions(positionsRef.current);
    };

    // Capture clicks on internal links — snapshot position synchronously before navigation.
    const onClickCapture = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      // Only same-origin, plain left-clicks without modifier keys.
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.target === "_blank") return;
      flush();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    document.addEventListener("click", onClickCapture, true);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("click", onClickCapture, true);
      if (persistTimerRef.current != null) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
    };
  }, []);

  // Handle route changes — snapshot prev key, then restore (POP) or scroll to top.
  useEffect(() => {
    // Snapshot position for the previous key before switching (unless we were restoring).
    if (!document.documentElement.hasAttribute(RESERVE_ATTR)) {
      positionsRef.current[currentKeyRef.current] = window.scrollY;
      persistPositions(positionsRef.current);
    }
    // Any pending restoration is now stale — clear it.
    clearReserve();

    currentKeyRef.current = location.key;

    if (navigationType === "POP") {
      const saved = positionsRef.current[location.key] ?? 0;
      if (saved > 0) {
        // Reserve height so the browser can immediately scroll to the saved
        // position even while the lazy chunk / data are still loading.
        setReserve(saved);
        // Synchronous scroll to saved position.
        window.scrollTo(0, saved);

        const finish = () => {
          window.scrollTo(0, saved);
          clearReserve();
        };

        let done = false;
        const tryRestore = () => {
          if (done) return;
          const maxScroll =
            document.documentElement.scrollHeight - window.innerHeight;
          if (maxScroll >= saved) {
            done = true;
            ro?.disconnect();
            clearTimeout(safetyTimer);
            finish();
          } else {
            // Keep page parked at saved while we wait for content.
            if (window.scrollY !== saved) window.scrollTo(0, saved);
          }
        };

        const ro = new ResizeObserver(() => tryRestore());
        ro.observe(document.body);

        const safetyTimer = window.setTimeout(() => {
          done = true;
          ro.disconnect();
          const maxScroll =
            document.documentElement.scrollHeight - window.innerHeight;
          window.scrollTo(0, Math.min(saved, Math.max(0, maxScroll)));
          clearReserve();
        }, SAFETY_TIMEOUT_MS);

        // Kick once in case content is already tall enough.
        requestAnimationFrame(tryRestore);
      } else {
        window.scrollTo(0, 0);
      }
    } else {
      // PUSH / REPLACE — always start at top.
      window.scrollTo(0, 0);
      requestAnimationFrame(() => window.scrollTo(0, 0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  return null;
};

export default ScrollManager;
