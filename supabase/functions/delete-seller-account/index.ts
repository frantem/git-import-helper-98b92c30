import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find farmer record(s) for this user
    const { data: farmers } = await admin
      .from("farmers")
      .select("id")
      .eq("user_id", userId);

    const farmerIds = (farmers ?? []).map((f) => f.id);

    if (farmerIds.length > 0) {
      // Find all products of these farmers
      const { data: products } = await admin
        .from("products")
        .select("id")
        .in("farmer_id", farmerIds);
      const productIds = (products ?? []).map((p) => p.id);

      if (productIds.length > 0) {
        // Reviews -> review_images first
        const { data: reviews } = await admin
          .from("reviews")
          .select("id")
          .in("product_id", productIds);
        const reviewIds = (reviews ?? []).map((r) => r.id);
        if (reviewIds.length > 0) {
          await admin.from("review_images").delete().in("review_id", reviewIds);
          await admin.from("reviews").delete().in("id", reviewIds);
        }

        // Custom field options -> custom fields
        const { data: cfields } = await admin
          .from("product_custom_fields")
          .select("id")
          .in("product_id", productIds);
        const cfieldIds = (cfields ?? []).map((c) => c.id);
        if (cfieldIds.length > 0) {
          await admin.from("product_custom_field_options").delete().in("field_id", cfieldIds);
          await admin.from("product_custom_fields").delete().in("id", cfieldIds);
        }

        await admin.from("favorites").delete().in("product_id", productIds);
        await admin.from("homepage_block_products").delete().in("product_id", productIds);
        await admin.from("product_images").delete().in("product_id", productIds);
        await admin.from("product_variants").delete().in("product_id", productIds);
        await admin.from("product_addons").delete().in("product_id", productIds);
        await admin.from("product_categories").delete().in("product_id", productIds);
        await admin.from("products").delete().in("id", productIds);
      }

      await admin.from("farmers").delete().in("id", farmerIds);
    }

    // Remove seller_applications
    await admin.from("seller_applications").delete().eq("user_id", userId);

    // Remove seller role
    await admin.from("user_roles").delete().eq("user_id", userId).eq("role", "seller");

    // Ensure buyer role exists
    const { data: remaining } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId);
    if (!remaining || remaining.length === 0) {
      await admin.from("user_roles").insert({ user_id: userId, role: "buyer" });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
