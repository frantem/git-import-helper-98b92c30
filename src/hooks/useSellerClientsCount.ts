import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useSellerClientsCount() {
  const { user, role, isLoading: authLoading } = useAuth();
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setIsLoading(false); return; }
    if (role !== "seller" && role !== "admin") { setIsLoading(false); return; }

    const fetchCount = async () => {
      const { data: farmer } = await supabase
        .from("farmers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!farmer) { setIsLoading(false); return; }

      const { data: items, error } = await supabase
        .from("order_items")
        .select("order:orders(buyer_id, status)")
        .eq("farmer_id", farmer.id);

      if (error || !items) {
        console.error("Error fetching seller clients count:", error);
        setIsLoading(false);
        return;
      }

      const seenOrders = new Set<string>();
      const buyers = new Set<string>();

      for (const item of items as any[]) {
        const o = item.order;
        if (!o?.buyer_id || o.status === "cancelled") continue;
        // order может дублироваться в нескольких order_items
        if (seenOrders.has(o.id || `${o.buyer_id}-${o.created_at}`)) continue;
        seenOrders.add(o.id || `${o.buyer_id}-${o.created_at}`);
        buyers.add(o.buyer_id);
      }

      setCount(buyers.size);
      setIsLoading(false);
    };

    fetchCount();
  }, [user, role, authLoading]);

  return { count, isLoading };
}
