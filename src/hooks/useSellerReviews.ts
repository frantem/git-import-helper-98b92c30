import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SellerReview {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  text: string;
  createdAt: string;
  images: string[];
  productId: string;
  productTitle: string;
  productSlug: string | null;
}

export interface SellerReviewsData {
  farmer: { id: string; name: string; photo_url: string | null; slug: string | null } | null;
  reviews: SellerReview[];
  average: number;
  total: number;
  distribution: Record<number, number>;
}

/** Все отзывы обо всех товарах продавца (включая архивные) + агрегаты. */
export function useSellerReviews(idOrSlug: string | undefined) {
  return useQuery<SellerReviewsData>({
    queryKey: ["seller-reviews", idOrSlug],
    enabled: !!idOrSlug,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const empty: SellerReviewsData = {
        farmer: null,
        reviews: [],
        average: 0,
        total: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
      if (!idOrSlug) return empty;

      const cols = "id, name, photo_url, slug";
      const isUuid = UUID_RE.test(idOrSlug);
      let { data: farmer } = await supabase
        .from("farmers")
        .select(cols)
        .eq(isUuid ? "id" : "slug", idOrSlug)
        .maybeSingle();

      if (!farmer && !isUuid) {
        const res = await supabase.from("farmers").select(cols).eq("id", idOrSlug).maybeSingle();
        farmer = res.data;
      }
      if (!farmer) return empty;

      const { data: products } = await supabase
        .from("products")
        .select("id, title, slug")
        .eq("farmer_id", farmer.id);

      if (!products || products.length === 0) return { ...empty, farmer };

      const productMap = new Map(products.map((p) => [p.id, p]));

      const { data: reviewsData } = await supabase
        .from("reviews")
        .select("id, user_id, product_id, rating, text, created_at")
        .in("product_id", products.map((p) => p.id))
        .order("created_at", { ascending: false });

      if (!reviewsData || reviewsData.length === 0) return { ...empty, farmer };

      const [profilesRes, imagesRes] = await Promise.all([
        supabase.rpc("get_public_profile_names", {
          _user_ids: [...new Set(reviewsData.map((r) => r.user_id))],
        }),
        supabase
          .from("review_images")
          .select("review_id, image_url, sort_order")
          .in("review_id", reviewsData.map((r) => r.id))
          .order("sort_order"),
      ]);

      const namesMap = new Map(profilesRes.data?.map((p) => [p.user_id, p.full_name]) || []);
      const imagesMap = new Map<string, string[]>();
      imagesRes.data?.forEach((img) => {
        const arr = imagesMap.get(img.review_id) || [];
        arr.push(img.image_url);
        imagesMap.set(img.review_id, arr);
      });

      const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      const reviews: SellerReview[] = reviewsData.map((r) => {
        distribution[r.rating] = (distribution[r.rating] || 0) + 1;
        const p = productMap.get(r.product_id);
        return {
          id: r.id,
          userId: r.user_id,
          userName: namesMap.get(r.user_id) || "Пользователь",
          rating: r.rating,
          text: r.text || "",
          createdAt: r.created_at,
          images: imagesMap.get(r.id) || [],
          productId: r.product_id,
          productTitle: p?.title || "Товар",
          productSlug: p?.slug || null,
        };
      });

      const total = reviews.length;
      const average = reviews.reduce((s, r) => s + r.rating, 0) / total;

      return { farmer, reviews, average, total, distribution };
    },
  });
}
