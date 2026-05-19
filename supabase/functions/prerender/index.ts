/**
 * Prerender Edge Function — returns SEO-friendly HTML for bots.
 *
 * Architecture:
 * - Nginx detects bot User-Agent and proxies to /functions/v1/prerender?path=...
 * - This function fetches data from Supabase, generates a full <head> + <body>
 *   with the real content, and returns HTML that *also* loads the React bundle
 *   (so if a real browser ever hits this, it still works as the SPA).
 *
 * Why this matters: Google/Yandex/social cards see actual product names,
 * descriptions, prices, JSON-LD — not the empty SPA shell.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DOMAIN = "https://locusfood.by";
const CITY = "Витебске";
const CITY_NOM = "Витебск";
const SITE_NAME = "Locus";

// ----- Inlined SEO helpers (kept in sync with src/lib/seoHelpers.ts) -----

function truncateMeta(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ogImageUrl(src: string | null | undefined): string {
  if (!src) return `${DOMAIN}/placeholder.svg`;
  if (src.startsWith("/")) return `${DOMAIN}${src}`;
  if (src.startsWith("data:") || src.startsWith("blob:")) return src;
  const params = new URLSearchParams({
    url: src,
    w: "1200",
    h: "630",
    q: "80",
    fit: "cover",
    output: "webp",
    we: "",
  });
  return `https://wsrv.nl/?${params.toString()}`;
}

interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  jsonLd?: unknown[];
  h1?: string;
  bodyContent?: string; // additional crawlable content
}

// ----- Bundle asset discovery (so prerendered HTML still hydrates correctly) -----

let cachedAssets: { js: string; css: string } | null = null;

async function getBundleAssets(): Promise<{ js: string; css: string }> {
  if (cachedAssets) return cachedAssets;
  try {
    const res = await fetch(`${DOMAIN}/`, { headers: { "User-Agent": "prerender-asset-fetch" } });
    const html = await res.text();
    const jsMatch = html.match(/<script[^>]+src="(\/assets\/index-[^"]+\.js)"/);
    const cssMatch = html.match(/<link[^>]+href="(\/assets\/index-[^"]+\.css)"/);
    cachedAssets = {
      js: jsMatch?.[1] || "/assets/index.js",
      css: cssMatch?.[1] || "/assets/index.css",
    };
    return cachedAssets;
  } catch {
    return { js: "/assets/index.js", css: "/assets/index.css" };
  }
}

// ----- HTML template -----

function renderHtml(meta: PageMeta, assets: { js: string; css: string }): string {
  const safeTitle = escapeHtml(meta.title);
  const safeDesc = escapeHtml(meta.description);
  const ogImg = meta.ogImage || `${DOMAIN}/placeholder.svg`;
  const jsonLdTags = (meta.jsonLd || [])
    .map((data) => `<script type="application/ld+json">${JSON.stringify(data)}</script>`)
    .join("\n    ");

  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDesc}" />
    <meta name="author" content="${SITE_NAME}" />
    <meta name="theme-color" content="#ffffff" />
    <link rel="canonical" href="${escapeHtml(meta.canonical)}" />

    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDesc}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeHtml(meta.canonical)}" />
    <meta property="og:image" content="${escapeHtml(ogImg)}" />
    <meta property="og:locale" content="ru_BY" />
    <meta property="og:site_name" content="${SITE_NAME}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDesc}" />
    <meta name="twitter:image" content="${escapeHtml(ogImg)}" />

    <link rel="preconnect" href="https://jxklppwhgmndlivvtxdd.supabase.co" crossorigin />
    <link rel="dns-prefetch" href="https://jxklppwhgmndlivvtxdd.supabase.co" />

    ${jsonLdTags}

    <link rel="stylesheet" crossorigin href="${assets.css}">
    <script type="module" crossorigin src="${assets.js}"></script>
  </head>

  <body>
    <div id="root"></div>
    <noscript>
      <div style="padding:20px;font-family:sans-serif;max-width:800px;margin:0 auto;">
        ${meta.h1 ? `<h1>${escapeHtml(meta.h1)}</h1>` : ""}
        <p>${safeDesc}</p>
        ${meta.bodyContent || ""}
        <p><a href="${DOMAIN}">Перейти на главную</a></p>
      </div>
    </noscript>
  </body>
</html>`;
}

// ----- Page-specific generators -----

function homeMeta(): PageMeta {
  return {
    title: `${SITE_NAME} — Маркетплейс натуральных продуктов с доставкой в ${CITY}`,
    description: `Свежие фермерские продукты с доставкой в ${CITY}. Сыры, мёд, овощи, фрукты, мясо напрямую от местных производителей. Оплата при получении.`,
    canonical: `${DOMAIN}/`,
    ogImage: `${DOMAIN}/placeholder.svg`,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url: DOMAIN,
        potentialAction: {
          "@type": "SearchAction",
          target: `${DOMAIN}/catalog?search={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "ООО «ЛОКУСФУД»",
        url: DOMAIN,
        logo: `${DOMAIN}/favicon.ico`,
        address: {
          "@type": "PostalAddress",
          addressLocality: CITY_NOM,
          addressCountry: "BY",
        },
      },
    ],
    h1: `${SITE_NAME} — натуральные продукты в ${CITY}`,
    bodyContent: `<p>Маркетплейс местных фермерских продуктов: сыры, мёд, овощи, фрукты, мясо, выпечка с доставкой по ${CITY_NOM}у.</p>`,
  };
}

async function productMeta(supabase: any, idOrSlug: string): Promise<PageMeta | null> {
  // products table is identified by UUID only — no slug column exists.
  const { data: product } = await supabase
    .from("products")
    .select("id, title, description, price, unit, image_url, is_active, is_deleted, farmer_id")
    .eq("id", idOrSlug)
    .maybeSingle();




  if (!product || product.is_deleted) return null;

  // Farmer
  let sellerName: string | null = null;
  if (product.farmer_id) {
    const { data: farmer } = await supabase
      .from("farmers")
      .select("name")
      .eq("id", product.farmer_id)
      .maybeSingle();
    sellerName = farmer?.name || null;
  }

  // Reviews aggregate
  const { data: reviews } = await supabase
    .from("reviews")
    .select("rating")
    .eq("product_id", product.id);
  const reviewCount = reviews?.length || 0;
  const rating = reviewCount > 0
    ? reviews!.reduce((s: number, r: any) => s + r.rating, 0) / reviewCount
    : null;

  const priceFormatted = (product.price / 100).toFixed(2).replace(".", ",");

  const title = `${product.title} купить в ${CITY} | Натуральные продукты ${SITE_NAME}`;

  const description = truncateMeta(
    `Заказать ${product.title} от локальных мастеров в ${CITY}. 100% натуральный состав, единая доставка. Цена: ${priceFormatted} руб.`
  );


  const productLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description || description,
    image: product.image_url ? [ogImageUrl(product.image_url)] : undefined,
    sku: product.id,
    brand: {
      "@type": "Brand",
      name: SITE_NAME
    },
    url: `${DOMAIN}/product/${product.id}`,
    offers: {
      "@type": "Offer",
      url: `${DOMAIN}/product/${product.id}`,
      priceCurrency: "BYN",
      price: (product.price / 100).toFixed(2),
      availability: product.is_active
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      areaServed: { "@type": "City", name: CITY_NOM },
      seller: { "@type": "Organization", name: SITE_NAME },
    },
  };
  if (sellerName) productLd.brand = { "@type": "Brand", name: sellerName };
  if (rating && reviewCount > 0) {
    productLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: rating.toFixed(1),
      reviewCount,
      bestRating: "5",
      worstRating: "1",
    };
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: DOMAIN },
      { "@type": "ListItem", position: 2, name: "Каталог", item: `${DOMAIN}/catalog` },
      { "@type": "ListItem", position: 3, name: product.title, item: `${DOMAIN}/product/${product.id}` },
    ],
  };

  const bodyParts: string[] = [];
  if (product.description) bodyParts.push(`<p>${escapeHtml(product.description)}</p>`);
  bodyParts.push(`<p><strong>Цена:</strong> ${priceFormatted} BYN${product.unit ? ` за ${escapeHtml(product.unit)}` : ""}</p>`);
  if (sellerName) bodyParts.push(`<p><strong>Фермер:</strong> ${escapeHtml(sellerName)}</p>`);
  bodyParts.push(`<p><strong>Доставка:</strong> по ${CITY_NOM}у, оплата при получении</p>`);

  return {
    title,
    description,
    canonical: `${DOMAIN}/product/${product.slug || product.id}`,
    ogImage: ogImageUrl(product.image_url),
    jsonLd: [productLd, breadcrumbLd],
    h1: product.title,
    bodyContent: bodyParts.join("\n"),
  };
}

async function catalogMeta(supabase: any, categorySlug?: string | null): Promise<PageMeta> {
  if (categorySlug) {
    const { data: cat } = await supabase
      .from("categories")
      .select("name, slug, seo_title, seo_description, seo_keywords")
      .eq("slug", categorySlug)
      .maybeSingle();
    if (cat) {
      const title = cat.seo_title || `${cat.name} в ${CITY} — купить свежее и натуральное на ${SITE_NAME}`;
      const description = cat.seo_description
        ? truncateMeta(cat.seo_description)
        : truncateMeta(`${cat.name} в ${CITY} от местных фермеров. Свежие натуральные продукты с доставкой по городу. Оплата при получении.`);
      return {
        title,
        description,
        canonical: `${DOMAIN}/catalog?category=${cat.slug}`,
        h1: `${cat.name} в ${CITY_NOM}е`,
        bodyContent: `<p>${escapeHtml(description)}</p>`,
      };
    }
  }
  return {
    title: `Каталог натуральных продуктов в ${CITY} — ${SITE_NAME}`,
    description: `Каталог фермерских продуктов с доставкой в ${CITY}. Сыры, мёд, овощи, фрукты, мясо, выпечка от местных производителей.`,
    canonical: `${DOMAIN}/catalog`,
    h1: `Каталог продуктов в ${CITY_NOM}е`,
  };
}

async function localLandingMeta(supabase: any, slug: string): Promise<PageMeta | null> {
  const { data: cat } = await supabase
    .from("categories")
    .select("name, slug, seo_title, seo_description, seo_keywords")
    .eq("slug", slug)
    .maybeSingle();
  if (!cat) return null;

  const title = `Купить ${cat.name.toLowerCase()} в ${CITY} с доставкой — фермерские продукты ${SITE_NAME}`;
  const description = truncateMeta(
    cat.seo_description ||
      `${cat.name} в ${CITY}: местные фермерские продукты с доставкой. Свежие, натуральные, оплата при получении. Заказывайте онлайн на ${SITE_NAME}.`
  );

  // FAQ JSON-LD
  const lc = cat.name.toLowerCase();
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Как заказать ${lc} с доставкой в ${CITY}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Выберите товар на сайте Locus, добавьте в корзину и оформите заказ. Доставка по ${CITY_NOM}у в течение дня, оплата при получении.`,
        },
      },
      {
        "@type": "Question",
        name: `Откуда привозят ${lc}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Все товары — от проверенных местных фермеров Витебской области.`,
        },
      },
    ],
  };

  return {
    title,
    description,
    canonical: `${DOMAIN}/vitebsk/${cat.slug}`,
    jsonLd: [faqLd],
    h1: `${cat.name} в ${CITY_NOM}е с доставкой`,
    bodyContent: `<p>${escapeHtml(description)}</p>
      <p>Locus — маркетплейс натуральных продуктов от местных фермеров с доставкой по ${CITY_NOM}у.</p>`,
  };
}

async function sellerMeta(supabase: any, idOrSlug: string): Promise<PageMeta | null> {
  const { data: farmer } = await supabase
    .from("farmers")
    .select("id, name, description, photo_url, slug, city")
    .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
    .maybeSingle();
  if (!farmer) return null;

  const title = `Фермер ${farmer.name} — натуральные продукты в ${CITY} | ${SITE_NAME}`;
  const description = truncateMeta(
    farmer.description ||
      `${farmer.name}: фермерские продукты с доставкой в ${CITY}. Покупайте натуральные продукты напрямую от производителя.`
  );

  return {
    title,
    description,
    canonical: `${DOMAIN}/seller/${farmer.slug || farmer.id}`,
    ogImage: ogImageUrl(farmer.photo_url),
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: farmer.name,
        description: farmer.description,
        image: farmer.photo_url ? ogImageUrl(farmer.photo_url) : undefined,
        url: `${DOMAIN}/seller/${farmer.slug || farmer.id}`,
        address: {
          "@type": "PostalAddress",
          addressLocality: farmer.city || CITY_NOM,
          addressCountry: "BY",
        },
      },
    ],
    h1: farmer.name,
    bodyContent: farmer.description ? `<p>${escapeHtml(farmer.description)}</p>` : "",
  };
}

// ----- Dynamic Sitemap Generator -----

async function generateSitemap(supabase: any): Promise<string> {
  const urls: { loc: string; priority: string; lastmod?: string }[] = [
    { loc: `${DOMAIN}/`, priority: "1.0" },
    { loc: `${DOMAIN}/catalog`, priority: "0.8" },
  ];

  // Fetch Categories
  const { data: categories } = await supabase
    .from("categories")
    .select("slug, updated_at");

  if (categories) {
    categories.forEach((cat: any) => {
      urls.push({
        loc: `${DOMAIN}/catalog?category=${cat.slug}`,
        priority: "0.8",
        lastmod: cat.updated_at ? new Date(cat.updated_at).toISOString().split('T')[0] : undefined
      });
      urls.push({
        loc: `${DOMAIN}/vitebsk/${cat.slug}`,
        priority: "0.8"
      });
    });
  }

  // Fetch Products
  const { data: products } = await supabase
    .from("products")
    .select("id, updated_at, slug, image_url")
    .eq("is_active", true)
    .eq("is_deleted", false);

  const productUrls: any[] = [];
  if (products) {
    products.forEach((prod: any) => {
      productUrls.push({
        loc: `${DOMAIN}/product/${prod.slug || prod.id}`,
        priority: "0.6",
        lastmod: prod.updated_at ? new Date(prod.updated_at).toISOString().split('T')[0] : undefined,
        image: prod.image_url ? ogImageUrl(prod.image_url) : undefined
      });
    });
  }

  const allUrls = [...urls, ...productUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${allUrls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <priority>${u.priority}</priority>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
    ${u.image ? `    <image:image>
      <image:loc>${u.image}</image:loc>
    </image:image>` : ''}
  </url>`).join('\n')}
</urlset>`;

  return xml;
}

// ----- Main handler -----

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  // Path can come from query (?path=/product/uuid) or directly from URL pathname
  const rawPath = url.searchParams.get("path") || url.pathname;
  // Strip /functions/v1/prerender prefix if present
  const cleanPath = rawPath.replace(/^\/functions\/v1\/prerender/, "") || "/";
  const [pathname, search] = cleanPath.split("?");
  const searchParams = new URLSearchParams(search || "");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Dynamic Sitemap
  if (pathname === "/sitemap.xml") {
    try {
      const sitemap = await generateSitemap(supabase);
      return new Response(sitemap, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, max-age=3600, s-maxage=7200",
        },
      });
    } catch (err) {
      console.error("Sitemap generation error:", err);
      return new Response("Error generating sitemap", { status: 500, headers: corsHeaders });
    }
  }

  // Static file passthrough: verification files, robots, sitemap, assets, etc.
  // Without this, prerender returns the homepage HTML for any unknown path,
  // which breaks search-engine verification files (Yandex, Google, etc.).
  const STATIC_FILE_RE = /\.(html?|txt|xml|svg|ico|png|jpe?g|webp|gif|js|css|map|woff2?|json|pdf)$/i;
  if (STATIC_FILE_RE.test(pathname) && pathname !== "/index.html") {
    try {
      const origin = await fetch(`${DOMAIN}${pathname}${search ? `?${search}` : ""}`, {
        headers: { "User-Agent": "prerender-static-passthrough" },
        redirect: "follow",
      });
      const body = await origin.arrayBuffer();
      return new Response(body, {
        status: origin.status,
        headers: {
          ...corsHeaders,
          "Content-Type": origin.headers.get("Content-Type") || "application/octet-stream",
          "Cache-Control": "public, max-age=300, s-maxage=600",
          "X-Robots-Tag": "all",
        },
      });
    } catch (err) {
      console.error("prerender static passthrough error:", err);
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }
  }

  let meta: PageMeta | null = null;

  try {
    if (pathname === "/" || pathname === "") {
      meta = homeMeta();
    } else if (pathname === "/catalog") {
      meta = await catalogMeta(supabase, searchParams.get("category"));
    } else if (pathname.startsWith("/product/")) {
      const id = pathname.replace("/product/", "").split("/")[0];
      meta = await productMeta(supabase, id);
    } else if (pathname.startsWith("/vitebsk/")) {
      const slug = pathname.replace("/vitebsk/", "").split("/")[0];
      meta = await localLandingMeta(supabase, slug);
    } else if (pathname.startsWith("/seller/")) {
      const idOrSlug = pathname.replace("/seller/", "").split("/")[0];
      meta = await sellerMeta(supabase, idOrSlug);
    }
  } catch (err) {
    console.error("prerender error:", err);
  }

  // Fallback to home meta if not matched (e.g. /favorites, /privacy-policy)
  if (!meta) meta = homeMeta();

  const assets = await getBundleAssets();
  const html = renderHtml(meta, assets);

  return new Response(html, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=600",
      "X-Robots-Tag": "all",
    },
  });
});
