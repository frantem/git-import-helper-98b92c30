// Edge Function: phone-password-login
// Public endpoint. Allows users to sign in by Belarusian phone + password.
// Looks up the auth user's email by phone (via profiles), then performs
// signInWithPassword server-side and returns the resulting session tokens.
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

  let body: { phone?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const phone = normalizeBYPhone(body.phone);
  if (!phone) return jsonResponse({ error: "Введите корректный номер телефона" }, 400);
  if (typeof body.password !== "string" || body.password.length < 6) {
    return jsonResponse({ error: "Введите пароль (минимум 6 символов)" }, 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Find profile by phone (compare last 9 digits since stored format may vary).
  const last9 = phone.replace(/\D/g, "").slice(-9);
  const { data: rows, error: profErr } = await admin
    .from("profiles")
    .select("user_id, phone, has_password")
    .not("phone", "is", null)
    .ilike("phone", `%${last9}%`)
    .limit(20);
  if (profErr) return jsonResponse({ error: profErr.message }, 500);

  const match = (rows || []).find(
    (r) => (r.phone || "").replace(/\D/g, "").slice(-9) === last9,
  );
  if (!match) return jsonResponse({ error: "Аккаунт не найден" }, 404);

  if (!match.has_password) {
    return jsonResponse({ error: "no_password" }, 409);
  }

  // Get the auth user's email (could be a virtual phone email or real email).
  const { data: authData, error: authErr } = await admin.auth.admin.getUserById(match.user_id);
  if (authErr || !authData?.user?.email) {
    return jsonResponse({ error: "Аккаунт не найден" }, 404);
  }
  const email = authData.user.email;

  // Anon client for signInWithPassword (does not bypass auth checks).
  const anon = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
  const { data: signInData, error: signInErr } = await anon.auth.signInWithPassword({
    email,
    password: body.password,
  });
  if (signInErr || !signInData?.session) {
    return jsonResponse({ error: "Неверный пароль" }, 401);
  }

  return jsonResponse({
    success: true,
    access_token: signInData.session.access_token,
    refresh_token: signInData.session.refresh_token,
  });
});
