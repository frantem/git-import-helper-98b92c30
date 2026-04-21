import { supabase } from "@/integrations/supabase/client";

// Module-level user data setter (populated from AuthContext)
let currentUserData: { email?: string; phone?: string } = {};

export const setMetaUserData = (data: { email?: string; phone?: string }) => {
  currentUserData = { ...data };
};

interface TrackOptions {
  /** If true, sends only via CAPI (skips browser fbq). Useful for PageView on route change to avoid duplicating the initial pixel call. */
  skipBrowser?: boolean;
  /** If true, uses fbq('trackCustom', ...) instead of 'track'. */
  custom?: boolean;
}

/**
 * Tracks a Meta event via both browser Pixel (fbq) and server-side Conversions API
 * with a shared eventID for automatic deduplication.
 */
export const trackMetaEvent = (
  eventName: string,
  params: Record<string, any> = {},
  options: TrackOptions = {}
) => {
  const eventId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // 1. Browser Pixel (skip for PageView-on-route-change to avoid duplicating index.html call)
  if (!options.skipBrowser && typeof window !== "undefined" && window.fbq) {
    try {
      window.fbq(options.custom ? "trackCustom" : "track", eventName, params, {
        eventID: eventId,
      });
    } catch (e) {
      console.warn("[Meta Pixel] fbq call failed:", e);
    }
  }

  // 2. Server-side CAPI (bypasses ad blockers; improves Match Quality)
  supabase.functions
    .invoke("meta-conversions-api", {
      body: {
        event_name: eventName,
        event_id: eventId,
        custom_data: params,
        event_source_url:
          typeof window !== "undefined" ? window.location.href : undefined,
        user_agent:
          typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        user_data: {
          email: currentUserData.email,
          phone: currentUserData.phone,
        },
      },
    })
    .then((res) => {
      console.log(`[Meta Pixel] CAPI response (${eventName}):`, res.data ?? res.error);
    })
    .catch((err) => console.error(`[Meta Pixel] CAPI error (${eventName}):`, err));

  console.log(`[Meta Pixel] Event sent: ${eventName}`, eventId, params);
  return eventId;
};
