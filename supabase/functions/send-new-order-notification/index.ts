import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL");

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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderItemRaw {
  quantity: number;
  unit_price: number;
  farmer_id: string;
  variant_label: string | null;
  custom_fields: {
    fields?: Array<{ label: string; value: string }>;
    addons?: Array<{ name: string; price: number }>;
  } | null;
  product: {
    title: string;
    unit: string;
  } | null;
}

interface NewOrderNotificationRequest {
  order_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authorization header required" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Create Supabase client with user's auth context
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Parse request body
    const { order_id }: NewOrderNotificationRequest = await req.json();

    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Use service role client for fetching all data
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Fetch order data
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select(
        `
        id,
        total_amount,
        buyer_id,
        delivery_type,
        delivery_address,
        delivery_cost,
        pickup_point:pickup_points(name)
      `,
      )
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      console.error("Order fetch error:", orderError);
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch buyer's profile
    const { data: buyerProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, phone, email")
      .eq("user_id", order.buyer_id)
      .single();

    // Fetch order items with product info
    const { data: orderItems } = await supabaseAdmin
      .from("order_items")
      .select(
        `
        quantity,
        unit_price,
        farmer_id,
        variant_label,
        custom_fields,
        product:products(title, unit)
      `,
      )
      .eq("order_id", order_id);

    const items = (orderItems || []) as unknown as OrderItemRaw[];

    // Format order details for email
    const totalRubles = Math.floor(order.total_amount / 100);
    const totalKopecks = order.total_amount % 100;
    const formattedTotal = `${totalRubles} р. ${totalKopecks > 0 ? totalKopecks.toString().padStart(2, "0") + " к." : ""}`;

    const formatItemDetails = (item: OrderItemRaw) => {
      let line = `• ${item.product?.title || "Товар"} — ${item.quantity} ${item.product?.unit || "шт."} × ${Math.floor(item.unit_price / 100)} р.`;
      if (item.custom_fields?.fields?.length) {
        line += "\n" + item.custom_fields.fields.map(f => `  ${f.label}: ${f.value}`).join("\n");
      }
      if (item.custom_fields?.addons?.length) {
        line += "\n" + item.custom_fields.addons.map(a => `  + ${a.name}${a.price > 0 ? ` (${Math.floor(a.price / 100)} р.)` : ""}`).join("\n");
      }
      return line;
    };

    const itemsList = items.map(formatItemDetails).join("\n");

    const buyerName = buyerProfile?.full_name || "Покупатель";
    const buyerPhone = buyerProfile?.phone || "не указан";
    const pickupPointData = order.pickup_point as unknown as { name: string } | null;
    const pickupPointName = pickupPointData?.name || "не указан";

    // Delivery type info
    const deliveryType = (order as any).delivery_type || "pickup";
    const deliveryAddress = (order as any).delivery_address || null;
    const deliveryCost = (order as any).delivery_cost || 0;

    const deliveryTypeText =
      deliveryType === "pickup"
        ? `📦 Пункт выдачи: ${pickupPointName}`
        : deliveryType === "courier"
          ? `🚗 Доставка на дом: ${deliveryAddress || "адрес не указан"}`
          : "🏠 Самовывоз";

    const deliveryCostText = deliveryCost > 0 ? ` (+${Math.floor(deliveryCost / 100)} р. за доставку)` : "";

    const emailHtml = `
      <h1>🛒 Новый заказ!</h1>
      <p><strong>Сумма:</strong> ${formattedTotal}${deliveryCostText}</p>
      <p><strong>Покупатель:</strong> ${buyerName}</p>
      <p><strong>Телефон:</strong> ${buyerPhone}</p>
      <p><strong>Доставка:</strong> ${deliveryTypeText}</p>
      <h3>Товары:</h3>
      <pre>${itemsList}</pre>
    `;

    const emailsSent: string[] = [];

    // Send email to admin
    if (ADMIN_EMAIL) {
      try {
        await sendEmail([ADMIN_EMAIL], `🛒 Новый заказ на ${formattedTotal}`, emailHtml);
        emailsSent.push(`admin: ${ADMIN_EMAIL}`);
        console.log("Admin email sent");
      } catch (e) {
        console.error("Error sending admin email:", e);
      }
    }

    // Get unique farmer IDs from order items
    const farmerIds = [...new Set(items.map((item) => item.farmer_id))];

    // Fetch farmer user_ids
    const { data: farmers } = await supabaseAdmin.from("farmers").select("id, user_id, name").in("id", farmerIds);

    if (farmers && farmers.length > 0) {
      // Fetch farmer emails from profiles
      const farmerUserIds = farmers.map((f) => f.user_id).filter(Boolean);

      const { data: farmerProfiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, email")
        .in("user_id", farmerUserIds);

      // Send email to each farmer
      for (const farmer of farmers) {
        const farmerProfile = farmerProfiles?.find((p) => p.user_id === farmer.user_id);
        if (farmerProfile?.email) {
          // Filter items for this farmer
          const farmerItems = items.filter((item) => item.farmer_id === farmer.id);
          const farmerItemsList = farmerItems.map(formatItemDetails).join("\n");

          const farmerEmailHtml = `
            <h1>🛒 Новый заказ для вас!</h1>
            <p><strong>Покупатель:</strong> ${buyerName}</p>
            <p><strong>Пункт выдачи:</strong> ${pickupPointName}</p>
            <h3>Ваши товары в заказе:</h3>
            <pre>${farmerItemsList}</pre>
          `;

          try {
            await sendEmail([farmerProfile.email], `🛒 Новый заказ для ${farmer.name}`, farmerEmailHtml);
            emailsSent.push(`farmer: ${farmerProfile.email}`);
            console.log(`Farmer email sent to ${farmerProfile.email}`);
          } catch (e) {
            console.error(`Error sending farmer email to ${farmerProfile.email}:`, e);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, emailsSent }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Error in send-new-order-notification:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
