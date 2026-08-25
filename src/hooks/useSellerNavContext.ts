import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Контекст реферального визита продавца.
 * Активен 24 часа после перехода по ссылке /seller/:slug?ref=...
 */
export function useSellerNavContext(): { sellerSlug: string } | null {
  const location = useLocation();
  const [ctx, setCtx] = useState<{ sellerSlug: string } | null>(null);

  useEffect(() => {
    try {
      const slug = localStorage.getItem("referrer_farmer_slug");
      const ts = Number(localStorage.getItem("referrer_farmer_ts") || 0);
      if (slug && ts && Date.now() - ts < TTL_MS) {
        setCtx({ sellerSlug: slug });
      } else {
        setCtx(null);
      }
    } catch {
      setCtx(null);
    }
  }, [location.pathname, location.search]);

  return ctx;
}
