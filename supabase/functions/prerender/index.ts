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

function encodeSeg(value: string): string {
  return encodeURIComponent(value).replace(/%2F/gi, "-");
}

interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  jsonLd?: unknown[];
  h1?: string;
  bodyContent?: string; // additional crawlable content
  noindex?: boolean; // если true — добавляется <meta name="robots" content="noindex, follow">
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
    ${meta.noindex ? `<meta name="robots" content="noindex, follow" />` : ""}
    ${meta.canonical ? `<link rel="canonical" href="${escapeHtml(meta.canonical)}" />` : ""}


    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDesc}" />
    <meta property="og:type" content="website" />
    ${meta.canonical ? `<meta property="og:url" content="${escapeHtml(meta.canonical)}" />` : ""}
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
  // Accept either UUID or slug. UUID-shaped → lookup by id; otherwise by slug.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isUuid = UUID_RE.test(idOrSlug);
  const baseQuery = supabase
    .from("products")
    .select("id, slug, title, description, price, unit, image_url, is_active, is_deleted, farmer_id, category_id, categories(name)");
  const { data: product, error: productError } = isUuid
    ? await baseQuery.eq("id", idOrSlug).maybeSingle()
    : await baseQuery.eq("slug", idOrSlug).maybeSingle();

  if (productError) {
    console.error("product prerender lookup error:", productError);
    return null;
  }

  // Return null for missing, deleted or inactive products so the handler can
  // respond with 404 + noindex (prevents stale URLs being indexed by Google).
  if (!product || product.is_deleted || !product.is_active) return null;

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

  // Category (for body content freshness)
  const categoryName = product.categories?.name || null;

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

  // Title: включаем имя продавца для уникализации при одинаковых названиях товаров
  const title = sellerName
    ? `${product.title} от ${sellerName} — купить в ${CITY} | ${SITE_NAME}`
    : `${product.title} — купить в ${CITY} | ${SITE_NAME}`;

  // Description: приоритет — реальному описанию продавца, шаблон — фолбэк
  const hasRealDescription = product.description && product.description.trim().length >= 40;
  const description = hasRealDescription
    ? truncateMeta(product.description)
    : truncateMeta(
        `${product.title}${sellerName ? ` от фермера ${sellerName}` : ""} с доставкой в ${CITY}. Натуральный состав, единая доставка по городу. Цена: ${priceFormatted} BYN${product.unit ? ` за ${product.unit}` : ""}.`
      );



  const productLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description || description,
    image: product.image_url ? [ogImageUrl(product.image_url)] : undefined,
    sku: product.id,
    mpn: product.id,
    brand: {
      "@type": "Brand",
      name: sellerName || SITE_NAME,
    },
    url: `${DOMAIN}/product/${product.slug || product.id}`,
    offers: {
      "@type": "Offer",
      url: `${DOMAIN}/product/${product.slug || product.id}`,
      priceCurrency: "BYN",
      price: (product.price / 100).toFixed(2),
      availability: product.is_active
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      areaServed: { "@type": "City", name: CITY_NOM },
      seller: { "@type": "Organization", name: SITE_NAME },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: "6.90",
          currency: "BYN",
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "BY",
          addressRegion: "Витебская область",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
          transitTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "BY",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteWindow",
        merchantReturnDays: 14,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/FreeReturn",
        merchantReturnLink: `${DOMAIN}/delivery`,
      },
    },
  };
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
      { "@type": "ListItem", position: 3, name: product.title, item: `${DOMAIN}/product/${product.slug || product.id}` },
    ],
  };

  const bodyParts: string[] = [];
  if (product.description) bodyParts.push(`<p>${escapeHtml(product.description)}</p>`);
  bodyParts.push(`<h2>Характеристики</h2>`);
  bodyParts.push(`<ul>`);
  bodyParts.push(`<li><strong>Цена:</strong> ${priceFormatted} BYN${product.unit ? ` за ${escapeHtml(product.unit)}` : ""}</li>`);
  if (categoryName) bodyParts.push(`<li><strong>Категория:</strong> ${escapeHtml(categoryName)}</li>`);
  if (sellerName) bodyParts.push(`<li><strong>Фермер:</strong> ${escapeHtml(sellerName)}</li>`);
  bodyParts.push(`<li><strong>Город:</strong> ${CITY_NOM}</li>`);
  bodyParts.push(`<li><strong>Доставка:</strong> курьером по ${CITY_NOM}у или самовывоз, оплата при получении</li>`);
  bodyParts.push(`</ul>`);


  return {
    title,
    description,
    canonical: `${DOMAIN}/product/${encodeSeg(String(product.slug || product.id))}`,
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
        // Canonical points at the dedicated /vitebsk/<slug> landing page to
        // consolidate signals and avoid duplicate-content indexing issues.
        canonical: `${DOMAIN}/vitebsk/${encodeSeg(String(cat.slug))}`,
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
    canonical: `${DOMAIN}/vitebsk/${encodeSeg(String(cat.slug))}`,
    jsonLd: [faqLd],
    h1: `${cat.name} в ${CITY_NOM}е с доставкой`,
    bodyContent: `<p>${escapeHtml(description)}</p>
      <p>Locus — маркетплейс натуральных продуктов от местных фермеров с доставкой по ${CITY_NOM}у.</p>`,
  };
}

