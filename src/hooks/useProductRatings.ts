import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ProductRating {
  avg: number;
  count: number;
}

/** Средний рейтинг и число отзывов для списка товаров. */
export function useProductRatings(productIds: string[]): Map<string, ProductRating> {
  const [ratings, setRatings] = useState<Map<string, ProductRating>>(new Map());
  const key = productIds.join(",");

  useEffect(() => {
    if (!key) { setRatings(new Map()); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("reviews")
        .select("product_id, rating")
        .in("product_id", key.split(","));
      if (cancelled) return;
      const acc = new Map<string, { sum: number; count: number }>();
      for (const r of data ?? []) {
        const cur = acc.get(r.product_id) ?? { sum: 0, count: 0 };
        cur.sum += r.rating;
        cur.count += 1;
        acc.set(r.product_id, cur);
      }
      const out = new Map<string, ProductRating>();
      acc.forEach((v, id) => out.set(id, { avg: v.sum / v.count, count: v.count }));
      setRatings(out);
    })();
    return () => { cancelled = true; };
  }, [key]);

  return ratings;
}
