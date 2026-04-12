import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Category {
  id: string;
  name: string;
  slug: string;
  emoji: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, emoji, seo_title, seo_description, seo_keywords")
        .order("sort_order");

      if (error) throw error;
      return (data as Category[]) || [];
    },
    staleTime: 30 * 60 * 1000,
  });
}
