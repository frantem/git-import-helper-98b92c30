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

    const productLinksHtml = products
      .map((p: any, i: number) => {
        const url = `https://locusfood.by/product/${p.id}`;
        return `<li style="margin-bottom: 8px;"><strong>${p.title}</strong> — <a href="${url}" style="color: #22c55e;">оставить отзыв</a></li>`;
      })
      .join("");

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          ${greetingName}, большое спасибо, что выбрали натуральные продукты наших мастеров!
          Ваша обратная связь помогает мастерам становиться лучше, а другим жителям Витебска —
          выбирать самое вкусное.
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #333; margin-top: 20px;">
          Будем очень благодарны, если Вы оставите отзыв о каждом товаре по ссылкам ниже:
        </p>
        <ol style="font-size: 16px; line-height: 1.6; color: #333; padding-left: 20px;">
          ${productLinksHtml}
        </ol>
        <p style="font-size: 16px; line-height: 1.6; color: #333; margin-top: 20px;">
          Если что-то в доставке или качестве продуктов было не так — пожалуйста, напишите или позвоните:
          <br />
          <a href="tel:+375297399485" style="color: #22c55e;">+375 29 739-94-85</a>
          (Артём, <a href="https://t.me/+375297399485" style="color: #22c55e;">Telegram</a>,
          <a href="viber://chat?number=%2B375297399485" style="color: #22c55e;">Viber</a>)
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #333; margin-top: 20px;">
          Мы за честный сервис и всегда готовы исправить ошибки.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 14px; color: #666;">
          С уважением и благодарностью,<br />
          <a href="https://locusfood.by" style="color: #22c55e;">locusfood.by</a>
        </p>
      </div>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: Deno.env.get("SENDER_EMAIL") || "Locus <info@locusfood.by>",
        to: [buyerEmail],
        subject: "Спасибо за заказ! Поделитесь впечатлениями",
        html,
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
