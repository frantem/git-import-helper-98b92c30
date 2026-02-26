import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns a Set of product IDs that have required fields:
 * - any product_custom_fields row
 * - any product_addons row with selection_type = 'radio'
 * Cached for 10 minutes via React Query.
 */
export function useProductsRequiredFields() {
  return useQuery({
    queryKey: ["products-required-fields"],
    queryFn: async (): Promise<Set<string>> => {
      const [{ data: fields }, { data: addons }] = await Promise.all([
        (supabase as any)
          .from("product_custom_fields")
          .select("product_id"),
        (supabase as any)
          .from("product_addons")
          .select("product_id")
          .eq("selection_type", "radio"),
      ]);

      const ids = new Set<string>();
      (fields || []).forEach((r: { product_id: string }) => ids.add(r.product_id));
      (addons || []).forEach((r: { product_id: string }) => ids.add(r.product_id));
      return ids;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
