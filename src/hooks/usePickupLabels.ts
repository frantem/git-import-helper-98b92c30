import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculatePickupDateLabel, getMinskTime } from "@/lib/pickupUtils";
import type { PickupSlots } from "@/components/PickupSettingsSection";

interface PickupProduct {
  id: string;
  farmer_id?: string;
  prep_time_minutes?: number;
  order_lead_time_hours?: number;
}

interface SellerPickupSettings {
  farmer_id: string;
  pickup_slots: PickupSlots | null;
  max_orders_per_day: number;
  busy_dates: string[] | null;
  vacation_dates: string[] | null;
}

const HORIZON_DAYS = 30;

function nextDates(count: number): string[] {
  const now = getMinskTime();
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    out.push(
      `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`
    );
  }
  return out;
}

/**
 * Загружает графики продавцов + текущие счётчики заказов и возвращает
 * Map<productId, label> с метками ближайшей даты самовывоза.
 * Если у продавца нет графика — продукт отсутствует в Map (показывается fallback).
 */
export function usePickupLabels(products: PickupProduct[]): Map<string, string> {
  const farmerIds = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) if (p.farmer_id) set.add(p.farmer_id);
    return Array.from(set).sort();
  }, [products]);

  const settingsQuery = useQuery({
    queryKey: ["seller-pickup-settings", farmerIds],
    queryFn: async () => {
      if (farmerIds.length === 0) return [] as SellerPickupSettings[];
      const { data, error } = await supabase.rpc("get_seller_pickup_settings", {
        farmer_ids: farmerIds,
      });
      if (error) throw error;
      return ((data || []) as unknown) as SellerPickupSettings[];
    },
    enabled: farmerIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const countsQuery = useQuery({
    queryKey: ["seller-order-counts", farmerIds],
    queryFn: async () => {
      if (farmerIds.length === 0) return {} as Record<string, number>;
      const dates = nextDates(HORIZON_DAYS);
      const { data, error } = await supabase.rpc("get_orders_count_by_dates", {
        p_farmer_ids: farmerIds,
        p_check_dates: dates,
      });
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const row of data || []) {
        map[`${row.farmer_id}:${row.order_date}`] = Number(row.order_count) || 0;
      }
      return map;
    },
    enabled: farmerIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  return useMemo(() => {
    const labels = new Map<string, string>();
    const settings = settingsQuery.data;
    const counts = countsQuery.data;
    if (!settings || !counts) return labels;

    const byFarmer = new Map<string, SellerPickupSettings>();
    for (const s of settings) byFarmer.set(s.farmer_id, s);

    for (const product of products) {
      if (!product.farmer_id) continue;
      const s = byFarmer.get(product.farmer_id);
      if (!s) continue;
      const label = calculatePickupDateLabel(
        product.prep_time_minutes || 0,
        s.pickup_slots,
        s.max_orders_per_day,
        s.busy_dates,
        s.vacation_dates,
        counts,
        product.farmer_id,
        product.order_lead_time_hours || 0,
      );
      if (label) labels.set(product.id, label);
    }
    return labels;
  }, [products, settingsQuery.data, countsQuery.data]);
}
