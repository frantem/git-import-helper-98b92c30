// Edge Function: verify-email-change-code
// Verifies the 6-digit code and replaces the user's placeholder email.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_ATTEMPTS = 5;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceKey || !anonKey) {
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);
  const token = authHeader.replace("Bearer ", "");

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) return jsonResponse({ error: "Unauthorized" }, 401);
  const userId = claimsData.claims.sub as string;

  let body: { new_email?: unknown; code?: unknown };
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400); }

  const newEmail = typeof body.new_email === "string" ? body.new_email.trim().toLowerCase() : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!newEmail || !/^\d{6}$/.test(code)) {
    return jsonResponse({ success: false, error: "Введите корректный код" });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const nowIso = new Date().toISOString();

  const { data: row, error: fetchError } = await admin
    .from("email_change_codes")
    .select("id, code_hash, attempts, expires_at, verified")
    .eq("user_id", userId)
    .eq("new_email", newEmail)
    .eq("verified", false)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    console.error("Fetch error:", fetchError);
    return jsonResponse({ success: false, error: "Ошибка сервера" });
  }
  if (!row) {
    return jsonResponse({ success: false, error: "Код не найден или истёк" });
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    await admin.from("email_change_codes").update({ verified: true }).eq("id", row.id);
    return jsonResponse({ success: false, error: "Превышено число попыток" });
  }

  const expectedHash = await sha256Hex(`${userId}:${newEmail}:${code}`);
  if (expectedHash !== row.code_hash) {
    const newAttempts = row.attempts + 1;
    await admin.from("email_change_codes")
      .update({ attempts: newAttempts, verified: newAttempts >= MAX_ATTEMPTS })
      .eq("id", row.id);
    return jsonResponse({
      success: false,
      error: newAttempts >= MAX_ATTEMPTS
        ? "Превышено число попыток"
        : `Неверный код. Осталось попыток: ${MAX_ATTEMPTS - newAttempts}`,
    });
  }

  // Update auth email (overwrites old placeholder)
  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    email: newEmail,
    email_confirm: true,
  });
  if (updateError) {
    console.error("updateUserById error:", updateError);
    return jsonResponse({ success: false, error: "Не удалось обновить Email" });
  }

  // Sync profiles.email
  await admin.from("profiles").update({ email: newEmail }).eq("user_id", userId);

  // Cleanup
  await admin.from("email_change_codes").update({ verified: true }).eq("id", row.id);
  await admin.from("email_change_codes").delete().eq("user_id", userId).eq("verified", false);

  return jsonResponse({ success: true });
});
