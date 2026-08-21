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
 * Публичный контент личной страницы продавца (посты + акции).
 * Один параллельный запрос, кэш react-query — не тормозит первый рендер.
 */
export function useSellerPage(farmerId: string | null | undefined) {
  return useQuery<SellerPageContent>({
    queryKey: ["seller-page", farmerId],
    enabled: !!farmerId,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const [postsRes, promosRes] = await Promise.all([
        supabase
          .from("seller_posts")
          .select("id, slug, title, body, image_url, sort_order, is_active")
          .eq("farmer_id", farmerId!)
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("seller_promos")
          .select("id, title, description, image_url, link_url, sort_order, is_active")
          .eq("farmer_id", farmerId!)
          .eq("is_active", true)
          .order("sort_order"),
      ]);

      return {
        posts: (postsRes.data as SellerPost[]) || [],
        promos: (promosRes.data as SellerPromo[]) || [],
      };
    },
  });
}

export interface SellerPostPage {
  post: SellerPost;
  farmer: { id: string; name: string; slug: string | null; photo_url: string | null };
}

/** Одна статья продавца по slug продавца + slug поста. */
export function useSellerPost(sellerSlug?: string, postSlug?: string) {
  return useQuery<SellerPostPage | null>({
    queryKey: ["seller-post", sellerSlug, postSlug],
    enabled: !!sellerSlug && !!postSlug,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sellerSlug!);

      let farmer: SellerPostPage["farmer"] | null = null;
      const cols = "id, name, slug, photo_url";
      if (!isUUID) {
        const res = await supabase.from("farmers").select(cols).eq("slug", sellerSlug!).maybeSingle();
        farmer = (res.data as SellerPostPage["farmer"]) || null;
      }
      if (!farmer) {
        const res = await supabase.from("farmers").select(cols).eq("id", sellerSlug!).maybeSingle();
        farmer = (res.data as SellerPostPage["farmer"]) || null;
      }
      if (!farmer) return null;

      const { data } = await supabase
        .from("seller_posts")
        .select("id, slug, title, body, image_url, sort_order, is_active")
        .eq("farmer_id", farmer.id)
        .eq("is_active", true)
        .eq("slug", postSlug!)
        .maybeSingle();

      if (!data) return null;
      return { post: data as SellerPost, farmer };
    },
  });
}
