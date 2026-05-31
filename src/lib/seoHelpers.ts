/**
 * SEO helpers shared by client (SEO.tsx) and the prerender Edge Function.
 *
 * NOTE: Keep this file dependency-free (no React, no Supabase imports) so it
 * can be safely used inside Deno/Edge runtime as well.
 */

export const DOMAIN = "https://locusfood.by";
export const CITY = "Витебске"; // prepositional case for "в Витебске"
export const CITY_NOM = "Витебск";
export const SITE_NAME = "Locus";

export interface ProductSeoInput {
  id: string;
  slug?: string | null;
  name: string;
  description?: string | null;
  price: number; // in copecks (integer) OR rubles — caller decides; we just format
  priceFormatted?: string; // e.g. "12,50"
  unit?: string | null;
  image?: string | null;
  sellerName?: string | null;
  category?: string | null;
  rating?: number | null;
  reviewCount?: number;
  inStock?: boolean;
}

export interface CategorySeoInput {
  slug: string;
  name: string;
  emoji?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string | null;
}

/** Cleanly truncate description for meta tags (max 160 chars). */
export function truncateMeta(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

/** Escape special HTML chars for safe inclusion in attributes/text. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Format price (copecks integer) as "12,50" — Belarusian style with comma. */
export function formatPriceForSeo(priceInCopecks: number): string {
  const rubles = priceInCopecks / 100;
  return rubles.toFixed(2).replace(".", ",");
}

/** Build CDN-resized OG image URL (matches src/lib/imageCdn.ts "og" preset). */
export function ogImageUrl(src: string | null | undefined): string {
  if (!src) return `${DOMAIN}/placeholder.svg`;
  if (src.startsWith("/") || src.startsWith("data:") || src.startsWith("blob:")) {
    return src.startsWith("/") ? `${DOMAIN}${src}` : src;
  }
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

// ============================================================================
// Title / description generators
// ============================================================================

export function productTitle(p: ProductSeoInput): string {
  // "Сыр Камамбер — купить в Витебске с доставкой | Locus"
  return `${p.name} — купить в ${CITY} с доставкой | ${SITE_NAME}`;
}

export function productDescription(p: ProductSeoInput): string {
  const parts: string[] = [];
  parts.push(`Купить ${p.name.toLowerCase()} в ${CITY}`);
  if (p.priceFormatted) {
    parts.push(`Цена ${p.priceFormatted} BYN${p.unit ? ` за ${p.unit}` : ""}`);
  }
  if (p.sellerName) parts.push(`От фермера: ${p.sellerName}`);
  parts.push("Доставка по Витебску, оплата при получении");
  if (p.description) {
    parts.push(p.description);
  }
  return truncateMeta(parts.join(". "));
}

export function categoryTitle(cat: CategorySeoInput): string {
  if (cat.seo_title) return cat.seo_title;
  return `Купить ${cat.name.toLowerCase()} в ${CITY} с доставкой — ${SITE_NAME}`;
}

export function categoryDescription(cat: CategorySeoInput, productCount?: number): string {
  if (cat.seo_description) return truncateMeta(cat.seo_description);
  const count = productCount ? ` Более ${productCount} товаров.` : "";
  return truncateMeta(
    `${cat.name} в ${CITY} от местных фермеров.${count} Свежие натуральные продукты с доставкой по городу. Оплата при получении.`
  );
}

export function localLandingTitle(cat: CategorySeoInput): string {
  return `Купить ${cat.name.toLowerCase()} в ${CITY} с доставкой — фермерские продукты ${SITE_NAME}`;
}

export function localLandingDescription(cat: CategorySeoInput, productCount?: number): string {
  const count = productCount ? `${productCount} товаров от ` : "";
  return truncateMeta(
    `${cat.name} в ${CITY}: ${count}местных фермеров с доставкой. Свежие натуральные продукты, оплата при получении. Заказывайте онлайн на ${SITE_NAME}.`
  );
}

// ============================================================================
// JSON-LD generators
// ============================================================================

export function productJsonLd(p: ProductSeoInput) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description || productDescription(p),
    image: p.image ? [ogImageUrl(p.image)] : undefined,
    sku: p.id,
    mpn: p.id,
    brand: { "@type": "Brand", name: p.sellerName || SITE_NAME },
    url: `${DOMAIN}/product/${p.id}`,
    offers: {
      "@type": "Offer",
      url: `${DOMAIN}/product/${p.id}`,
      priceCurrency: "BYN",
      price: (p.price / 100).toFixed(2),
      availability: p.inStock !== false
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
  if (p.rating && p.reviewCount && p.reviewCount > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: p.rating.toFixed(1),
      reviewCount: p.reviewCount,
      bestRating: "5",
      worstRating: "1",
    };
  }
  return data;
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ООО «ЛОКУСФУД»",
    url: DOMAIN,
    logo: `${DOMAIN}/favicon.ico`,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+375297399485",
      contactType: "customer service",
      areaServed: "BY",
      availableLanguage: ["Russian"],
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: CITY_NOM,
      addressCountry: "BY",
    },
  };
}

export function localBusinessJsonLd(opts: {
  name: string;
  description?: string;
  image?: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: opts.name,
    description: opts.description,
    image: opts.image ? ogImageUrl(opts.image) : undefined,
    url: opts.url,
    address: {
      "@type": "PostalAddress",
      addressLocality: CITY_NOM,
      addressCountry: "BY",
    },
  };
}

export function faqJsonLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

// ============================================================================
// Local landing FAQ defaults (per category)
// ============================================================================

export function defaultLocalFaq(categoryName: string) {
  const lc = categoryName.toLowerCase();
  return [
    {
      question: `Как заказать ${lc} с доставкой в ${CITY}?`,
      answer: `Выберите товар на сайте Locus, добавьте в корзину и оформите заказ. Доставка по Витебску в течение дня, оплата при получении.`,
    },
    {
      question: `Откуда привозят ${lc}?`,
      answer: `Все товары — от проверенных местных фермеров Витебской области. Каждый продукт можно проследить до производителя.`,
    },
    {
      question: `Можно ли оплатить наличными при получении?`,
      answer: `Да, доступна оплата наличными или картой при получении заказа. Также принимаем онлайн-оплату.`,
    },
    {
      question: `Сколько стоит доставка по Витебску?`,
      answer: `Стоимость доставки рассчитывается при оформлении заказа в зависимости от адреса. Доступен самовывоз из пункта выдачи и от фермера.`,
    },
  ];
}
