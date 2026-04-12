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
      return (data as DBBanner[])?.map(transformBanner) || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - banners change rarely
  });
}
