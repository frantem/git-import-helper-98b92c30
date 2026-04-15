import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { application_id } = await req.json();
    if (!application_id) {
      return new Response(JSON.stringify({ error: "application_id is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!ADMIN_EMAIL || !RESEND_API_KEY) {
      console.error("Missing ADMIN_EMAIL or RESEND_API_KEY");
      return new Response(JSON.stringify({ error: "Email not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: app, error } = await supabaseAdmin
      .from("seller_applications")
      .select("*")
      .eq("id", application_id)
      .single();

    if (error || !app) {
      console.error("Application fetch error:", error);
      return new Response(JSON.stringify({ error: "Application not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const date = new Date(app.created_at).toLocaleString("ru-RU", { timeZone: "Europe/Minsk" });

    const html = `
      <h1>📝 Новая заявка на продавца!</h1>
      <p><strong>Имя:</strong> ${app.name}</p>
      <p><strong>Телефон:</strong> ${app.phone}</p>
      <p><strong>Район:</strong> ${app.district}</p>
      <p><strong>Населённый пункт:</strong> ${app.village || "не указан"}</p>
      <p><strong>Описание:</strong> ${app.description || "не указано"}</p>
      <p><strong>Дата подачи:</strong> ${date}</p>
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
        subject: `📝 Новая заявка на продавца: ${app.name}`,
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

    console.log("Seller application notification sent to", ADMIN_EMAIL);
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
