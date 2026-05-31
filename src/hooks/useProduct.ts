import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DBProduct {
  id: string;
  slug: string | null;
  title: string;
  price: number;
  old_price: number | null;
  image_url: string | null;
  description: string | null;
  unit: string;
  stock: number;
  is_new: boolean | null;
  is_active: boolean;
  farmer_id: string;
  category_id: string;
  prep_time_minutes: number;
  order_lead_time_hours: number;
  composition: string | null;
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  shelf_life: string | null;
  farmers?: { id: string; name: string; district: string; village: string | null; photo_url: string | null; city: string | null; street: string | null };
  categories?: { name: string; emoji: string | null };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ProductImage {
  id: string;
  image_url: string;
  sort_order: number;
}

interface ProductVariant {
  id: string;
  label: string;
  price: number;
  unit: string;
  sort_order: number;
  is_default: boolean;
  discount_percent?: number;
}

interface ProductAddon {
  id: string;
  name: string;
  price: number;
  selection_type: string;
  sort_order: number;
}

export function useProduct(idOrSlug: string | undefined) {
  return useQuery({
    queryKey: ["product", idOrSlug],
    queryFn: async () => {
      if (!idOrSlug) return null;

      // Lookup by UUID or slug. UUID-shaped string goes to id.eq; otherwise treat as slug.
      // If lookup by slug returns nothing, fall back to id.eq for safety.
      const isUuid = UUID_RE.test(idOrSlug);
      const baseSelect = `*, farmers(id, name, district, village, photo_url, city, street), categories(name, emoji)`;
      let { data: product, error: productError } = await supabase
        .from("products")
        .select(baseSelect)
        .eq(isUuid ? "id" : "slug", idOrSlug)
        .maybeSingle();

      if (productError) throw productError;
      if (!product && !isUuid) {
        // Slug not found — try by id just in case (shouldn't happen, but safe)
        const fallback = await supabase
          .from("products")
          .select(baseSelect)
          .eq("id", idOrSlug)
          .maybeSingle();
        product = fallback.data;
      }
      if (!product) return null;

      const productId = product.id;

      // Parallel requests for other product data using the actual UUID
      const [imagesRes, variantsRes, addonsRes] = await Promise.all([
        supabase
          .from("product_images")
          .select("*")
          .eq("product_id", productId)
          .order("sort_order"),
        supabase
          .from("product_variants")
          .select("*")
          .eq("product_id", productId)
          .order("sort_order"),
        supabase
          .from("product_addons")
          .select("*")
          .eq("product_id", productId)
          .order("sort_order"),
      ]);

      // Fetch farmer's average rating if we have farmer_id
      let farmerRating: number | null = null;
      if (product?.farmer_id) {
        const { data: farmerProducts } = await supabase
          .from("products")
          .select("id")
          .eq("farmer_id", product.farmer_id);

        if (farmerProducts && farmerProducts.length > 0) {
          const productIds = farmerProducts.map((p) => p.id);
          const { data: allReviews } = await supabase
            .from("reviews")
            .select("rating")
            .in("product_id", productIds);

          if (allReviews && allReviews.length > 0) {
            farmerRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
          }
        }
      }

      return {
        product: product as DBProduct,
        images: (imagesRes.data as ProductImage[]) || [],
        variants: (variantsRes.data as ProductVariant[]) || [],
        addons: (addonsRes.data as ProductAddon[]) || [],
        farmerRating,
      };
    },
    enabled: !!idOrSlug,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Prefetch function for ProductCard hover
export function usePrefetchProduct() {
  const queryClient = useQueryClient();

  return (productId: string) => {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId);
    if (!isUUID) return;

    queryClient.prefetchQuery({
      queryKey: ["product", productId],
      queryFn: async () => {
        const [productRes, imagesRes, variantsRes, addonsRes] = await Promise.all([
          supabase
            .from("products")
            .select(`*, farmers(id, name, district, village, photo_url, city, street), categories(name, emoji)`)
            .eq("id", productId)
            .single(),
          supabase.from("product_images").select("*").eq("product_id", productId).order("sort_order"),
          supabase.from("product_variants").select("*").eq("product_id", productId).order("sort_order"),
          supabase.from("product_addons").select("*").eq("product_id", productId).order("sort_order"),
        ]);

        return {
          product: productRes.data as DBProduct,
          images: (imagesRes.data as ProductImage[]) || [],
          variants: (variantsRes.data as ProductVariant[]) || [],
          addons: (addonsRes.data as ProductAddon[]) || [],
          farmerRating: null, // Skip farmer rating for prefetch
        };
      },
      staleTime: 2 * 60 * 1000,
    });
  };
}
