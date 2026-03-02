import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeliveryNotificationRequest {
  order_id: string;
}

function formatPrice(kopecks: number): string {
  const rubles = Math.floor(kopecks / 100);
  const kop = kopecks % 100;
  if (kop > 0) {
    return `${rubles} руб. ${kop} коп.`;
  }
  return `${rubles} руб.`;
}

function getStorageDeadline(workingHours: string): string {
  // Parse closing time from working hours (e.g., "9:00-21:00" -> "21:00")
  const closingTime = workingHours?.split("-")[1]?.trim() || "21:00";

  // Calculate date 2 days from now
  const deadlineDate = new Date();
  deadlineDate.setDate(deadlineDate.getDate() + 2);

  // Format date in Russian
  const day = deadlineDate.getDate();
  const months = [
    "января",
    "февраля",
    "марта",
    "апреля",
    "мая",
    "июня",
    "июля",
    "августа",
    "сентября",
    "октября",
    "ноября",
    "декабря",
  ];
  const month = months[deadlineDate.getMonth()];

  return `${day} ${month} ${closingTime}`;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 2. Create Supabase client with user's auth context
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // 3. Verify user authentication
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 4. Verify caller is an admin
    const { data: roles, error: rolesError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (rolesError || !roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden - Admin access required" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 5. Parse request body - only accept order_id
    const { order_id }: DeliveryNotificationRequest = await req.json();

    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 6. Fetch order data from database (don't trust client-provided data)
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select(
        `
        id,
        total_amount,
        buyer_id,
        pickup_point:pickup_points(name, working_hours)
      `,
      )
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 7. Fetch buyer's email from profiles
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("email")
      .eq("user_id", order.buyer_id)
      .single();

    if (profileError || !profile?.email) {
      return new Response(JSON.stringify({ error: "Buyer email not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const buyerEmail = profile.email;
    // Handle pickup_point which can be an object or array from the join
    const pickupPoint = Array.isArray(order.pickup_point) ? order.pickup_point[0] : order.pickup_point;
    const pickupPointName = pickupPoint?.name || "Пункт выдачи";
    const pickupPointWorkingHours = pickupPoint?.working_hours || "9:00-21:00";
    const totalAmount = order.total_amount;

    const priceFormatted = formatPrice(totalAmount);
    const storageDeadline = getStorageDeadline(pickupPointWorkingHours);

    // 8. Send email via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Locus <info@locusfood.by>",
        to: [buyerEmail],
        subject: "Ваш заказ прибыл в пункт выдачи!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #22c55e; margin-bottom: 20px;">Это Locus!</h1>
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              Ваш заказ прибыл в <strong>${pickupPointName}</strong> (${pickupPointWorkingHours}) 
              стоимостью <strong>${priceFormatted}</strong>.
            </p>
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              Срок хранения — до <strong>${storageDeadline}</strong>.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 14px; color: #666;">
              С уважением,<br>Команда Locus
            </p>
          </div>
        `,
      }),
    });

    const result = await emailResponse.json();

    console.log("Delivery notification sent successfully:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-delivery-notification function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
