import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Banner } from "@/components/BannerCarousel";

interface DBBanner {
  id: string;
  title: string;
  subtitle: string | null;
  discount_text: string | null;
  image_url: string;
  link_url: string | null;
  link_category: string | null;
  link_product_id: string | null;
  color_gradient: string;
  sort_order: number;
  is_active: boolean;
}

const transformBanner = (b: DBBanner): Banner => ({
  id: b.id,
  image: b.image_url,
  title: b.title,
  linkUrl: b.link_url || undefined,
  linkProductId: b.link_product_id || undefined,
  linkCategory: b.link_category || undefined,
});

const LS_BANNERS_KEY = "locus-banners-cache-v1";

// Read the last-known banner list from localStorage so the first paint can
// render the LCP image immediately, without waiting for the Supabase round-trip.
// This pairs with the LCP preload hint in index.html (which uses the cached URL).
function readCachedBanners(): Banner[] | undefined {
  try {
    const raw = localStorage.getItem(LS_BANNERS_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Banner[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function writeCachedBanners(banners: Banner[]) {
  try {
    localStorage.setItem(LS_BANNERS_KEY, JSON.stringify(banners));
  } catch {}
}

export function useBanners() {
  return useQuery({
    queryKey: ["banners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      const banners = (data as DBBanner[])?.map(transformBanner) || [];
      writeCachedBanners(banners);
      return banners;
    },
    placeholderData: readCachedBanners,
    staleTime: 10 * 60 * 1000, // 10 minutes - banners change rarely
  });
}
