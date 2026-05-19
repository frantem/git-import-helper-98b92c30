import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DOMAIN = "https://locusfood.by";

function ogImageUrl(src: string | null): string | null {
  if (!src) return null;
  if (src.startsWith("/") || src.startsWith("data:") || src.startsWith("blob:")) return null;
  const params = new URLSearchParams({
    url: src,
    w: "800",
    h: "800",
    q: "78",
    fit: "cover",
    output: "webp",
  });
  return `https://wsrv.nl/?${params.toString()}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const [productsRes, farmersRes, categoriesRes] = await Promise.all([
    supabase
      .from("products")
      .select("id, updated_at, title, image_url")
      .eq("is_active", true)
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false }),
    supabase
      .from("farmers")
      .select("id, slug, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("categories")
      .select("slug, created_at")
      .order("sort_order"),
  ]);

  const products = productsRes.data || [];
  const farmers = farmersRes.data || [];
  const categories = categoriesRes.data || [];
  const now = new Date().toISOString().split("T")[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${DOMAIN}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${DOMAIN}/catalog</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;

  // Category filter pages
  for (const c of categories) {
    if (c.slug === "sets") continue;
    xml += `
  <url>
    <loc>${DOMAIN}/catalog?category=${c.slug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
  }

  // Local landing pages — high priority for SEO
  for (const c of categories) {
    if (c.slug === "sets") continue;
    xml += `
  <url>
    <loc>${DOMAIN}/vitebsk/${c.slug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>`;
  }

  // Products with image tags
  for (const p of products) {
    const lastmod = p.updated_at ? p.updated_at.split("T")[0] : now;
    const img = ogImageUrl(p.image_url);
    const escapedImg = (img || "").replace(/&/g, "&amp;");
    const escapedTitle = (p.title || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    xml += `
  <url>
    <loc>${DOMAIN}/product/${p.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>${img ? `
    <image:image>
      <image:loc>${escapedImg}</image:loc>
      <image:title>${escapedTitle}</image:title>
      <image:caption>${escapedTitle} — купить в Витебске с доставкой</image:caption>
    </image:image>` : ""}
  </url>`;
  }

  // Sellers
  for (const f of farmers) {
    const lastmod = f.created_at ? f.created_at.split("T")[0] : now;
    xml += `
  <url>
    <loc>${DOMAIN}/seller/${f.slug || f.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
  }

  xml += `
</urlset>`;

  return new Response(xml, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=1200",
    },
  });
});
