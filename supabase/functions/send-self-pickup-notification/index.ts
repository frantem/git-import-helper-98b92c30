import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendEmail(to: string[], subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: Deno.env.get("SENDER_EMAIL") || "Locus <info@locusfood.by>",
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Resend API error: ${error}`);
  }
  return res.json();
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch order
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, buyer_id, delivery_type, estimated_delivery_time")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (order.delivery_type !== "self") {
      return new Response(JSON.stringify({ error: "Not a self-pickup order" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get buyer email
    let buyerEmail: string | null = null;
    const { data: buyerProfile } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", order.buyer_id)
      .single();

    buyerEmail = buyerProfile?.email || null;

    if (!buyerEmail) {
      const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(order.buyer_id);
      buyerEmail = authUser?.email || null;
    }

    if (!buyerEmail) {
      console.log("No buyer email found, skipping notification");
      return new Response(JSON.stringify({ success: true, skipped: "no_email" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get order items with product info
    const { data: orderItems } = await supabaseAdmin
      .from("order_items")
      .select("farmer_id, quantity, product:products(title, unit)")
      .eq("order_id", order_id);

    const items = (orderItems || []) as unknown as { farmer_id: string; quantity: number; product: { title: string; unit: string } | null }[];
    const farmerIds = [...new Set(items.map((i) => i.farmer_id))];

    // Fetch farmer addresses
    const { data: farmers } = await supabaseAdmin
      .from("farmers")
      .select("id, name, city, street, house, entrance, apartment")
      .in("id", farmerIds);

    // Build per-farmer blocks with products
    const farmerAddressBlocks = (farmers || []).map((f: any) => {
      const parts: string[] = [];
      if (f.city) parts.push(f.city);
      if (f.street) parts.push(`ул. ${f.street}`);
      if (f.house) parts.push(`д. ${f.house}`);
      if (f.entrance) parts.push(`подъезд ${f.entrance}`);
      if (f.apartment) parts.push(`кв. ${f.apartment}`);
      const address = parts.length > 0 ? parts.join(", ") : "Адрес уточняйте у продавца";

      const farmerItems = items.filter((i) => i.farmer_id === f.id);
      const itemsList = farmerItems
        .map((i) => `<li>${i.product?.title || "Товар"} — ${i.quantity} ${i.product?.unit || "шт."}</li>`)
        .join("");

      return `<div style="margin-bottom: 16px;"><p><strong>${f.name}:</strong> ${address}</p><ul style="margin: 4px 0 0 16px; padding: 0;">${itemsList}</ul></div>`;
    }).join("");

    const pickupTime = order.estimated_delivery_time || "уточняйте у продавца";
    const buyerName = buyerProfile?.full_name || "Покупатель";

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 24px;">
        <h1 style="color: #1a1a1a; font-size: 22px;">LocusFood 🏠 Самовывоз</h1>
        <p>Здравствуйте, ${buyerName}!</p>
        <p>Ваш заказ оформлен. Заберите его в указанное время:</p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px 0; font-size: 16px;"><strong>⏰ Время:</strong> ${pickupTime}</p>
        </div>
        <h3 style="color: #1a1a1a; font-size: 16px;">📍 Адрес для самовывоза:</h3>
        ${farmerAddressBlocks}
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #888; font-size: 13px;">Если у вас есть вопросы, свяжитесь с менеджером +375297399485 (Артём).</p>
        <p style="color: #888; font-size: 13px;">— Locus</p>
      </div>
    `;

    await sendEmail([buyerEmail], "LocusFood 🏠 Самовывоз", emailHtml);
    console.log(`Self-pickup notification sent to ${buyerEmail}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Error in send-self-pickup-notification:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
