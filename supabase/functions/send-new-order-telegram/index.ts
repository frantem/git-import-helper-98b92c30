// Telegram notifications for new orders (admin + per-seller with confirm button)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");

async function tg(method: string, body: any) {
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) console.error(`Telegram ${method} failed:`, json);
  return json;
}

function formatBYN(cents: number): string {
  const r = Math.floor(cents / 100);
  const k = cents % 100;
  return `${r},${k.toString().padStart(2, "0")} BYN`;
}

function formatFarmerAddress(f: { city?: string | null; street?: string | null; address_details?: string | null }): string {
  return [f.city, f.street, f.address_details].map(s => (s || "").trim()).filter(Boolean).join(", ");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!TELEGRAM_BOT_TOKEN) {
      return new Response(JSON.stringify({ error: "TELEGRAM_BOT_TOKEN not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { orderId, seller_times } = await req.json();
    const sellerTimes: Record<string, string> = seller_times || {};
    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Order + pickup point
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(`id, buyer_id, total_amount, delivery_type, delivery_address, delivery_cost, delivery_date,
        estimated_delivery_time, payment_method, notes,
        pickup_point:pickup_points(name, address)`)
      .eq("id", orderId)
      .single();
    if (orderErr || !order) throw orderErr || new Error("Order not found");

    // Buyer
    const { data: buyer } = await supabase
      .from("profiles").select("full_name").eq("user_id", order.buyer_id).maybeSingle();
    const buyerName = (buyer?.full_name || "клиент").trim();

    // Items
    const { data: items } = await supabase
      .from("order_items")
      .select(`id, quantity, unit_price, farmer_id, variant_label, custom_fields,
        product:products(title, unit)`)
      .eq("order_id", orderId);
    const allItems = (items || []) as any[];

    // Farmers (chat_ids + names + addresses)
    const farmerIds = [...new Set(allItems.map(i => i.farmer_id))];
    const { data: farmers } = await supabase
      .from("farmers")
      .select("id, name, user_id, city, street, address_details")
      .in("id", farmerIds);

    const farmerUserIds = (farmers || []).map(f => f.user_id).filter(Boolean) as string[];
    const { data: farmerProfiles } = await supabase
      .from("profiles")
      .select("user_id, telegram_chat_id")
      .in("user_id", farmerUserIds);

    const chatByFarmer = new Map<string, string>();
    const farmerById = new Map<string, any>();
    (farmers || []).forEach(f => {
      farmerById.set(f.id, f);
      const p = farmerProfiles?.find(pp => pp.user_id === f.user_id);
      if (p?.telegram_chat_id) chatByFarmer.set(f.id, p.telegram_chat_id);
    });

    // Admin chat ids
    const { data: adminSetting } = await supabase
      .from("app_settings").select("value").eq("key", "admin_telegram_chat_id").maybeSingle();
    const adminChatIds = (adminSetting?.value || "")
      .split(",").map((s: string) => s.trim()).filter(Boolean);

    // Format item line
    const itemLine = (it: any): string => {
      const title = it.product?.title || "Товар";
      const variant = it.variant_label ? `(${it.variant_label})` : "";
      const qtySuffix = it.quantity > 1 ? ` × ${it.quantity}` : "";
      const total = it.unit_price * it.quantity;
      return `- ${title}${variant ? " " + variant : ""}${qtySuffix} = ${formatBYN(total)}`;
    };

    const paymentLine = order.payment_method === "card" ? "Карта." : "Наличные.";
    const dateTimeLine = order.estimated_delivery_time
      ? String(order.estimated_delivery_time)
      : "";

    // ============ ADMIN MESSAGE ============
    const adminLines: string[] = [];
    adminLines.push(`Здравствуйте ${buyerName}! Это locusfood`);
    adminLines.push(``);

    if (order.delivery_type === "self") {
      adminLines.push(`Мы получили ваш заказ!`);
      adminLines.push(`Вы выбрали самовывоз:`);
      for (const fid of farmerIds) {
        const f = farmerById.get(fid);
        const myItems = allItems.filter(i => i.farmer_id === fid);
        adminLines.push(``);
        adminLines.push(f?.name || "Продавец");
        const addr = f ? formatFarmerAddress(f) : "";
        if (addr) adminLines.push(addr);
        const t = sellerTimes[fid];
        if (t) adminLines.push(t);
        myItems.forEach(it => adminLines.push(itemLine(it)));
      }
      adminLines.push(``);
      adminLines.push(`Всего: ${formatBYN(order.total_amount)}`);
      adminLines.push(``);
      adminLines.push(paymentLine);
    } else {
      adminLines.push(`Мы получили ваш заказ:`);
      allItems.forEach(it => adminLines.push(itemLine(it)));
      if (order.delivery_cost && order.delivery_cost > 0) {
        adminLines.push(`- Курьер ${formatBYN(order.delivery_cost)}`);
      }
      adminLines.push(`Всего: ${formatBYN(order.total_amount)}`);
      adminLines.push(``);
      if (order.delivery_type === "courier") {
        adminLines.push(`Вы выбрали доставку.`);
        if (order.delivery_address) adminLines.push(`Адрес доставки: ${order.delivery_address}`);
      } else {
        const pp = (order.pickup_point as any)?.name || "пункт выдачи";
        adminLines.push(`Вы выбрали самовывоз из «${pp}».`);
      }
      if (dateTimeLine) adminLines.push(dateTimeLine);
      adminLines.push(paymentLine);
    }

    if (order.notes) {
      adminLines.push(``);
      adminLines.push(`Комментарий: ${order.notes}`);
    }
    adminLines.push(``);
    adminLines.push(`Подскажите:`);
    adminLines.push(`1. Всё верно?`);
    if (order.payment_method === "cash") {
      adminLines.push(`2. С какой суммы нужна будет сдача?`);
    }
    const adminText = adminLines.join("\n");

    for (const chatId of adminChatIds) {
      await tg("sendMessage", { chat_id: chatId, text: adminText });
    }

    // ============ SELLER MESSAGES ============
    const sellerDeliveryWord =
      order.delivery_type === "courier" ? "Курьер" :
      order.delivery_type === "pickup" ? "Самовывоз из ПВЗ" :
      "Самовывоз у продавца";

    for (const farmerId of farmerIds) {
      const chatId = chatByFarmer.get(farmerId);
      if (!chatId) continue;

      const myItems = allItems.filter(i => i.farmer_id === farmerId);
      const timeForSeller = order.delivery_type === "self"
        ? (sellerTimes[farmerId] || "")
        : dateTimeLine;

      const sellerLines = [
        `Новый заказ!`,
        ...myItems.map(itemLine),
        ``,
        sellerDeliveryWord,
      ];
      if (timeForSeller) sellerLines.push(timeForSeller);
      sellerLines.push(``);
      sellerLines.push(`Пожалуйста, подтвердите заказ`);

      const cbData = `c:${orderId.replace(/-/g, "")}:${farmerId.slice(0, 8)}`;
      const res = await tg("sendMessage", {
        chat_id: chatId,
        text: sellerLines.join("\n"),
        reply_markup: {
          inline_keyboard: [[
            { text: "✅ Подтверждаю", callback_data: cbData },
          ]],
        },
      });
      console.log(`Seller ${farmerId} → chat ${chatId}: ok=${res?.ok} cb_len=${cbData.length}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("send-new-order-telegram error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
