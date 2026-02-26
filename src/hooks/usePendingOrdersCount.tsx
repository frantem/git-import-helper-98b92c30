import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function usePendingOrdersCount() {
  const { user, role } = useAuth();
  const [adminPendingCount, setAdminPendingCount] = useState(0);
  const [sellerPendingCount, setSellerPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Admin: count all pending orders
      if (role === "admin") {
        const { count } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");
        
        setAdminPendingCount(count || 0);
      }

      // Seller: count pending order items for this farmer
      if (role === "seller" || role === "admin") {
        // First get the farmer id for this user
        const { data: farmer } = await supabase
          .from("farmers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (farmer) {
          const { count } = await supabase
            .from("order_items")
            .select("*", { count: "exact", head: true })
            .eq("farmer_id", farmer.id)
            .eq("status", "pending");
          
          setSellerPendingCount(count || 0);
        }
      }

      setIsLoading(false);
    };

    fetchCounts();
  }, [user, role]);

  return { adminPendingCount, sellerPendingCount, isLoading };
}