async function sellerMeta(supabase: any, idOrSlug: string): Promise<PageMeta | null> {
  // UUIDs go to id.eq, anything else is treated as a slug. Using .or() with a
  // non-UUID in id.eq.* makes PostgREST throw and returns null → false 404.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const query = supabase
    .from("farmers")
    .select("id, name, description, photo_url, slug, city, is_blocked");
  const { data: farmer } = UUID_RE.test(idOrSlug)
    ? await query.eq("id", idOrSlug).maybeSingle()
    : await query.eq("slug", idOrSlug).maybeSingle();
  if (!farmer || farmer.is_blocked) return null;

  const title = `Фермер ${farmer.name} — натуральные продукты в ${CITY} | ${SITE_NAME}`;
  const description = truncateMeta(
    farmer.description ||
      `${farmer.name}: фермерские продукты с доставкой в ${CITY}. Покупайте натуральные продукты напрямую от производителя.`
  );

  return {
    title,
    description,
    canonical: `${DOMAIN}/seller/${encodeSeg(String(farmer.slug || farmer.id))}`,
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

// ----- Static informational pages -----
// Раньше эти страницы падали в fallback homeMeta() и получали canonical
// на главную → Google исключал их как «страница-дубль».

const STATIC_PAGES: Record<string, { title: string; description: string; h1: string }> = {
  "/delivery": {
    title: `Доставка и возврат — ${SITE_NAME}`,
    description: `Условия доставки фермерских продуктов по ${CITY_NOM}у: курьер или самовывоз, оплата при получении, порядок возврата и обмена товара.`,
    h1: `Доставка и возврат`,
  },
  "/privacy-policy": {
    title: `Политика конфиденциальности — ${SITE_NAME}`,
    description: `Политика конфиденциальности маркетплейса ${SITE_NAME} (locusfood.by): порядок обработки, хранения и защиты персональных данных пользователей.`,
    h1: `Политика конфиденциальности`,
  },
  "/oferta": {
    title: `Публичная оферта — ${SITE_NAME}`,
    description: `Публичная оферта маркетплейса ${SITE_NAME} (locusfood.by) на оказание услуг покупателям: порядок заказа, оплаты, доставки и расчёта по фактическому весу.`,
    h1: `Публичная оферта`,
  },
  "/seller-terms": {
    title: `Условия для продавцов — ${SITE_NAME}`,
    description: `Договор-оферта на размещение товаров на маркетплейсе ${SITE_NAME} (locusfood.by): требования к продавцам, комиссия, порядок расчётов.`,
    h1: `Условия для продавцов`,
  },
  "/cookies": {
    title: `Политика использования cookie — ${SITE_NAME}`,
    description: `Какие cookie использует ${SITE_NAME} (locusfood.by), для чего они нужны и как управлять согласием на их использование.`,
    h1: `Политика использования cookie`,
  },
};

function staticPageMeta(pathname: string): PageMeta | null {
  const page = STATIC_PAGES[pathname];
  if (!page) return null;
  return {
    title: page.title,
    description: page.description,
    canonical: `${DOMAIN}${pathname}`,
    h1: page.h1,
    bodyContent: `<p>${escapeHtml(page.description)}</p>`,
  };
}

// Приватные/служебные маршруты: реальные страницы приложения, но индексировать
// их не нужно. Отдаём noindex и НЕ канонизируем на главную.
const PRIVATE_PATHS = new Set([
  "/auth",
  "/cart",
  "/checkout",
  "/profile",
  "/settings",
  "/favorites",
  "/orders",
  "/seller",
  "/seller/products",
  "/seller/orders",
  "/seller/settings",
  "/seller-application",
]);

function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PATHS.has(pathname) || pathname === "/admin" || pathname.startsWith("/admin/");
}

function privateMeta(pathname: string): PageMeta {
  return {
    title: `${SITE_NAME} — натуральные продукты с доставкой в ${CITY}`,
    description: `Служебная страница сайта ${SITE_NAME}. Перейдите в каталог фермерских продуктов с доставкой по ${CITY_NOM}у.`,
    canonical: "",
    h1: SITE_NAME,
    bodyContent: `<p><a href="${DOMAIN}/catalog">Каталог продуктов</a></p>`,
    noindex: true,
  };
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
  const [rawPathname, search] = cleanPath.split("?");
  // Нормализация пути: /index.html → /, срез завершающего слэша (кроме корня),
  // чтобы /oferta/ и /oferta не были двумя разными URL с разными канониклами.
  let pathname = decodeURI(rawPathname || "/");
  if (pathname === "/index.html") pathname = "/";
  if (pathname.length > 1) pathname = pathname.replace(/\/+$/, "") || "/";
  const searchParams = new URLSearchParams(search || "");
  // Трекинговые параметры не участвуют в канониклах.
  for (const key of [...searchParams.keys()]) {
    if (/^utm_/i.test(key) || ["fbclid", "gclid", "yclid", "ref", "from"].includes(key.toLowerCase())) {
      searchParams.delete(key);
    }
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Sitemap generation lives in a separate edge function (`sitemap`) —
  // nginx proxies /sitemap.xml directly to it. The old duplicate generator
  // here was dead code and included /catalog?category=X URLs which we
  // intentionally omit to avoid duplicate-content issues.


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
  // Неизвестный путь или отсутствующая сущность → честный 404 + noindex,
  // чтобы Google удалял такие URL, а не считал их дублями главной.
  let notFound = false;

  try {
    if (pathname === "/" || pathname === "") {
      meta = homeMeta();
    } else if (isPrivatePath(pathname)) {
      meta = privateMeta(pathname);
    } else if (STATIC_PAGES[pathname]) {
      meta = staticPageMeta(pathname);
    } else if (pathname === "/catalog") {
      const categoryParam = searchParams.get("category");
      meta = await catalogMeta(supabase, categoryParam);
      // Фильтрационные URL (discount/new/search) и неизвестные категории —
      // noindex + canonical на /catalog, чтобы не создавать дубли каталога.
      const hasFilterParam =
        searchParams.has("discount") ||
        searchParams.has("new") ||
        searchParams.has("search");
      const unknownCategory = !!categoryParam && meta.canonical === `${DOMAIN}/catalog`;
      if ((hasFilterParam && !categoryParam) || unknownCategory) {
        meta.canonical = `${DOMAIN}/catalog`;
        meta.noindex = true;
      }
    } else if (pathname.startsWith("/product/")) {
      const id = pathname.replace("/product/", "").split("/")[0];
      meta = await productMeta(supabase, id);
      if (!meta) notFound = true;
    } else if (pathname.startsWith("/vitebsk/")) {
      const slug = pathname.replace("/vitebsk/", "").split("/")[0];
      meta = await localLandingMeta(supabase, slug);
      if (!meta) notFound = true;
    } else if (pathname.startsWith("/seller/")) {
      const idOrSlug = pathname.replace("/seller/", "").split("/")[0];
      meta = await sellerMeta(supabase, idOrSlug);
      if (!meta) notFound = true;
    } else {
      // Любой другой путь (опечатки, устаревшие URL, /produkt/... и т.п.)
      notFound = true;
    }
  } catch (err) {
    console.error("prerender error:", err);
  }


  const assets = await getBundleAssets();

  // 404: без canonical (канонизировать несуществующий URL некорректно) + noindex.
  if (notFound || !meta) {
    const notFoundMeta: PageMeta = {
      title: `Страница не найдена — ${SITE_NAME}`,
      description: `Запрошенная страница не найдена или была удалена. Перейдите в каталог ${SITE_NAME}.`,
      canonical: "",
      h1: "Страница не найдена",
      bodyContent: `<p>К сожалению, эта страница больше не существует.</p>
        <p><a href="${DOMAIN}/catalog">Перейти в каталог</a></p>`,
      noindex: true,
    };
    const notFoundHtml = renderHtml(notFoundMeta, assets);
    return new Response(notFoundHtml, {
      status: 404,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=60, s-maxage=120",
        "X-Robots-Tag": "noindex, follow",
      },
    });
  }


  const html = renderHtml(meta, assets);

  return new Response(html, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=600",
      "X-Robots-Tag": meta.noindex ? "noindex, follow" : "all",
    },
  });
});

