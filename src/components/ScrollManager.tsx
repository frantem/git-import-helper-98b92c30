import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const positions = new Map<string, number>();

function restoreWithRetry(target: number, deadline: number) {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const reachable = Math.min(target, Math.max(0, maxScroll));

  if (maxScroll >= target || performance.now() > deadline) {
    window.scrollTo(0, reachable);
    return;
  }

  if (window.scrollY !== reachable) {
    window.scrollTo(0, reachable);
  }
  requestAnimationFrame(() => restoreWithRetry(target, deadline));
}

export const ScrollManager = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const currentKeyRef = useRef<string>(location.key);

  // Disable browser's native scroll restoration once.
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  // Track scroll position for current history entry (rAF-throttled).
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        positions.set(currentKeyRef.current, window.scrollY);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Handle route changes.
  useEffect(() => {
    // Snapshot final position for the previous key before switching.
    positions.set(currentKeyRef.current, window.scrollY);
    currentKeyRef.current = location.key;

    if (navigationType === "POP") {
      const saved = positions.get(location.key);
      if (saved && saved > 0) {
        restoreWithRetry(saved, performance.now() + 1500);
      } else {
        window.scrollTo(0, 0);
      }
    } else {
      // PUSH / REPLACE — always start at the top.
      window.scrollTo(0, 0);
      requestAnimationFrame(() => window.scrollTo(0, 0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  return null;
};

export default ScrollManager;
