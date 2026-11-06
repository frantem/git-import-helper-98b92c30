import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns a Set of product IDs that have required fields:
 * - any product_custom_fields row
 * - any product_addons row with selection_type = 'radio'
 * Cached for 10 minutes via React Query.
 */
export function useProductsRequiredFields(productIds?: string[]) {
  const scopedIds = productIds ? Array.from(new Set(productIds)).sort() : undefined;
  const scope = scopedIds ? scopedIds.join(",") : "all";

  return useQuery({
    queryKey: ["products-required-fields", scope],
    enabled: !scopedIds || scopedIds.length > 0,
    queryFn: async (): Promise<Set<string>> => {
      const fieldsQuery = (supabase as any)
        .from("product_custom_fields")
        .select("product_id");
      const addonsQuery = (supabase as any)
        .from("product_addons")
        .select("product_id")
        .eq("selection_type", "radio");

      const [{ data: fields }, { data: addons }] = await Promise.all([
        scopedIds ? fieldsQuery.in("product_id", scopedIds) : fieldsQuery,
        scopedIds ? addonsQuery.in("product_id", scopedIds) : addonsQuery,
      ]);

      const ids = new Set<string>();
      (fields || []).forEach((r: { product_id: string }) => ids.add(r.product_id));
      (addons || []).forEach((r: { product_id: string }) => ids.add(r.product_id));
      return ids;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
