import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DOMAIN = "https://locusfood.by";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(value).replace(/%2F/gi, "-");
}

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
      .select("id, slug, updated_at, title, description, image_url, farmer_id")
      .eq("is_active", true)
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false }),
    supabase
      .from("farmers")
      .select("id, slug, description, is_blocked")
      .eq("is_blocked", false)
      .order("created_at", { ascending: false }),
    supabase
      .from("categories")
      .select("slug")
      .order("sort_order"),
  ]);


  const allowedFarmerIds = new Set((farmersRes.data || []).map((f: any) => f.id));
  const products = (productsRes.data || []).filter(
    (p: any) => !p.farmer_id || allowedFarmerIds.has(p.farmer_id)
  );
  const farmers = farmersRes.data || [];
  // Dedupe categories by slug, skip empty/sets
  const seenCatSlugs = new Set<string>();
  const categories = (categoriesRes.data || []).filter((c: any) => {
    if (!c.slug || c.slug === "sets") return false;
    const slug = String(c.slug).toLowerCase();
    if (seenCatSlugs.has(slug)) return false;
    seenCatSlugs.add(slug);
    return true;
  });
  // Dedupe farmer URL keys (slug || id)
  const seenFarmerKeys = new Set<string>();
  const uniqueFarmers = farmers.filter((f: any) => {
    const key = (f.slug || f.id) as string;
    if (!key || seenFarmerKeys.has(key)) return false;
    seenFarmerKeys.add(key);
    return true;
  });
  // Dedupe products by id
  const seenProductIds = new Set<string>();
  const uniqueProducts = products.filter((p: any) => {
    if (!p.id || seenProductIds.has(p.id)) return false;
    seenProductIds.add(p.id);
    return true;
  });

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${DOMAIN}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${DOMAIN}/catalog</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;

  const staticEntries = [
    { path: "/delivery", changefreq: "monthly", priority: "0.6" },
    { path: "/privacy-policy", changefreq: "yearly", priority: "0.3" },
    { path: "/oferta", changefreq: "yearly", priority: "0.3" },
    { path: "/seller-terms", changefreq: "yearly", priority: "0.3" },
    { path: "/cookies", changefreq: "yearly", priority: "0.2" },
  ];

  for (const entry of staticEntries) {
    xml += `
  <url>
    <loc>${DOMAIN}${entry.path}</loc>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`;
  }

  // Note: /catalog?category=<slug> URLs are intentionally omitted.
  // They canonicalize to /vitebsk/<slug> landing pages to avoid duplicates.

  // Local landing pages — high priority for SEO
  for (const c of categories) {
    xml += `
  <url>
    <loc>${DOMAIN}/vitebsk/${encodePathSegment(String(c.slug))}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>`;
  }

  // Products with image tags. Priority снижен для товаров без изображения или
  // без описания (Google расходует бюджет на "тонкий" контент — понижаем сигнал).
  for (const p of uniqueProducts) {
    const lastmod = p.updated_at ? String(p.updated_at).split("T")[0] : null;
    const img = ogImageUrl(p.image_url);
    const escapedImg = img ? escapeXml(img) : "";
    const escapedTitle = escapeXml(p.title || "");
    const hasImage = !!img;
    const hasDescription = p.description && p.description.trim().length >= 40;
    const priority = hasImage && hasDescription ? "0.9" : hasImage || hasDescription ? "0.6" : "0.4";
    const productKey = encodePathSegment(String(p.slug || p.id));
    xml += `
  <url>
    <loc>${DOMAIN}/product/${productKey}</loc>${lastmod ? `
    <lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>${img ? `
    <image:image>
      <image:loc>${escapedImg}</image:loc>
      <image:title>${escapedTitle}</image:title>
      <image:caption>${escapedTitle} — купить в Витебске с доставкой</image:caption>
    </image:image>` : ""}
  </url>`;
  }

  // Sellers — понижаем приоритет для продавцов без описания
  for (const f of uniqueFarmers) {
    const hasDescription = f.description && f.description.trim().length >= 40;
    const priority = hasDescription ? "0.6" : "0.4";
    const sellerKey = encodePathSegment(String(f.slug || f.id));
    xml += `
  <url>
    <loc>${DOMAIN}/seller/${sellerKey}</loc>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
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
