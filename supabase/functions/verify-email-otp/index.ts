// Edge Function: verify-email-otp
// Verifies a 6-digit email code, creates a new auth user with password,
// and returns session tokens for client-side auth.setSession.
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

async function hashCode(code: string, email: string): Promise<string> {
  return await sha256Hex(`${email}:${code}`);
}

function isValidEmail(e: string): boolean {
  return /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(e) && e.length <= 255;
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

  let body: { email?: unknown; code?: unknown; password?: unknown; full_name?: unknown };
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400); }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";

  if (!isValidEmail(email)) return jsonResponse({ success: false, error: "Некорректный Email" });
  if (!/^\d{6}$/.test(code)) return jsonResponse({ success: false, error: "Код должен состоять из 6 цифр" });
  if (password.length < 6) return jsonResponse({ success: false, error: "Пароль должен быть минимум 6 символов" });
  if (!fullName) return jsonResponse({ success: false, error: "Введите имя" });

  const admin = createClient(supabaseUrl, serviceKey);

  const nowIso = new Date().toISOString();
  const { data: otpRow, error: otpFetchError } = await admin
    .from("email_otp_codes")
    .select("id, code_hash, attempts, expires_at, verified")
    .eq("email", email)
    .eq("verified", false)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (otpFetchError) {
    console.error("OTP fetch error:", otpFetchError);
    return jsonResponse({ success: false, error: "Ошибка сервера" });
  }

  if (!otpRow) {
    return jsonResponse({ success: false, error: "Код не найден или истёк. Запросите новый." });
  }

  if (otpRow.attempts >= MAX_ATTEMPTS) {
    await admin.from("email_otp_codes").update({ verified: true }).eq("id", otpRow.id);
    return jsonResponse({ success: false, error: "Превышено число попыток. Запросите новый код." });
  }

  const expectedHash = await hashCode(code, email);
  if (expectedHash !== otpRow.code_hash) {
    const newAttempts = otpRow.attempts + 1;
    const reachedLimit = newAttempts >= MAX_ATTEMPTS;
    await admin
      .from("email_otp_codes")
      .update({ attempts: newAttempts, verified: reachedLimit })
      .eq("id", otpRow.id);
    return jsonResponse({
      success: false,
      error: reachedLimit
        ? "Превышено число попыток. Запросите новый код."
        : `Неверный код. Осталось попыток: ${MAX_ATTEMPTS - newAttempts}`,
    });
  }

  await admin.from("email_otp_codes").update({ verified: true }).eq("id", otpRow.id);

  // Double-check email isn't taken (race protection)
  for (let page = 1; page <= 50; page++) {
    const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (!list?.users || list.users.length === 0) break;
    const found = list.users.find((u) => u.email?.toLowerCase() === email);
    if (found) {
      return jsonResponse({ success: false, error: "Этот Email уже зарегистрирован." });
    }
    if (list.users.length < 200) break;
  }

  // Create user with email already confirmed
  const createResult = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createResult.error || !createResult.data.user) {
    console.error("createUser error:", createResult.error);
    return jsonResponse({ success: false, error: "Не удалось создать аккаунт" });
  }

  const userId = createResult.data.user.id;

  // Ensure buyer role (handle_new_user trigger creates profile; full_name via metadata)
  const { data: existingRoles } = await admin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId);
  if (!existingRoles || existingRoles.length === 0) {
    await admin.from("user_roles").insert({ user_id: userId, role: "buyer" });
  }

  // Ensure profile has full_name (trigger reads raw_user_meta_data.full_name; safety update)
  await admin.from("profiles").update({ full_name: fullName, email }).eq("user_id", userId);

  // Sign in: generate magic link and verify it to get session tokens
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    console.error("generateLink error:", linkError);
    return jsonResponse({ success: false, error: "Ошибка авторизации" });
  }

  const anonClient = createClient(supabaseUrl, anonKey);
  const { data: verifyData, error: verifyError } = await anonClient.auth.verifyOtp({
    type: "magiclink",
    token_hash: linkData.properties.hashed_token,
  });

  if (verifyError || !verifyData?.session) {
    console.error("verifyOtp error:", verifyError);
    return jsonResponse({ success: false, error: "Ошибка авторизации" });
  }

  return jsonResponse({
    success: true,
    access_token: verifyData.session.access_token,
    refresh_token: verifyData.session.refresh_token,
  });
});
