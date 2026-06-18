// Edge Function: send-buyer-order-email
// Sends order confirmation email to the buyer, mirroring the Telegram admin message
// (but without the trailing "Подскажите …" questions block).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL") || "Locus <info@locusfood.by>";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function formatBYN(cents: number): string {
  const r = Math.floor(cents / 100);
  const k = cents % 100;
  return `${r},${k.toString().padStart(2, "0")} BYN`;
}

function formatFarmerAddress(f: { city?: string | null; street?: string | null; address_details?: string | null }): string {
  return [f.city, f.street, f.address_details].map((s) => (s || "").trim()).filter(Boolean).join(", ");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function sendEmail(to: string, subject: string, text: string) {
  const html = `<div style="font-family:Arial,sans-serif;white-space:pre-wrap;max-width:600px;margin:0 auto;padding:20px;background:#ffffff;color:#1a1a1a;">${escapeHtml(text)}</div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: SENDER_EMAIL, to: [to], subject, html, text }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend: ${err}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  if (!RESEND_API_KEY) return jsonResponse({ error: "RESEND_API_KEY not configured" }, 500);

  try {
    const { order_id, seller_times } = await req.json();
    if (!order_id) return jsonResponse({ error: "order_id required" }, 400);
    const sellerTimes: Record<string, string> = seller_times || {};

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(`id, buyer_id, total_amount, delivery_type, delivery_address, delivery_cost,
        estimated_delivery_time, payment_method, notes,
        pickup_point:pickup_points(name, address)`)
      .eq("id", order_id)
      .single();
    if (orderErr || !order) return jsonResponse({ error: "Order not found" }, 404);

    const { data: buyer } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", order.buyer_id)
      .maybeSingle();

    const buyerEmail = (buyer?.email || "").trim();
    if (!buyerEmail || buyerEmail.endsWith("@phone.locusfood.by")) {
      return jsonResponse({ success: false, skipped: "no_email" });
    }
    const buyerName = (buyer?.full_name || "клиент").trim();

    const { data: items } = await supabase
      .from("order_items")
      .select(`id, quantity, unit_price, farmer_id, variant_label, product:products(title, unit)`)
      .eq("order_id", order_id);
    const allItems = (items || []) as any[];

    const farmerIds = [...new Set(allItems.map((i) => i.farmer_id))];
    const { data: farmers } = await supabase
      .from("farmers")
      .select("id, name, city, street, address_details")
      .in("id", farmerIds);
    const farmerById = new Map<string, any>();
    (farmers || []).forEach((f) => farmerById.set(f.id, f));

    const itemLine = (it: any): string => {
      const title = it.product?.title || "Товар";
      const variant = it.variant_label ? `(${it.variant_label})` : "";
      const qtySuffix = it.quantity > 1 ? ` × ${it.quantity}` : "";
      const total = it.unit_price * it.quantity;
      return `- ${title}${variant ? " " + variant : ""}${qtySuffix} = ${formatBYN(total)}`;
    };

    const paymentLine = order.payment_method === "card" ? "Карта." : "Наличные.";
    const dateTimeLine = order.estimated_delivery_time ? String(order.estimated_delivery_time) : "";

    const lines: string[] = [];
    lines.push(`Здравствуйте, ${buyerName}! Это locusfood`);
    lines.push(``);

    if (order.delivery_type === "self") {
      lines.push(`Мы получили ваш заказ!`);
      lines.push(`Вы выбрали самовывоз:`);
      for (const fid of farmerIds) {
        const f = farmerById.get(fid);
        const myItems = allItems.filter((i) => i.farmer_id === fid);
        lines.push(``);
        lines.push(f?.name || "Продавец");
        const addr = f ? formatFarmerAddress(f) : "";
        if (addr) lines.push(addr);
        const t = sellerTimes[fid];
        if (t) lines.push(t);
        myItems.forEach((it) => lines.push(itemLine(it)));
      }
      lines.push(``);
      lines.push(`Всего: ${formatBYN(order.total_amount)}`);
      lines.push(``);
      lines.push(paymentLine);
    } else {
      lines.push(`Мы получили ваш заказ:`);
      allItems.forEach((it) => lines.push(itemLine(it)));
      if (order.delivery_cost && order.delivery_cost > 0) {
        lines.push(`- Курьер ${formatBYN(order.delivery_cost)}`);
      }
      lines.push(`Всего: ${formatBYN(order.total_amount)}`);
      lines.push(``);
      if (order.delivery_type === "courier") {
        lines.push(`Вы выбрали доставку.`);
        if (order.delivery_address) lines.push(`Адрес доставки: ${order.delivery_address}`);
      } else {
        const pp = (order.pickup_point as any)?.name || "пункт выдачи";
        lines.push(`Вы выбрали самовывоз из «${pp}».`);
      }
      if (dateTimeLine) lines.push(dateTimeLine);
      lines.push(paymentLine);
    }

    if (order.notes) {
      lines.push(``);
      lines.push(`Комментарий: ${order.notes}`);
    }
    lines.push(``);
    lines.push(`Если есть вопросы — напишите менеджеру: +375297399485 (Артём).`);
    lines.push(`— LocusFood`);

    const text = lines.join("\n");
    await sendEmail(buyerEmail, "LocusFood — ваш заказ принят", text);

    return jsonResponse({ success: true });
  } catch (e: any) {
    console.error("send-buyer-order-email error:", e);
    return jsonResponse({ error: e?.message || "Internal error" }, 500);
  }
});
