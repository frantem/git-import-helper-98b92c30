import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCutoffTime() {
  return useQuery({
    queryKey: ["app-settings", "cutoff_time_minutes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "cutoff_time_minutes")
        .maybeSingle();

      return data ? parseInt(data.value) : 1050; // Default 17:30
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}

export function useAvgDeliveryTime() {
  return useQuery({
    queryKey: ["app-settings", "avg_delivery_time_minutes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "avg_delivery_time_minutes")
        .maybeSingle();

      return data ? parseInt(data.value) : 70; // Default 70 minutes
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function calculateDeliveryHours(prepTimeMinutes: number, cutoffMinutes: number): number {
  const now = new Date();
  const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

  let waitMinutes: number;

  // Check: can seller prepare before cutoff time?
  if (currentTimeInMinutes + prepTimeMinutes <= cutoffMinutes) {
    // Yes - delivery today at cutoff time
    waitMinutes = cutoffMinutes - currentTimeInMinutes;
  } else {
    // No - delivery tomorrow at cutoff time
    waitMinutes = (1440 - currentTimeInMinutes) + cutoffMinutes;
  }

  // Round up to whole hours
  return Math.ceil(waitMinutes / 60);
}

// Calculate courier delivery hours (prep_time + avg_delivery_time)
export function calculateCourierDeliveryHours(prepTimeMinutes: number, avgDeliveryMinutes: number): number {
  const totalMinutes = prepTimeMinutes + avgDeliveryMinutes;
  return Math.ceil(totalMinutes / 60);
}

// Hook to fetch delivery working hours from app_settings
export function useDeliveryWorkingHours() {
  return useQuery({
    queryKey: ["app-settings", "delivery_working_hours"],
    queryFn: async () => {
      const [startRes, endRes] = await Promise.all([
        supabase
          .from("app_settings")
          .select("value")
          .eq("key", "delivery_start_hour")
          .maybeSingle(),
        supabase
          .from("app_settings")
          .select("value")
          .eq("key", "delivery_end_hour")
          .maybeSingle(),
      ]);

      return {
        startHour: startRes.data ? parseInt(startRes.data.value) : 6,
        endHour: endRes.data ? parseInt(endRes.data.value) : 24,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
