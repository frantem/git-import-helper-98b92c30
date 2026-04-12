import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSeoTemplates() {
  return useQuery({
    queryKey: ["seo-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["product_title_template", "category_title_template"]);

      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach((r) => { map[r.key] = r.value; });
      return map;
    },
    staleTime: 30 * 60 * 1000,
  });
}
