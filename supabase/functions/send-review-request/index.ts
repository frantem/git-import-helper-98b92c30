import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReviewRequestBody {
  order_id: string;
}

const handler = async (req: Request): Promise<Response> => {
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

    const authClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: roles, error: rolesError } = await serviceClient
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

    const { order_id }: ReviewRequestBody = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch order
    const { data: order, error: orderError } = await serviceClient
      .from("orders")
      .select("id, buyer_id")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      console.error("Order fetch failed:", orderError?.message);
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch order items with products
    const { data: items, error: itemsError } = await serviceClient
      .from("order_items")
      .select("product_id, products(id, title)")
      .eq("order_id", order_id);

    if (itemsError) {
      console.error("Items fetch failed:", itemsError.message);
    }

    const products = (items || [])
      .map((it: any) => it.products)
      .filter((p: any) => p && p.id && p.title);

    if (products.length === 0) {
      return new Response(JSON.stringify({ message: "No products to review" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch buyer email + name
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", order.buyer_id)
      .single();

    let buyerEmail = profile?.email || null;
    let buyerName = profile?.full_name || null;

    if (!buyerEmail) {
      const { data: authUser, error: authError } = await serviceClient.auth.admin.getUserById(order.buyer_id);
      if (authError || !authUser?.user?.email) {
        console.error("Buyer email not found:", authError?.message);
        return new Response(JSON.stringify({ error: "Buyer email not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      buyerEmail = authUser.user.email;
    }

    const greetingName = (buyerName && buyerName.trim()) || "уважаемый клиент";

    const linkStyle = "color: #1a1a1a; text-decoration: underline;";

    const productLinksHtml = products
      .map((p: any) => {
        const url = `https://locusfood.by/product/${p.id}`;
        return `<li style="margin-bottom: 8px;"><strong>${p.title}</strong> — <a href="${url}" style="${linkStyle}">оставить отзыв</a></li>`;
      })
      .join("");

    const productLinksText = products
      .map((p: any, i: number) => `${i + 1}. ${p.title}: https://locusfood.by/product/${p.id}`)
      .join("\n");

    const preheader = "Поделитесь впечатлениями о заказе — это поможет другим покупателям.";

    const html = `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Ваш заказ на LocusFood</title></head>
<body style="margin:0;padding:0;background-color:#ffffff;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; color:#1a1a1a;">
    <p style="font-size: 16px; line-height: 1.6;">
      ${greetingName}, вы недавно оформили заказ на locusfood.by.
      Расскажите, как всё прошло — ваша обратная связь помогает мастерам и другим покупателям.
    </p>
    <p style="font-size: 16px; line-height: 1.6; margin-top: 20px;">
      Оставьте, пожалуйста, короткий отзыв о каждом товаре:
    </p>
    <ol style="font-size: 16px; line-height: 1.6; padding-left: 20px;">
      ${productLinksHtml}
    </ol>
    <p style="font-size: 16px; line-height: 1.6; margin-top: 20px;">
      Если что-то было не так, просто ответьте на это письмо или позвоните:
      <a href="tel:+375297399485" style="${linkStyle}">+375 29 739-94-85</a> (Артём).
    </p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
    <p style="font-size: 12px; color: #666; line-height: 1.5;">
      Вы получили это письмо, потому что оформили заказ на
      <a href="https://locusfood.by" style="${linkStyle}">locusfood.by</a>.<br />
      Чтобы отписаться, напишите на
      <a href="mailto:info@locusfood.by?subject=unsubscribe" style="${linkStyle}">info@locusfood.by</a>.
    </p>
  </div>
</body></html>`;

    const text = `${greetingName}, вы недавно оформили заказ на locusfood.by.
Расскажите, как всё прошло — ваша обратная связь помогает мастерам и другим покупателям.

Оставьте, пожалуйста, короткий отзыв о каждом товаре:
${productLinksText}

Если что-то было не так, просто ответьте на это письмо или позвоните: +375 29 739-94-85 (Артём).

---
Вы получили это письмо, потому что оформили заказ на locusfood.by.
Чтобы отписаться, напишите на info@locusfood.by.`;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: Deno.env.get("SENDER_EMAIL") || "Locus <info@locusfood.by>",
        to: [buyerEmail],
        reply_to: "info@locusfood.by",
        subject: "Ваш заказ на LocusFood — как всё прошло?",
        html,
        text,
        headers: {
          "List-Unsubscribe": "<mailto:info@locusfood.by?subject=unsubscribe>, <https://locusfood.by/settings>",
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
    });

    const result = await emailResponse.json();
    console.log("Review request email sent:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-review-request:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
