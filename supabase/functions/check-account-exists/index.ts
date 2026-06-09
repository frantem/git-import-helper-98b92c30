// Edge Function: check-account-exists
// Public endpoint. Checks if an account already exists with a given phone or email.
// Returns only { exists: boolean } to avoid leaking user data.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BY_OPERATOR_CODES = ["25", "29", "33", "44"];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeBYPhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/\D/g, "");
  let normalized = "";
  if (digits.startsWith("375") && digits.length === 12) normalized = digits;
  else if (digits.startsWith("80") && digits.length === 11) normalized = "375" + digits.slice(2);
  else if (digits.length === 9) normalized = "375" + digits;
  else return null;
  const op = normalized.substring(3, 5);
  if (!BY_OPERATOR_CODES.includes(op)) return null;
  return "+" + normalized;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  let body: { phone?: string; email?: string; exclude_user_id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const exclude = typeof body.exclude_user_id === "string" ? body.exclude_user_id : null;

  try {
    // ---- Phone check ----
    if (body.phone) {
      const phone = normalizeBYPhone(body.phone);
      if (!phone) return jsonResponse({ error: "Invalid phone" }, 400);

      // Match by last 9 digits in profiles.phone (formatting may vary)
      const last9 = phone.replace(/\D/g, "").slice(-9);

      let query = supabase
        .from("profiles")
        .select("user_id, phone")
        .not("phone", "is", null)
        .ilike("phone", `%${last9}%`)
        .limit(20);

      const { data, error } = await query;
      if (error) return jsonResponse({ error: error.message }, 500);

      const exists = (data || []).some((row) => {
        const rowDigits = (row.phone || "").replace(/\D/g, "").slice(-9);
        if (rowDigits !== last9) return false;
        if (exclude && row.user_id === exclude) return false;
        return true;
      });

      return jsonResponse({ exists });
    }

    // ---- Email check ----
    if (body.email) {
      const email = String(body.email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return jsonResponse({ error: "Invalid email" }, 400);
      }

      // Paginate through auth users (admin API has no direct getByEmail)
      const perPage = 1000;
      let page = 1;
      let exists = false;
      for (let i = 0; i < 20; i++) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
        if (error) return jsonResponse({ error: error.message }, 500);
        const users = data?.users || [];
        for (const u of users) {
          if ((u.email || "").toLowerCase() === email) {
            if (!exclude || u.id !== exclude) {
              exists = true;
              break;
            }
          }
        }
        if (exists || users.length < perPage) break;
        page += 1;
      }

      return jsonResponse({ exists });
    }

    return jsonResponse({ error: "phone or email required" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: msg }, 500);
  }
});
