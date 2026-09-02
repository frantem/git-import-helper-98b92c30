/**
 * Prerender Edge Function — returns SEO-friendly HTML for bots.
 *
 * Architecture:
 * - Nginx detects bot User-Agent and proxies to /functions/v1/prerender?path=...
 * - This function fetches data from Supabase, generates a full <head> + <body>
 *   with the real content, and returns HTML that *also* loads the React bundle
 *   (so if a real browser ever hits this, it still works as the SPA).
 *
 * Важно: контент рендерится ВНУТРИ <div id="root"> (а не в <noscript>) —
 * Googlebot исполняет JS и игнорирует noscript. React (createRoot) при
 * загрузке просто заменит эту разметку приложением.
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
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ----- Inlined SEO helpers (kept in sync with src/lib/seoHelpers.ts) -----

function clean(text: string | null | undefined): string {
  return (text || "").replace(/\s+/g, " ").trim();
}

function truncateMeta(text: string, max = 160): string {
  const c = clean(text);
  if (c.length <= max) return c;
  return c.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
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

function thumbUrl(src: string | null | undefined): string | null {
  if (!src || src.startsWith("/") || src.startsWith("data:") || src.startsWith("blob:")) return null;
  const params = new URLSearchParams({ url: src, w: "400", h: "400", q: "75", fit: "cover", output: "webp" });
  return `https://wsrv.nl/?${params.toString()}`;
}

function encodeSeg(value: string): string {
  return encodeURIComponent(value).replace(/%2F/gi, "-");
}

function formatPrice(kop: number): string {
  return (kop / 100).toFixed(2).replace(".", ",");
}

interface LinkItem {
  href: string;
  label: string;
  image?: string | null;
  meta?: string;
}

interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  jsonLd?: unknown[];
  h1?: string;
  bodyContent?: string; // crawlable content (HTML)
  noindex?: boolean;
  // Blocks of internal links, rendered as sections.
  linkSections?: { title: string; items: LinkItem[]; cards?: boolean }[];
}

// ----- Shared data (categories) -----

async function getCategories(supabase: any): Promise<{ name: string; slug: string }[]> {
  const { data } = await supabase
    .from("categories")
    .select("name, slug, sort_order")
    .order("sort_order");
  const seen = new Set<string>();
  return (data || []).filter((c: any) => {
    if (!c.slug || c.slug === "sets") return false;
    const key = String(c.slug).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function categoryLinks(categories: { name: string; slug: string }[]): LinkItem[] {
  return categories.map((c) => ({
    href: `${DOMAIN}/vitebsk/${encodeSeg(String(c.slug))}`,
    label: clean(c.name),
  }));
}

function productLinks(products: any[]): LinkItem[] {
  return products.map((p) => ({
    href: `${DOMAIN}/product/${encodeSeg(String(p.slug || p.id))}`,
    label: clean(p.title),
    image: thumbUrl(p.image_url),
    meta: `${formatPrice(p.price)} BYN${p.unit ? ` / ${clean(p.unit)}` : ""}`,
  }));
}

// Active products from non-blocked sellers.
async function getProducts(
  supabase: any,
  opts: { categoryId?: string; farmerId?: string; excludeId?: string; limit: number },
): Promise<any[]> {
  let q = supabase
    .from("products")
    .select("id, slug, title, price, unit, image_url, farmer_id, farmers!inner(is_blocked)")
    .eq("is_active", true)
    .eq("is_deleted", false)
    .eq("farmers.is_blocked", false)
    .order("updated_at", { ascending: false })
    .limit(opts.limit + 1);
  if (opts.categoryId) q = q.eq("category_id", opts.categoryId);
  if (opts.farmerId) q = q.eq("farmer_id", opts.farmerId);
  const { data, error } = await q;
  if (error) {
    console.error("products list error:", error);
    return [];
  }
  return (data || []).filter((p: any) => p.id !== opts.excludeId).slice(0, opts.limit);
}

// ----- Bundle asset discovery (so prerendered HTML still hydrates correctly) -----

let cachedAssets: { js: string; css: string } | null = null;

async function getBundleAssets(): Promise<{ js: string; css: string }> {
  if (cachedAssets) return cachedAssets;
  const fallback = { js: "/assets/index.js", css: "/assets/index.css" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(`${DOMAIN}/`, {
      headers: { "User-Agent": "prerender-asset-fetch" },
      signal: controller.signal,
    });
    const html = await res.text();
    const jsMatch = html.match(/<script[^>]+src="(\/assets\/index-[^"]+\.js)"/);
    const cssMatch = html.match(/<link[^>]+href="(\/assets\/index-[^"]+\.css)"/);
    if (jsMatch && cssMatch) {
      cachedAssets = { js: jsMatch[1], css: cssMatch[1] };
      return cachedAssets;
    }
    return fallback;
  } catch (err) {
    console.error("asset fetch failed/timeout:", err);
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

// ----- HTML template -----

function renderLinkSections(sections: PageMeta["linkSections"]): string {
  if (!sections || sections.length === 0) return "";
  return sections
    .filter((s) => s.items.length > 0)
    .map((s) => {
      const items = s.items
        .map((it) => {
          const img = s.cards && it.image
            ? `<img src="${escapeHtml(it.image)}" alt="${escapeHtml(it.label)}" width="120" height="120" loading="lazy" />`
            : "";
          const meta = it.meta ? `<span class="pr-meta">${escapeHtml(it.meta)}</span>` : "";
          return `<li><a href="${escapeHtml(it.href)}">${img}<span class="pr-label">${escapeHtml(it.label)}</span></a>${meta}</li>`;
        })
        .join("");
      return `<section class="pr-section"><h2>${escapeHtml(s.title)}</h2><ul class="${s.cards ? "pr-cards" : "pr-list"}">${items}</ul></section>`;
    })
    .join("\n");
}

function renderHtml(meta: PageMeta, assets: { js: string; css: string }, categories: { name: string; slug: string }[]): string {
  const safeTitle = escapeHtml(meta.title);
  const safeDesc = escapeHtml(meta.description);
  const ogImg = meta.ogImage || `${DOMAIN}/placeholder.svg`;
  const jsonLdTags = (meta.jsonLd || [])
    .map((data) => `<script type="application/ld+json">${JSON.stringify(data)}</script>`)
    .join("\n    ");

  const navCats = categoryLinks(categories)
    .map((c) => `<a href="${escapeHtml(c.href)}">${escapeHtml(c.label)}</a>`)
    .join(" · ");

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

    <style>
      .pr{font-family:system-ui,sans-serif;max-width:960px;margin:0 auto;padding:16px;color:#111;line-height:1.5}
      .pr nav{font-size:14px;margin-bottom:16px}
      .pr nav a{color:#111;margin-right:8px}
      .pr h1{font-size:26px;margin:8px 0}
      .pr h2{font-size:18px;margin:20px 0 8px}
      .pr ul{padding-left:20px}
      .pr-cards{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
      .pr-cards li a{display:block;color:#111;text-decoration:none}
      .pr-cards img{width:100%;height:auto;aspect-ratio:1/1;object-fit:cover;border-radius:12px;display:block}
      .pr-label{display:block;margin-top:6px;font-size:14px}
      .pr-meta{font-size:13px;color:#555}
      .pr footer{margin-top:24px;font-size:13px;color:#555}
    </style>
    <link rel="stylesheet" crossorigin href="${assets.css}">
    <script type="module" crossorigin src="${assets.js}"></script>
  </head>

  <body>
    <div id="root">
      <div class="pr">
        <nav aria-label="Навигация">
          <a href="${DOMAIN}/">Главная</a>
          <a href="${DOMAIN}/catalog">Каталог</a>
          <a href="${DOMAIN}/delivery">Доставка</a>
        </nav>
        <main>
          ${meta.h1 ? `<h1>${escapeHtml(meta.h1)}</h1>` : ""}
          <p>${safeDesc}</p>
          ${meta.bodyContent || ""}
          ${renderLinkSections(meta.linkSections)}
        </main>
        <footer>
          <p><strong>Категории:</strong> ${navCats}</p>
          <p>${SITE_NAME} — маркетплейс натуральных продуктов от местных производителей с доставкой по ${CITY_NOM}у.
            <a href="${DOMAIN}/oferta">Оферта</a> · <a href="${DOMAIN}/privacy-policy">Конфиденциальность</a> · <a href="${DOMAIN}/seller-terms">Продавцам</a></p>
        </footer>
      </div>
    </div>
  </body>
</html>`;
}

// ----- Page-specific generators -----

async function homeMeta(supabase: any, categories: { name: string; slug: string }[]): Promise<PageMeta> {
  const products = await getProducts(supabase, { limit: 24 });
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
    linkSections: [
      { title: "Категории", items: categoryLinks(categories) },
      { title: "Новинки и популярные товары", items: productLinks(products), cards: true },
    ],
  };
}

type ProductLookup =
  | { kind: "ok"; meta: PageMeta }
  | { kind: "redirect"; to: string }
  | { kind: "gone" }
  | { kind: "missing" };

async function productMeta(supabase: any, idOrSlug: string): Promise<ProductLookup> {
  const isUuid = UUID_RE.test(idOrSlug);
  const baseQuery = supabase
    .from("products")
    .select("id, slug, title, description, price, unit, image_url, is_active, is_deleted, farmer_id, category_id, categories(name, slug)");
  const { data: product, error: productError } = isUuid
    ? await baseQuery.eq("id", idOrSlug).maybeSingle()
    : await baseQuery.eq("slug", idOrSlug).maybeSingle();

  if (productError) {
    console.error("product prerender lookup error:", productError);
    return { kind: "missing" };
  }
  if (!product) return { kind: "missing" };
  if (product.is_deleted) return { kind: "gone" };

  // Старые UUID-ссылки → 301 на slug-версию (склейка дублей).
  if (isUuid && product.slug && product.slug !== idOrSlug) {
    return { kind: "redirect", to: `${DOMAIN}/product/${encodeSeg(String(product.slug))}` };
  }

  // Farmer
  let farmer: any = null;
  if (product.farmer_id) {
    const { data } = await supabase
      .from("farmers")
      .select("id, name, slug, is_blocked")
      .eq("id", product.farmer_id)
      .maybeSingle();
    farmer = data;
  }
  if (farmer?.is_blocked) return { kind: "gone" };

  const sellerName = clean(farmer?.name) || null;
  const productTitle = clean(product.title);
  const categoryName = clean(product.categories?.name) || null;
  const categorySlug = product.categories?.slug || null;

  const [{ data: reviews }, related, sellerProducts] = await Promise.all([
    supabase.from("reviews").select("rating, comment").eq("product_id", product.id),
    product.category_id
      ? getProducts(supabase, { categoryId: product.category_id, excludeId: product.id, limit: 6 })
      : Promise.resolve([]),
    farmer && !farmer.is_blocked
      ? getProducts(supabase, { farmerId: farmer.id, excludeId: product.id, limit: 6 })
      : Promise.resolve([]),
  ]);
  const reviewCount = reviews?.length || 0;
  const rating = reviewCount > 0
    ? reviews!.reduce((s: number, r: any) => s + r.rating, 0) / reviewCount
    : null;

  const priceFormatted = formatPrice(product.price);
  const productUrl = `${DOMAIN}/product/${encodeSeg(String(product.slug || product.id))}`;

  const title = sellerName
    ? `${productTitle} от ${sellerName} — купить в ${CITY} | ${SITE_NAME}`
    : `${productTitle} — купить в ${CITY} | ${SITE_NAME}`;

  const hasRealDescription = product.description && clean(product.description).length >= 40;
  const description = hasRealDescription
    ? truncateMeta(product.description)
    : truncateMeta(
        `${productTitle}${sellerName ? ` от фермера ${sellerName}` : ""} с доставкой в ${CITY}. Натуральный состав, единая доставка по городу. Цена: ${priceFormatted} BYN${product.unit ? ` за ${product.unit}` : ""}.`
      );

  const productLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: productTitle,
    description: product.description || description,
    image: product.image_url ? [ogImageUrl(product.image_url)] : undefined,
    sku: product.id,
    mpn: product.id,
    brand: { "@type": "Brand", name: sellerName || SITE_NAME },
    url: productUrl,
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "BYN",
      price: (product.price / 100).toFixed(2),
      availability: product.is_active
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      areaServed: { "@type": "City", name: CITY_NOM },
      seller: { "@type": "Organization", name: SITE_NAME },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: { "@type": "MonetaryAmount", value: "6.90", currency: "BYN" },
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "BY", addressRegion: "Витебская область" },
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

  const crumbs: any[] = [
    { "@type": "ListItem", position: 1, name: "Главная", item: DOMAIN },
    { "@type": "ListItem", position: 2, name: "Каталог", item: `${DOMAIN}/catalog` },
  ];
  if (categoryName && categorySlug) {
    crumbs.push({ "@type": "ListItem", position: 3, name: categoryName, item: `${DOMAIN}/vitebsk/${encodeSeg(String(categorySlug))}` });
  }
  crumbs.push({ "@type": "ListItem", position: crumbs.length + 1, name: productTitle, item: productUrl });
  const breadcrumbLd = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs };

  const sellerHref = farmer ? `${DOMAIN}/seller/${encodeSeg(String(farmer.slug || farmer.id))}` : null;
  const categoryHref = categorySlug ? `${DOMAIN}/vitebsk/${encodeSeg(String(categorySlug))}` : null;

  const bodyParts: string[] = [];
  if (product.image_url) {
    bodyParts.push(`<img src="${escapeHtml(ogImageUrl(product.image_url))}" alt="${escapeHtml(productTitle)}" width="600" height="315" style="max-width:100%;height:auto;border-radius:12px" />`);
  }
  if (!product.is_active) {
    bodyParts.push(`<p><strong>Товар временно недоступен для заказа.</strong></p>`);
  }
  if (product.description) bodyParts.push(`<p style="white-space:pre-wrap">${escapeHtml(product.description)}</p>`);
  bodyParts.push(`<h2>Характеристики</h2><ul>`);
  bodyParts.push(`<li><strong>Цена:</strong> ${priceFormatted} BYN${product.unit ? ` за ${escapeHtml(clean(product.unit))}` : ""}</li>`);
  if (categoryName) bodyParts.push(`<li><strong>Категория:</strong> ${categoryHref ? `<a href="${categoryHref}">${escapeHtml(categoryName)}</a>` : escapeHtml(categoryName)}</li>`);
  if (sellerName) bodyParts.push(`<li><strong>Производитель:</strong> ${sellerHref ? `<a href="${sellerHref}">${escapeHtml(sellerName)}</a>` : escapeHtml(sellerName)}</li>`);
  bodyParts.push(`<li><strong>Город:</strong> ${CITY_NOM}</li>`);
  bodyParts.push(`<li><strong>Доставка:</strong> курьером по ${CITY_NOM}у или самовывоз, оплата при получении</li>`);
  bodyParts.push(`</ul>`);
  const textReviews = (reviews || []).filter((r: any) => clean(r.comment).length > 0).slice(0, 5);
  if (reviewCount > 0) {
    bodyParts.push(`<h2>Отзывы</h2><p>Оценка ${rating!.toFixed(1).replace(".", ",")} из 5 — ${reviewCount} ${reviewCount === 1 ? "отзыв" : reviewCount < 5 ? "отзыва" : "отзывов"}.</p>`);
    if (textReviews.length) {
      bodyParts.push(`<ul>${textReviews.map((r: any) => `<li>${escapeHtml(truncateMeta(r.comment, 300))}</li>`).join("")}</ul>`);
    }
  }

  const linkSections: PageMeta["linkSections"] = [];
  if (sellerProducts.length) linkSections.push({ title: `Другие товары ${sellerName || "продавца"}`, items: productLinks(sellerProducts), cards: true });
  if (related.length) linkSections.push({ title: `Похожие товары${categoryName ? ` в категории «${categoryName}»` : ""}`, items: productLinks(related), cards: true });

  return {
    kind: "ok",
    meta: {
      title,
      description,
      canonical: productUrl,
      ogImage: ogImageUrl(product.image_url),
      jsonLd: [productLd, breadcrumbLd],
      h1: productTitle,
      bodyContent: bodyParts.join("\n"),
      linkSections,
      // Выключенный продавцом товар: страница остаётся (как для людей —
      // «в архиве»), но не индексируется, пока не включат обратно.
      noindex: !product.is_active,
    },
  };
}

async function catalogMeta(supabase: any, categories: { name: string; slug: string }[], categorySlug?: string | null): Promise<PageMeta> {
  if (categorySlug) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id, name, slug, seo_title, seo_description")
      .eq("slug", categorySlug)
      .maybeSingle();
    if (cat) {
      const name = clean(cat.name);
      const title = cat.seo_title || `${name} в ${CITY} — купить свежее и натуральное на ${SITE_NAME}`;
      const description = cat.seo_description
        ? truncateMeta(cat.seo_description)
        : truncateMeta(`${name} в ${CITY} от местных фермеров. Свежие натуральные продукты с доставкой по городу. Оплата при получении.`);
      const products = await getProducts(supabase, { categoryId: cat.id, limit: 24 });
      return {
        title,
        description,
        canonical: `${DOMAIN}/vitebsk/${encodeSeg(String(cat.slug))}`,
        h1: `${name} в ${CITY_NOM}е`,
        linkSections: [
          { title: "Товары", items: productLinks(products), cards: true },
          { title: "Другие категории", items: categoryLinks(categories.filter((c) => c.slug !== cat.slug)) },
        ],
      };
    }
  }
  const products = await getProducts(supabase, { limit: 36 });
  return {
    title: `Каталог натуральных продуктов в ${CITY} — ${SITE_NAME}`,
    description: `Каталог фермерских продуктов с доставкой в ${CITY}. Сыры, мёд, овощи, фрукты, мясо, выпечка от местных производителей.`,
    canonical: `${DOMAIN}/catalog`,
    h1: `Каталог продуктов в ${CITY_NOM}е`,
    linkSections: [
      { title: "Категории", items: categoryLinks(categories) },
      { title: "Товары", items: productLinks(products), cards: true },
    ],
  };
}

async function localLandingMeta(supabase: any, categories: { name: string; slug: string }[], slug: string): Promise<PageMeta | null> {
  const { data: cat } = await supabase
    .from("categories")
    .select("id, name, slug, seo_title, seo_description")
    .eq("slug", slug)
    .maybeSingle();
  if (!cat) return null;

  const name = clean(cat.name);
  const title = `Купить ${name.toLowerCase()} в ${CITY} с доставкой — фермерские продукты ${SITE_NAME}`;
  const description = truncateMeta(
    cat.seo_description ||
      `${name} в ${CITY}: местные фермерские продукты с доставкой. Свежие, натуральные, оплата при получении. Заказывайте онлайн на ${SITE_NAME}.`
  );

  const products = await getProducts(supabase, { categoryId: cat.id, limit: 48 });

  const lc = name.toLowerCase();
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
          text: `Все товары — от проверенных местных производителей Витебской области.`,
        },
      },
    ],
  };
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${name} в ${CITY_NOM}е`,
    itemListElement: products.slice(0, 20).map((p: any, i: number) => ({
      "@type": "ListItem",
      position: i + 1,
      name: clean(p.title),
      url: `${DOMAIN}/product/${encodeSeg(String(p.slug || p.id))}`,
    })),
  };

  return {
    title,
    description,
    canonical: `${DOMAIN}/vitebsk/${encodeSeg(String(cat.slug))}`,
    jsonLd: [faqLd, itemListLd],
    h1: `${name} в ${CITY_NOM}е с доставкой`,
    bodyContent: `<p>Locus — маркетплейс натуральных продуктов от местных производителей с доставкой по ${CITY_NOM}у. В категории «${escapeHtml(name)}» сейчас ${products.length} ${products.length === 1 ? "товар" : products.length < 5 ? "товара" : "товаров"}.</p>
      <h2>Как заказать ${escapeHtml(lc)} с доставкой в ${CITY}?</h2>
      <p>Выберите товар, добавьте в корзину и оформите заказ. Доставка по ${CITY_NOM}у в течение дня, оплата при получении.</p>`,
    linkSections: [
      { title: `${name}: все товары`, items: productLinks(products), cards: true },
      { title: "Другие категории", items: categoryLinks(categories.filter((c) => c.slug !== cat.slug)) },
    ],
  };
}

type SellerLookup =
  | { kind: "ok"; meta: PageMeta }
  | { kind: "redirect"; to: string }
  | { kind: "missing" };

async function sellerMeta(supabase: any, idOrSlug: string): Promise<SellerLookup> {
  const isUuid = UUID_RE.test(idOrSlug);
  const query = supabase
    .from("farmers")
    .select("id, name, description, photo_url, slug, city, is_blocked, tagline, about_text");
  const { data: farmer } = isUuid
    ? await query.eq("id", idOrSlug).maybeSingle()
    : await query.eq("slug", idOrSlug).maybeSingle();
  if (!farmer || farmer.is_blocked) return { kind: "missing" };

  if (isUuid && farmer.slug && farmer.slug !== idOrSlug) {
    return { kind: "redirect", to: `${DOMAIN}/seller/${encodeSeg(String(farmer.slug))}` };
  }

  const name = clean(farmer.name);
  const products = await getProducts(supabase, { farmerId: farmer.id, limit: 60 });
  const sellerUrl = `${DOMAIN}/seller/${encodeSeg(String(farmer.slug || farmer.id))}`;

  const title = `${name} — натуральные продукты в ${CITY} | ${SITE_NAME}`;
  const description = truncateMeta(
    farmer.description || farmer.tagline ||
      `${name}: фермерские продукты с доставкой в ${CITY}. Покупайте натуральные продукты напрямую от производителя.`
  );

  const body: string[] = [];
  if (farmer.tagline) body.push(`<p><em>${escapeHtml(clean(farmer.tagline))}</em></p>`);
  if (farmer.description) body.push(`<p style="white-space:pre-wrap">${escapeHtml(farmer.description)}</p>`);
  if (farmer.about_text && farmer.about_text !== farmer.description) body.push(`<h2>О нас</h2><p style="white-space:pre-wrap">${escapeHtml(farmer.about_text)}</p>`);
  body.push(`<p>Доставка по ${CITY_NOM}у курьером или самовывоз, оплата при получении. Всего в продаже: ${products.length} ${products.length === 1 ? "товар" : products.length < 5 ? "товара" : "товаров"}.</p>`);

  return {
    kind: "ok",
    meta: {
      title,
      description,
      canonical: sellerUrl,
      ogImage: ogImageUrl(farmer.photo_url),
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name,
          description: farmer.description || undefined,
          image: farmer.photo_url ? ogImageUrl(farmer.photo_url) : undefined,
          url: sellerUrl,
          address: { "@type": "PostalAddress", addressLocality: farmer.city || CITY_NOM, addressCountry: "BY" },
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Главная", item: DOMAIN },
            { "@type": "ListItem", position: 2, name, item: sellerUrl },
          ],
        },
      ],
      h1: name,
      bodyContent: body.join("\n"),
      linkSections: [{ title: `Товары ${name}`, items: productLinks(products), cards: true }],
    },
  };
}

// ----- Static informational pages -----

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
  };
}

// Приватные/служебные маршруты: noindex, без canonical на главную.
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
  "/seller/clients",
  "/seller/tariffs",
  "/seller/page",
  "/seller-application",
]);

function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PATHS.has(pathname) || pathname === "/admin" || pathname.startsWith("/admin/");
}

function privateMeta(): PageMeta {
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
  const rawPath = url.searchParams.get("path") || url.pathname;
  const cleanPath = rawPath.replace(/^\/functions\/v1\/prerender/, "") || "/";
  const [rawPathname, search] = cleanPath.split("?");
  let pathname = "/";
  try {
    pathname = decodeURI(rawPathname || "/");
  } catch {
    pathname = rawPathname || "/";
  }
  if (pathname === "/index.html") pathname = "/";
  if (pathname.length > 1) pathname = pathname.replace(/\/+$/, "") || "/";
  const searchParams = new URLSearchParams(search || "");
  for (const key of [...searchParams.keys()]) {
    if (/^utm_/i.test(key) || ["fbclid", "gclid", "yclid", "ref", "from"].includes(key.toLowerCase())) {
      searchParams.delete(key);
    }
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Static file passthrough (verification files, robots, images...).
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

  const htmlHeaders = (extra: Record<string, string> = {}) => ({
    ...corsHeaders,
    "Content-Type": "text/html; charset=utf-8",
    ...extra,
  });

  const redirect = (to: string) =>
    new Response(null, {
      status: 301,
      headers: { ...corsHeaders, Location: to, "Cache-Control": "public, max-age=86400" },
    });

  let meta: PageMeta | null = null;
  let status = 200;
  let notFound = false;
  let gone = false;

  const [assets, categories] = await Promise.all([getBundleAssets(), getCategories(supabase)]);

  try {
    if (pathname === "/" || pathname === "") {
      meta = await homeMeta(supabase, categories);
    } else if (isPrivatePath(pathname)) {
      meta = privateMeta();
    } else if (STATIC_PAGES[pathname]) {
      meta = staticPageMeta(pathname);
    } else if (pathname === "/catalog") {
      const categoryParam = searchParams.get("category");
      meta = await catalogMeta(supabase, categories, categoryParam);
      const hasFilterParam =
        searchParams.has("discount") || searchParams.has("new") || searchParams.has("search");
      const unknownCategory = !!categoryParam && meta.canonical === `${DOMAIN}/catalog`;
      if ((hasFilterParam && !categoryParam) || unknownCategory) {
        meta.canonical = `${DOMAIN}/catalog`;
        meta.noindex = true;
      }
    } else if (pathname.startsWith("/product/")) {
      const id = pathname.replace("/product/", "").split("/")[0];
      const res = await productMeta(supabase, id);
      if (res.kind === "redirect") return redirect(res.to);
      if (res.kind === "gone") gone = true;
      else if (res.kind === "missing") notFound = true;
      else meta = res.meta;
    } else if (pathname.startsWith("/vitebsk/")) {
      const slug = pathname.replace("/vitebsk/", "").split("/")[0];
      meta = await localLandingMeta(supabase, categories, slug);
      if (!meta) notFound = true;
    } else if (pathname.startsWith("/seller/")) {
      const idOrSlug = pathname.replace("/seller/", "").split("/")[0];
      const res = await sellerMeta(supabase, idOrSlug);
      if (res.kind === "redirect") return redirect(res.to);
      if (res.kind === "missing") notFound = true;
      else meta = res.meta;
    } else {
      notFound = true;
    }
  } catch (err) {
    console.error("prerender error:", err);
  }

  if (gone || notFound || !meta) {
    status = gone ? 410 : 404;
    const notFoundMeta: PageMeta = {
      title: gone ? `Товар снят с продажи — ${SITE_NAME}` : `Страница не найдена — ${SITE_NAME}`,
      description: gone
        ? `Этот товар больше не продаётся. Посмотрите похожие предложения в каталоге ${SITE_NAME}.`
        : `Запрошенная страница не найдена или была удалена. Перейдите в каталог ${SITE_NAME}.`,
      canonical: "",
      h1: gone ? "Товар снят с продажи" : "Страница не найдена",
      bodyContent: `<p><a href="${DOMAIN}/catalog">Перейти в каталог</a></p>`,
      noindex: true,
      linkSections: [{ title: "Категории", items: categoryLinks(categories) }],
    };
    return new Response(renderHtml(notFoundMeta, assets, categories), {
      status,
      headers: htmlHeaders({
        "Cache-Control": "public, max-age=60, s-maxage=120",
        "X-Robots-Tag": "noindex, follow",
      }),
    });
  }

  return new Response(renderHtml(meta, assets, categories), {
    status: 200,
    headers: htmlHeaders({
      "Cache-Control": "public, max-age=300, s-maxage=600",
      "X-Robots-Tag": meta.noindex ? "noindex, follow" : "all",
    }),
  });
});
