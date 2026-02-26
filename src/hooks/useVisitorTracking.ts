import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const VISITOR_ID_KEY = "visitor_id";
const VISIT_RECORDED_KEY = "visit_recorded";

export function useVisitorTracking() {
  const entryTime = useRef(Date.now());
  const visitId = useRef<string | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem(VISIT_RECORDED_KEY)) return;

    let visitorId = localStorage.getItem(VISITOR_ID_KEY);
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      localStorage.setItem(VISITOR_ID_KEY, visitorId);
    }

    supabase
      .from("site_visits")
      .insert({
        visitor_id: visitorId,
        page_path: window.location.pathname,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
      })
      .select("id")
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          visitId.current = data.id;
          sessionStorage.setItem(VISIT_RECORDED_KEY, "1");
        }
      });
  }, []);

  useEffect(() => {
    const handleUnload = () => {
      if (!visitId.current) return;
      const duration = Math.floor((Date.now() - entryTime.current) / 1000);
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/site_visits?id=eq.${visitId.current}`;
      const body = JSON.stringify({ duration_seconds: duration });
      const headers = {
        "Content-Type": "application/json",
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        "Prefer": "return=minimal",
      };
      // sendBeacon doesn't support PATCH, so use fetch with keepalive
      fetch(url, { method: "PATCH", headers, body, keepalive: true }).catch(() => {});
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);
}
