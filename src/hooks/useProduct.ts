import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DBProduct {
  id: string;
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

export function useProduct(id: string | undefined) {
  const isUUID = id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  return useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      if (!id || !isUUID) return null;

      // Parallel requests for all product data
      const [productRes, imagesRes, variantsRes, addonsRes] = await Promise.all([
        supabase
          .from("products")
          .select(`
            *,
            farmers(id, name, district, village, photo_url, city, street),
            categories(name, emoji)
          `)
          .eq("id", id)
          .single(),
        supabase
          .from("product_images")
          .select("*")
          .eq("product_id", id)
          .order("sort_order"),
        supabase
          .from("product_variants")
          .select("*")
          .eq("product_id", id)
          .order("sort_order"),
        supabase
          .from("product_addons")
          .select("*")
          .eq("product_id", id)
          .order("sort_order"),
      ]);

      if (productRes.error) throw productRes.error;

      // Fetch farmer's average rating if we have farmer_id
      let farmerRating: number | null = null;
      if (productRes.data?.farmer_id) {
        const { data: farmerProducts } = await supabase
          .from("products")
          .select("id")
          .eq("farmer_id", productRes.data.farmer_id);

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
        product: productRes.data as DBProduct,
        images: (imagesRes.data as ProductImage[]) || [],
        variants: (variantsRes.data as ProductVariant[]) || [],
        addons: (addonsRes.data as ProductAddon[]) || [],
        farmerRating,
      };
    },
    enabled: !!id && !!isUUID,
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
