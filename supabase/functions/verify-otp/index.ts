// Edge Function: verify-otp
// Verifies a 4-digit code for a phone number, then either logs the user in
// (creating a new account if needed) or returns a session.
// Public endpoint (no JWT required).
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

// Build a deterministic virtual email for a phone number
function phoneToEmail(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `${digits}@phone.locusfood.by`;
}

function randomPassword(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !serviceKey || !anonKey) {
    console.error("Missing required env vars");
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

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

  // Find latest unverified non-expired OTP
  const nowIso = new Date().toISOString();
  const { data: otpRow, error: otpFetchError } = await admin
    .from("phone_otp_codes")
    .select("id, code_hash, attempts, expires_at, verified")
    .eq("phone", phone)
    .eq("verified", false)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (otpFetchError) {
    console.error("OTP fetch error:", otpFetchError);
    return jsonResponse({ error: "Ошибка сервера" }, 500);
  }

  if (!otpRow) {
    return jsonResponse({ error: "Код не найден или истёк. Запросите новый." }, 400);
  }

  if (otpRow.attempts >= MAX_ATTEMPTS) {
    await admin.from("phone_otp_codes").update({ verified: true }).eq("id", otpRow.id);
    return jsonResponse({ error: "Превышено число попыток. Запросите новый код." }, 400);
  }

  const expectedHash = await hashCode(code, phone);
  if (expectedHash !== otpRow.code_hash) {
    const newAttempts = otpRow.attempts + 1;
    const reachedLimit = newAttempts >= MAX_ATTEMPTS;
    await admin
      .from("phone_otp_codes")
      .update({ attempts: newAttempts, verified: reachedLimit })
      .eq("id", otpRow.id);
    return jsonResponse({
      error: reachedLimit
        ? "Превышено число попыток. Запросите новый код."
        : `Неверный код. Осталось попыток: ${MAX_ATTEMPTS - newAttempts}`,
    }, 400);
  }

  // Mark verified
  await admin.from("phone_otp_codes").update({ verified: true }).eq("id", otpRow.id);

  // Find or create user
  const email = phoneToEmail(phone);

  // Check if user exists by listing users filtered by email
  // (admin.listUsers paginates; with our load it's fine, but use direct query for safety)
  const { data: existingUserList } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1,
    // Note: Supabase JS does not support email filter on listUsers directly,
    // so we use a separate lookup against profiles by phone.
  });
  // Better: lookup by phone in profiles (unique)
  let userId: string | null = null;

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("user_id")
    .eq("phone", phone)
    .maybeSingle();

  if (existingProfile?.user_id) {
    userId = existingProfile.user_id;
  } else {
    // Maybe user exists by virtual email but profile.phone is empty (first-time login)
    // Try to find by getUserByEmail-like trick: use admin.listUsers and filter
    // Fallback: just attempt createUser; if duplicate email -> fetch by listing
    const createResult = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      password: randomPassword(),
      user_metadata: { phone, phone_auth: true },
    });

    if (createResult.error) {
      // If user already exists with this email, find them
      if (createResult.error.message?.toLowerCase().includes("already") ||
          createResult.error.status === 422) {
        // Find existing by paging through users (small project; OK)
        let foundId: string | null = null;
        for (let page = 1; page <= 50 && !foundId; page++) {
          const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 200 });
          if (!list?.users || list.users.length === 0) break;
          const found = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
          if (found) foundId = found.id;
          if (list.users.length < 200) break;
        }
        if (!foundId) {
          console.error("Could not find user despite 'already exists' error");
          return jsonResponse({ error: "Ошибка сервера. Попробуйте позже." }, 500);
        }
        userId = foundId;
      } else {
        console.error("createUser error:", createResult.error);
        return jsonResponse({ error: "Не удалось создать аккаунт" }, 500);
      }
    } else {
      userId = createResult.data.user?.id ?? null;
    }

    if (!userId) {
      return jsonResponse({ error: "Ошибка сервера" }, 500);
    }

    // Update profile with phone (handle_new_user trigger created the profile already)
    await admin
      .from("profiles")
      .update({ phone, phone_verified: true })
      .eq("user_id", userId);

    // Assign buyer role if missing
    const { data: existingRoles } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId);
    if (!existingRoles || existingRoles.length === 0) {
      await admin.from("user_roles").insert({ user_id: userId, role: "buyer" });
    }
  }

  // Ensure phone_verified flag is true for existing users too
  await admin
    .from("profiles")
    .update({ phone_verified: true })
    .eq("user_id", userId);

  // Generate a magic link, then verify it server-side to get a session token pair.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    console.error("generateLink error:", linkError);
    return jsonResponse({ error: "Ошибка авторизации" }, 500);
  }

  // Use anon client to verify the OTP/magiclink and get a real session
  const anonClient = createClient(supabaseUrl, anonKey);
  const { data: verifyData, error: verifyError } = await anonClient.auth.verifyOtp({
    type: "magiclink",
    token_hash: linkData.properties.hashed_token,
  });

  if (verifyError || !verifyData?.session) {
    console.error("verifyOtp error:", verifyError);
    return jsonResponse({ error: "Ошибка авторизации" }, 500);
  }

  return jsonResponse({
    success: true,
    access_token: verifyData.session.access_token,
    refresh_token: verifyData.session.refresh_token,
  });
});
