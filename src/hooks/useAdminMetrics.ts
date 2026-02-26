import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VisitRow {
  id: string;
  visitor_id: string;
  visited_at: string;
  page_path: string;
  referrer: string | null;
  user_agent: string | null;
  duration_seconds: number | null;
}

interface AdminMetrics {
  visitorsToday: number;
  registrationsToday: number;
  crToday: number;
  visits: VisitRow[];
}

export function useAdminMetrics() {
  return useQuery<AdminMetrics>({
    queryKey: ["admin-metrics"],
    queryFn: async () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      const [visitsRes, regsToday] = await Promise.all([
        supabase
          .from("site_visits")
          .select("id, visitor_id, visited_at, page_path, referrer, user_agent, duration_seconds")
          .gte("visited_at", todayStart)
          .order("visited_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("id")
          .gte("created_at", todayStart),
      ]);

      const visits = (visitsRes.data ?? []) as VisitRow[];
      const uniqueToday = new Set(visits.map(v => v.visitor_id)).size;
      const regCountToday = regsToday.data?.length ?? 0;

      return {
        visitorsToday: uniqueToday,
        registrationsToday: regCountToday,
        crToday: uniqueToday > 0 ? Math.round((regCountToday / uniqueToday) * 1000) / 10 : 0,
        visits,
      };
    },
    refetchInterval: 60000,
  });
}
