import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SellerPost {
  id: string;
  slug: string | null;
  title: string;
  body: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface SellerPromo {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface SellerPageContent {
  posts: SellerPost[];
  promos: SellerPromo[];
}

/**
 * Акции личной витрины. Архивные посты не загружаются в каталог.
 */
export function useSellerPage(farmerId: string | null | undefined) {
  return useQuery<SellerPageContent>({
    queryKey: ["seller-page", farmerId],
    enabled: !!farmerId,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!farmerId) return { posts: [], promos: [] };
      const promosRes = await supabase
        .from("seller_promos")
        .select("id, title, description, image_url, link_url, sort_order, is_active")
        .eq("farmer_id", farmerId)
        .eq("is_active", true)
        .order("sort_order");

      return {
        posts: [],
        promos: (promosRes.data as SellerPromo[]) || [],
      };
    },
  });
}

