import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ADMIN_EMAIL = "art.2000.art@mail.ru";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Экранирование, чтобы название магазина не ломало письмо. */
const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, phone, store_type, slug } = await req.json();

    if (!name || !phone || !slug) {
      return new Response(JSON.stringify({ error: "name, phone and slug are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!RESEND_API_KEY) {
      console.error("Missing RESEND_API_KEY");
      return new Response(JSON.stringify({ error: "Email not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const storeLabel = store_type === "food" ? "Еда и сладости" : "Одежда и крафт";
    const safeName = escapeHtml(String(name));
    const safePhone = escapeHtml(String(phone));
    const safeSlug = escapeHtml(String(slug));
    const registeredAt = new Date().toLocaleString("ru-RU", { timeZone: "Europe/Minsk" });

    const html = `
      <h2>🎉 На Locus зарегистрировался новый продавец!</h2>
      <p><strong>Название магазина:</strong> ${safeName}</p>
      <p><strong>Телефон:</strong> ${safePhone}</p>
      <p><strong>Тип витрины:</strong> ${storeLabel}</p>
      <p><strong>Ссылка на витрину:</strong> <a href="https://locusfood.by/seller/${safeSlug}">locusfood.by/seller/${safeSlug}</a></p>
      <p><strong>Время регистрации (Минск):</strong> ${registeredAt}</p>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: Deno.env.get("SENDER_EMAIL") || "Locus <info@locusfood.by>",
        to: [ADMIN_EMAIL],
        subject: `🎉 Новый продавец на Locus: ${name}`,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Resend error:", errText);
      return new Response(JSON.stringify({ error: "Email send failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("New seller notification sent to", ADMIN_EMAIL);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: unknown) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
