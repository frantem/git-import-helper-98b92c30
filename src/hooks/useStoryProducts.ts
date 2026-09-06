import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { StoryProduct } from "@/components/seller/story/StoryProductCard";

/**
 * Проверяет роль продавца и загружает его активные (в наличии) товары.
 */
export function useStoryProducts() {
  const { user, role, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<StoryProduct[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    if (role !== "seller" && role !== "admin") { navigate("/"); return; }
    (async () => {
      const { data: farmer } = await supabase.from("farmers").select("id").eq("user_id", user.id).maybeSingle();
      if (!farmer) { setIsLoading(false); return; }
      const { data } = await supabase
        .from("products")
        .select("id, title, description, price, old_price, unit, image_url, farmer_id, prep_time_minutes, order_lead_time_hours")
        .eq("farmer_id", farmer.id)
        .eq("is_deleted", false)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      setProducts((data ?? []) as StoryProduct[]);
      setIsLoading(false);
    })();
  }, [user, role, authLoading, navigate]);

  return { products, isLoading: authLoading || isLoading };
}
