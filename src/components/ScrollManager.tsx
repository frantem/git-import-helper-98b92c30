import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const STORAGE_KEY = "locus:scroll";
const ANCHOR_KEY = "locus:scroll:anchor";
const RESERVE_ATTR = "data-scroll-reserve";
const SAFETY_TIMEOUT_MS = 8000;
const ANCHOR_MAX_AGE_MS = 30 * 60 * 1000;

type PositionsMap = Record<string, number>;
type Anchor = { productId: string; scrollY: number; viewportOffset: number; ts: number };
type AnchorMap = Record<string, Anchor>;

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
    /* ignore */
  }
}

function loadAnchors(): AnchorMap {
  try {
    const raw = sessionStorage.getItem(ANCHOR_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveAnchors(map: AnchorMap) {
  try {
    sessionStorage.setItem(ANCHOR_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
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

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    positionsRef.current = loadPositions();
  }, []);

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

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
      if (persistTimerRef.current != null) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Snapshot previous key position.
    if (!document.documentElement.hasAttribute(RESERVE_ATTR)) {
      positionsRef.current[currentKeyRef.current] = window.scrollY;
      persistPositions(positionsRef.current);
    }
    clearReserve();
    currentKeyRef.current = location.key;

    const listUrl = location.pathname + location.search;
    const anchors = loadAnchors();
    const anchor = anchors[listUrl];
    const anchorValid = anchor && Date.now() - anchor.ts < ANCHOR_MAX_AGE_MS;

    if (navigationType === "POP") {
      const savedScroll = positionsRef.current[location.key] ?? (anchorValid ? anchor.scrollY : 0);

      if (savedScroll > 0 || anchorValid) {
        const target = anchorValid ? anchor.scrollY : savedScroll;
        setReserve(target);
        window.scrollTo(0, target);

        let done = false;

        const finish = () => {
          if (done) return;
          done = true;
          ro?.disconnect();
          mo?.disconnect();
          clearTimeout(safetyTimer);

          // Prefer anchor: scroll the saved product card to its prior viewport offset.
          if (anchorValid) {
            const el = document.querySelector(
              `[data-product-id="${anchor.productId}"]`
            ) as HTMLElement | null;
            if (el) {
              const top = el.getBoundingClientRect().top + window.scrollY - anchor.viewportOffset;
              const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
              window.scrollTo(0, Math.max(0, Math.min(top, Math.max(0, maxScroll))));
              clearReserve();
              // Cleanup used anchor.
              const next = loadAnchors();
              delete next[listUrl];
              saveAnchors(next);
              return;
            }
          }
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          window.scrollTo(0, Math.min(target, Math.max(0, maxScroll)));
          clearReserve();
        };

        const tryRestore = () => {
          if (done) return;
          // If anchor card is in DOM — finish immediately.
          if (anchorValid) {
            const el = document.querySelector(`[data-product-id="${anchor.productId}"]`);
            if (el) {
              finish();
              return;
            }
          }
          // Otherwise wait until document is tall enough for numeric fallback.
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          if (!anchorValid && maxScroll >= target) {
            finish();
          } else if (window.scrollY !== target) {
            window.scrollTo(0, target);
          }
        };

        const ro = new ResizeObserver(() => tryRestore());
        ro.observe(document.body);

        const mo = new MutationObserver(() => tryRestore());
        mo.observe(document.body, { childList: true, subtree: true });

        const safetyTimer = window.setTimeout(() => {
          finish();
        }, SAFETY_TIMEOUT_MS);

        requestAnimationFrame(tryRestore);
      } else {
        window.scrollTo(0, 0);
      }
    } else {
      window.scrollTo(0, 0);
      requestAnimationFrame(() => window.scrollTo(0, 0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  return null;
};

export default ScrollManager;
