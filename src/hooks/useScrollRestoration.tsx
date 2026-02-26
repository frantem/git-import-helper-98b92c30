import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const scrollPositions = new Map<string, number>();

export function useScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const prevPathRef = useRef<string>(location.pathname);

  // Save scroll position when leaving
  useEffect(() => {
    const handleScroll = () => {
      scrollPositions.set(prevPathRef.current, window.scrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Restore scroll position when navigating back
  useEffect(() => {
    if (navigationType === "POP") {
      const savedPosition = scrollPositions.get(location.pathname);
      if (savedPosition !== undefined) {
        setTimeout(() => {
          window.scrollTo(0, savedPosition);
        }, 0);
      }
    } else if (navigationType === "PUSH") {
      // Save current position before navigating away
      scrollPositions.set(prevPathRef.current, window.scrollY);
      // New page should start from top
      window.scrollTo(0, 0);
    }
    
    prevPathRef.current = location.pathname;
  }, [location.pathname, navigationType]);
}

export function useScrollToTop() {
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType === "PUSH") {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, navigationType]);
}
