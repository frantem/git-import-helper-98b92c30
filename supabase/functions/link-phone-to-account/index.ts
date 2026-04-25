// Edge Function: link-phone-to-account
// For an authenticated user (logged in via email/Google),
// verifies an OTP code and binds the phone number to their existing profile.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_ATTEMPTS = 5;
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

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashCode(code: string, phone: string): Promise<string> {
  return await sha256Hex(`${phone}:${code}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  // Validate auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData?.user) return jsonResponse({ error: "Unauthorized" }, 401);

  const userId = userData.user.id;

  let body: { phone?: unknown; code?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const phone = normalizeBYPhone(body.phone);
  if (!phone) return jsonResponse({ error: "Некорректный номер телефона" }, 400);

  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!/^\d{4}$/.test(code)) return jsonResponse({ error: "Код должен состоять из 4 цифр" }, 400);

  const admin = createClient(supabaseUrl, serviceKey);

  // Verify OTP
  const nowIso = new Date().toISOString();
  const { data: otpRow } = await admin
    .from("phone_otp_codes")
    .select("id, code_hash, attempts")
    .eq("phone", phone)
    .eq("verified", false)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otpRow) return jsonResponse({ error: "Код не найден или истёк" }, 400);
  if (otpRow.attempts >= MAX_ATTEMPTS) {
    await admin.from("phone_otp_codes").update({ verified: true }).eq("id", otpRow.id);
    return jsonResponse({ error: "Превышено число попыток" }, 400);
  }

  const expectedHash = await hashCode(code, phone);
  if (expectedHash !== otpRow.code_hash) {
    const newAttempts = otpRow.attempts + 1;
    await admin
      .from("phone_otp_codes")
      .update({ attempts: newAttempts, verified: newAttempts >= MAX_ATTEMPTS })
      .eq("id", otpRow.id);
    return jsonResponse({
      error: `Неверный код. Осталось попыток: ${MAX_ATTEMPTS - newAttempts}`,
    }, 400);
  }

  await admin.from("phone_otp_codes").update({ verified: true }).eq("id", otpRow.id);

  // Make sure another account doesn't already own this phone
  const { data: takenBy } = await admin
    .from("profiles")
    .select("user_id")
    .eq("phone", phone)
    .maybeSingle();

  if (takenBy && takenBy.user_id !== userId) {
    return jsonResponse({ error: "Этот номер уже привязан к другому аккаунту" }, 409);
  }

  // Update current user's profile
  const { error: updError } = await admin
    .from("profiles")
    .update({ phone, phone_verified: true })
    .eq("user_id", userId);

  if (updError) {
    console.error("Profile update error:", updError);
    return jsonResponse({ error: "Не удалось привязать номер" }, 500);
  }

  return jsonResponse({ success: true });
});
