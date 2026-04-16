import type { Product } from "@/data/products";

/**
 * Returns a Set of product IDs that have the lowest price
 * among products sharing the same name (only when 2+ products share a name).
 */
export function computeLowestPriceIds(products: Product[]): Set<string> {
  const byName = new Map<string, Product[]>();
  for (const p of products) {
    const key = p.name.trim().toLowerCase();
    const arr = byName.get(key);
    if (arr) arr.push(p);
    else byName.set(key, [p]);
  }

  const ids = new Set<string>();
  for (const group of byName.values()) {
    if (group.length < 2) continue;
    const minPrice = Math.min(...group.map((p) => p.price));
    for (const p of group) {
      if (p.price === minPrice) ids.add(p.id);
    }
  }
  return ids;
}
