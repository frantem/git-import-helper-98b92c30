import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HomepageBlock {
  id: string;
  title: string;
  emoji: string | null;
  block_type: string;
  category_filter: string | null;
  max_items: number | null;
  sort_order: number;
  is_active: boolean;
}

export function useHomepageBlocks() {
  return useQuery({
    queryKey: ["homepage-blocks"],
    queryFn: async () => {
      // Parallel requests
      const [blocksRes, blockProductsRes] = await Promise.all([
        supabase
          .from("homepage_blocks")
          .select("*")
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("homepage_block_products")
          .select("block_id, product_id")
          .order("sort_order"),
      ]);

      if (blocksRes.error) throw blocksRes.error;
      if (blockProductsRes.error) throw blockProductsRes.error;

      const grouped: Record<string, string[]> = {};
      blockProductsRes.data?.forEach((bp) => {
        if (!grouped[bp.block_id]) {
          grouped[bp.block_id] = [];
        }
        grouped[bp.block_id].push(bp.product_id);
      });

      return {
        blocks: (blocksRes.data as HomepageBlock[]) || [],
        blockProducts: grouped,
      };
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
