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
          // «Непринятый» заказ — это позиция без confirmed_at.
          // order_items.status остаётся 'pending' до нажатия «Собран»,
          // поэтому по нему считать нельзя (иначе доставленные админом
          // заказы висят в бейдже). Заказы delivered/cancelled исключаем.
          const { data } = await supabase
            .from("order_items")
            .select("id, order:orders(status)")
            .eq("farmer_id", farmer.id)
            .is("confirmed_at", null);

          const rows = (data || []) as unknown as Array<{ order: { status: string } | null }>;
          const count = rows.filter(
            (row) =>
              row.order &&
              row.order.status !== "delivered" &&
              row.order.status !== "cancelled"
          ).length;

          setSellerPendingCount(count);
        }
      }

      setIsLoading(false);
    };

    fetchCounts();
  }, [user, role]);

  return { adminPendingCount, sellerPendingCount, isLoading };
}
