import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DBProductCategory {
  categories: { name: string; slug: string } | null;
}

interface DBProduct {
  id: string;
  slug: string | null;
  title: string;
  price: number;
  old_price: number | null;
  image_url: string | null;
  unit: string;
  is_new: boolean | null;
  farmer_id: string;
  category_id: string;
  prep_time_minutes: number;
  order_lead_time_hours: number;
  farmers?: { name: string };
  categories?: { name: string; slug: string };
  product_categories?: DBProductCategory[];
  product_variants?: { id: string; label: string; price: number; unit: string; is_default: boolean | null; sort_order: number | null }[];
}

export interface Product {
  id: string;
  slug?: string | null;
  name: string;
  price: number;
  oldPrice?: number;
  discount?: number;
  image: string;
  category: string;
  categories?: string[];
  rating: number | null;
  reviews: number;
  seller: string;
  description: string;
  inStock: boolean;
  deliveryDays: number;
  unit: string;
  isNew?: boolean;
  farmer_id?: string;
  prep_time_minutes?: number;
  order_lead_time_hours?: number;
  defaultVariant?: {
    id: string;
    label: string;
    price: number;
    unit: string;
  };
}

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id,
          title,
          price,
          old_price,
          image_url,
          unit,
          is_new,
          farmer_id,
          category_id,
          prep_time_minutes,
          order_lead_time_hours,
          farmers(name),
          categories(name, slug),
          product_categories(categories(name, slug)),
          product_variants(id, label, price, unit, is_default, sort_order)
        `)
        .eq("is_active", true)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as DBProduct[]) || [];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useProductRatings(productIds: string[]) {
  // Defer the network request off the LCP critical path.
  // Cards render immediately without ratings; stars appear shortly after.
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (productIds.length === 0) return;
    const w = window as any;
    const schedule = w.requestIdleCallback
      ? (cb: () => void) => w.requestIdleCallback(cb, { timeout: 1500 })
      : (cb: () => void) => setTimeout(cb, 600);
    const handle = schedule(() => setEnabled(true));
    return () => {
      if (w.cancelIdleCallback && typeof handle === "number") w.cancelIdleCallback(handle);
      else clearTimeout(handle as any);
    };
  }, [productIds.length]);

  return useQuery({
    queryKey: ["product-ratings", productIds],
    queryFn: async () => {
      if (productIds.length === 0) return {};

      const { data, error } = await supabase
        .from("reviews")
        .select("product_id, rating")
        .in("product_id", productIds);

      if (error) throw error;

      const ratings: Record<string, { sum: number; count: number }> = {};
      data?.forEach((r) => {
        if (!ratings[r.product_id]) {
          ratings[r.product_id] = { sum: 0, count: 0 };
        }
        ratings[r.product_id].sum += r.rating;
        ratings[r.product_id].count += 1;
      });
      return ratings;
    },
    enabled: enabled && productIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function transformProduct(
  p: DBProduct,
  productRatings: Record<string, { sum: number; count: number }>
): Product {
  const ratings = productRatings[p.id];
  
  // Collect all category slugs from product_categories
  const categorySlugs = p.product_categories
    ?.map(pc => pc.categories?.slug)
    .filter((slug): slug is string => !!slug) || [];
  
  // Fallback to legacy category if no product_categories
  const primaryCategory = categorySlugs[0] || p.categories?.slug || "";
  
  return {
    id: p.id,
    name: p.title,
    price: p.price,
    oldPrice: p.old_price || undefined,
    discount: p.old_price ? Math.round((1 - p.price / p.old_price) * 100) : undefined,
    image: p.image_url || "/placeholder.svg",
    category: primaryCategory,
    categories: categorySlugs.length > 0 ? categorySlugs : (p.categories?.slug ? [p.categories.slug] : []),
    rating: ratings ? ratings.sum / ratings.count : null,
    reviews: ratings?.count || 0,
    seller: p.farmers?.name || "Фермер",
    description: "",
    inStock: true,
    deliveryDays: 2,
    unit: p.unit,
    isNew: p.is_new || false,
    farmer_id: p.farmer_id,
    prep_time_minutes: p.prep_time_minutes || 0,
    order_lead_time_hours: p.order_lead_time_hours || 0,
    defaultVariant: (() => {
      const variants = p.product_variants;
      if (!variants || variants.length === 0) return undefined;
      const sorted = [...variants].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      const def = sorted.find(v => v.is_default) || sorted[0];
      return { id: def.id, label: def.label, price: def.price, unit: def.unit };
    })(),
  };
}
