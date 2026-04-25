// Edge Function: send-otp
// Sends a 4-digit code to a Belarusian phone number via MTS JSONv2 API.
// Public endpoint (no JWT required) — protected by per-phone rate limits.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MTS_BASE_URL = "https://api.communicator.mts.by";
const ALPHA_NAME = "Locusfood";
const CODE_TTL_SECONDS = 300; // 5 min
const RATE_LIMIT_SECONDS = 60; // min interval between sends per phone
const HOURLY_LIMIT = 10; // max sends per phone per hour

// Belarusian mobile operator codes
const BY_OPERATOR_CODES = ["25", "29", "33", "44"];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Normalize a raw phone string to +375XXXXXXXXX. Returns null if not a valid BY mobile.
function normalizeBYPhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/\D/g, "");
  let normalized = "";
  if (digits.startsWith("375") && digits.length === 12) normalized = digits;
  else if (digits.startsWith("80") && digits.length === 11) normalized = "375" + digits.slice(2);
  else if (digits.length === 9) normalized = "375" + digits;
  else return null;

  const operator = normalized.substring(3, 5);
  if (!BY_OPERATOR_CODES.includes(operator)) return null;
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
  // Salt = phone, so the same code for different phones yields different hashes
  return await sha256Hex(`${phone}:${code}`);
}

function generateOTP(): string {
  // 4-digit code 1000..9999 using crypto for entropy
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(1000 + (buf[0] % 9000));
}

async function sendSmsViaMTS(
  phoneE164: string,
  code: string,
  clientId: string,
  login: string,
  password: string,
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  // MTS expects phone_number as integer without "+"
  const phoneDigits = phoneE164.replace(/^\+/, "");
  const phoneNumber = Number(phoneDigits);

  const text = `Ваш код для входа на Locusfood: ${code}. Никому не сообщайте.`;
  const extraId = `otp-${crypto.randomUUID()}`;

  const url = `${MTS_BASE_URL}/${clientId}/json2/simple`;
  const auth = btoa(`${login}:${password}`);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone_number: phoneNumber,
        extra_id: extraId,
        channels: ["sms"],
        channel_options: {
          sms: {
            text,
            alpha_name: ALPHA_NAME,
            ttl: CODE_TTL_SECONDS,
          },
        },
      }),
    });

    const responseText = await res.text();
    let parsed: { message_id?: string; error_code?: number; error_text?: string } = {};
    try {
      parsed = JSON.parse(responseText);
    } catch {
      // not JSON
    }

    if (!res.ok || parsed.error_code) {
      console.error("MTS API error:", res.status, responseText);
      return { ok: false, error: parsed.error_text || `MTS HTTP ${res.status}` };
    }

    return { ok: true, messageId: parsed.message_id };
  } catch (err) {
    console.error("MTS API network error:", err);
    return { ok: false, error: "Network error contacting MTS" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const mtsLogin = Deno.env.get("MTS_API_LOGIN");
  const mtsPassword = Deno.env.get("MTS_API_PASSWORD");
  const mtsClientId = Deno.env.get("MTS_CLIENT_ID");
  const testMode = Deno.env.get("OTP_TEST_MODE") === "true";

  if (!supabaseUrl || !serviceKey || !mtsLogin || !mtsPassword || !mtsClientId) {
    console.error("Missing required env vars");
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  let body: { phone?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const phone = normalizeBYPhone(body.phone);
  if (!phone) {
    return jsonResponse({ error: "Введите корректный белорусский номер (+375 25/29/33/44)" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  // Rate limit: last send within RATE_LIMIT_SECONDS
  const cutoffSec = new Date(Date.now() - RATE_LIMIT_SECONDS * 1000).toISOString();
  const { data: recent } = await admin
    .from("phone_send_log")
    .select("sent_at")
    .eq("phone", phone)
    .gte("sent_at", cutoffSec)
    .limit(1);

  if (recent && recent.length > 0) {
    return jsonResponse({ error: "Подождите минуту перед повторной отправкой" }, 429);
  }

  // Hourly limit
  const hourCutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: hourlyCount } = await admin
    .from("phone_send_log")
    .select("id", { count: "exact", head: true })
    .eq("phone", phone)
    .gte("sent_at", hourCutoff);

  if ((hourlyCount ?? 0) >= HOURLY_LIMIT) {
    return jsonResponse({ error: "Слишком много запросов. Попробуйте через час." }, 429);
  }

  // Generate code
  const code = generateOTP();
  const codeHash = await hashCode(code, phone);

  // Invalidate previous unverified codes for this phone
  await admin
    .from("phone_otp_codes")
    .update({ verified: true })
    .eq("phone", phone)
    .eq("verified", false);

  // Insert new code
  const expiresAt = new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString();
  const { error: insertError } = await admin.from("phone_otp_codes").insert({
    phone,
    code_hash: codeHash,
    expires_at: expiresAt,
  });

  if (insertError) {
    console.error("Failed to insert OTP:", insertError);
    return jsonResponse({ error: "Ошибка сервера" }, 500);
  }

  // In test mode, skip actual SMS for the test phone
  const isTestPhone = phone === "+375290000000";
  if (testMode && isTestPhone) {
    console.log(`[TEST MODE] OTP for ${phone}: ${code}`);
    await admin.from("phone_send_log").insert({ phone });
    return jsonResponse({
      success: true,
      expires_in: CODE_TTL_SECONDS,
      retry_after: RATE_LIMIT_SECONDS,
      test_code: code, // ONLY returned in test mode for the test phone
    });
  }

  // Send SMS via MTS
  const result = await sendSmsViaMTS(phone, code, mtsClientId, mtsLogin, mtsPassword);
  if (!result.ok) {
    // We logged the actual error already; return generic message
    return jsonResponse({ error: "Не удалось отправить SMS. Попробуйте позже." }, 502);
  }

  // Log successful send
  await admin.from("phone_send_log").insert({ phone });

  // Cleanup very old send_log entries opportunistically (>24h)
  const cleanupCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  admin
    .from("phone_send_log")
    .delete()
    .lt("sent_at", cleanupCutoff)
    .then(() => {});

  return jsonResponse({
    success: true,
    expires_in: CODE_TTL_SECONDS,
    retry_after: RATE_LIMIT_SECONDS,
  });
});
