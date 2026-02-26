import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const PIXEL_ID = "1214375087525107";
const ACCESS_TOKEN = Deno.env.get("META_ACCESS_TOKEN");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface RequestBody {
  event_name: string;
  event_id: string;
  value: number;
  currency: string;
  user_data?: {
    email?: string;
    phone?: string;
  };
  event_source_url?: string;
  user_agent?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!ACCESS_TOKEN) {
      throw new Error("META_ACCESS_TOKEN is not configured");
    }

    const body: RequestBody = await req.json();
    const { event_name, event_id, value, currency, user_data, event_source_url, user_agent } = body;

    // Get client IP from request headers
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") || "";

    if (!event_name || !event_id) {
      return new Response(
        JSON.stringify({ error: "event_name and event_id are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Build user_data with hashed PII + required fields
    const userDataObj: Record<string, string> = {};
    if (user_data?.email) {
      userDataObj.em = await sha256(user_data.email);
    }
    if (user_data?.phone) {
      userDataObj.ph = await sha256(user_data.phone);
    }
    if (clientIp) {
      userDataObj.client_ip_address = clientIp;
    }
    if (user_agent) {
      userDataObj.client_user_agent = user_agent;
    }

    const eventData: Record<string, any> = {
      event_name,
      event_id,
      event_time: Math.floor(Date.now() / 1000),
      action_source: "website",
      user_data: userDataObj,
    };

    if (event_source_url) {
      eventData.event_source_url = event_source_url;
    }

    if (value !== undefined && currency) {
      eventData.custom_data = { value, currency };
    }

    const url = `https://graph.facebook.com/v21.0/${PIXEL_ID}/events`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [eventData],
        access_token: ACCESS_TOKEN,
      }),
    });

    const result = await res.json();
    console.log("Meta CAPI response:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      status: res.ok ? 200 : 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Meta CAPI error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
