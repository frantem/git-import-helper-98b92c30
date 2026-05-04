// Edge Function: send-email-change-code
// Sends a 6-digit verification code to a new email for a phone-auth user
// who currently has a placeholder *@phone.locusfood.by email.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CODE_TTL_SECONDS = 600; // 10 min
const RATE_LIMIT_SECONDS = 60;
const HOURLY_LIMIT = 5;

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

function generateCode(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return (arr[0] % 1000000).toString().padStart(6, "0");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(email) && email.length <= 255;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const senderEmail = Deno.env.get("SENDER_EMAIL") || "Locus <info@locusfood.by>";

  if (!supabaseUrl || !serviceKey || !anonKey || !resendKey) {
    console.error("Missing env vars");
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  const token = authHeader.replace("Bearer ", "");

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  const userId = claimsData.claims.sub as string;
  const currentEmail = (claimsData.claims.email as string | undefined) || "";

  if (!currentEmail.toLowerCase().endsWith("@phone.locusfood.by")) {
    return jsonResponse({ success: false, error: "У вас уже указан реальный Email" });
  }

  let body: { new_email?: unknown };
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400); }

  const newEmailRaw = typeof body.new_email === "string" ? body.new_email.trim().toLowerCase() : "";
  if (!isValidEmail(newEmailRaw)) {
    return jsonResponse({ success: false, error: "Некорректный Email" });
  }
  if (newEmailRaw.endsWith("@phone.locusfood.by")) {
    return jsonResponse({ success: false, error: "Введите ваш реальный Email" });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  // Check email not used by another user
  for (let page = 1; page <= 50; page++) {
    const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (!list?.users || list.users.length === 0) break;
    const found = list.users.find((u) => u.email?.toLowerCase() === newEmailRaw && u.id !== userId);
    if (found) {
      return jsonResponse({ success: false, error: "Этот Email уже используется другим аккаунтом" });
    }
    if (list.users.length < 200) break;
  }

  // Rate limit
  const nowMs = Date.now();
  const { data: recent } = await admin
    .from("email_change_codes")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(HOURLY_LIMIT);

  if (recent && recent.length > 0) {
    const lastMs = new Date(recent[0].created_at).getTime();
    if (nowMs - lastMs < RATE_LIMIT_SECONDS * 1000) {
      return jsonResponse({ success: false, error: "Подождите минуту перед повторной отправкой" });
    }
    const hourAgo = nowMs - 3600 * 1000;
    const inHour = recent.filter((r) => new Date(r.created_at).getTime() > hourAgo);
    if (inHour.length >= HOURLY_LIMIT) {
      return jsonResponse({ success: false, error: "Слишком много попыток. Попробуйте позже." });
    }
  }

  const code = generateCode();
  const codeHash = await sha256Hex(`${userId}:${newEmailRaw}:${code}`);
  const expiresAt = new Date(nowMs + CODE_TTL_SECONDS * 1000).toISOString();

  const { error: insertError } = await admin
    .from("email_change_codes")
    .insert({ user_id: userId, new_email: newEmailRaw, code_hash: codeHash, expires_at: expiresAt });

  if (insertError) {
    console.error("Insert error:", insertError);
    return jsonResponse({ success: false, error: "Ошибка сервера" });
  }

  // Send via Resend
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
      <h2 style="margin: 0 0 16px;">Подтверждение Email</h2>
      <p style="margin: 0 0 16px;">Ваш код подтверждения для привязки Email к аккаунту Locus:</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 16px; background: #f5f5f5; text-align: center; border-radius: 8px; margin: 16px 0;">${code}</div>
      <p style="margin: 0 0 8px; color: #666; font-size: 14px;">Код действителен 10 минут.</p>
      <p style="margin: 0; color: #999; font-size: 12px;">Если вы не запрашивали этот код, проигнорируйте письмо.</p>
    </div>`;

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: senderEmail,
      to: [newEmailRaw],
      subject: "Код подтверждения Email — Locus",
      html,
    }),
  });

  if (!resendRes.ok) {
    const errText = await resendRes.text();
    console.error("Resend error:", resendRes.status, errText);
    return jsonResponse({ success: false, error: "Не удалось отправить письмо" });
  }

  return jsonResponse({ success: true });
});
