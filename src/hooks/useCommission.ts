import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CommissionItem = {
  item_id: string;
  order_id: string;
  farmer_id: string;
  farmer_name: string;
  product_title: string;
  variant_label: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;          // unit_price * quantity (копейки)
  rate: number;              // 0.05 | 0.10
  commission: number;        // копейки
  payout: number;            // subtotal - commission (что должен мне продавец отдать/я ему — зависит от delivery_type)
  delivery_type: "pickup" | "self" | string;
  delivery_date: string | null;
  estimated_delivery_time: string | null;
  order_created_at: string;
  buyer_id: string;
  settled_at: string | null;
  is_referral: boolean;
};

export function useCommission() {
  return useQuery({
    queryKey: ["commission"],
    queryFn: async (): Promise<CommissionItem[]> => {
      const { data, error } = await supabase
        .from("order_items")
        .select(`
          id,
          order_id,
          farmer_id,
          quantity,
          unit_price,
          variant_label,
          status,
          settled_at,
          farmer:farmers!inner ( id, name ),
          product:products ( title ),
          order:orders!inner (
            id,
            delivery_type,
            delivery_date,
            referrer_farmer_id,
            buyer_id,
            status,
            created_at
          )
        `)
        .is("settled_at", null)
        .limit(2000);

      if (error) throw error;

      return (data || [])
        .filter((row: any) => row.order && row.order.status !== "cancelled")
        .map((row: any) => {
          const isReferral = row.order.referrer_farmer_id === row.farmer_id;
          const rate = isReferral ? 0.05 : 0.10;
          const subtotal = row.unit_price * row.quantity;
          const commission = Math.round(subtotal * rate);
          return {
            item_id: row.id,
            order_id: row.order_id,
            farmer_id: row.farmer_id,
            farmer_name: row.farmer?.name ?? "—",
            product_title: row.product?.title ?? "—",
            variant_label: row.variant_label,
            quantity: row.quantity,
            unit_price: row.unit_price,
            subtotal,
            rate,
            commission,
            payout: subtotal - commission,
            delivery_type: row.order.delivery_type,
            delivery_date: row.order.delivery_date,
            order_created_at: row.order.created_at,
            buyer_id: row.order.buyer_id,
            settled_at: row.settled_at,
            is_referral: isReferral,
          } satisfies CommissionItem;
        });
    },
  });
}

export function useSettleItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, settled }: { itemId: string; settled: boolean }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("order_items")
        .update({
          settled_at: settled ? new Date().toISOString() : null,
          settled_by: settled ? auth.user?.id ?? null : null,
        })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["commission"] }),
  });
}
