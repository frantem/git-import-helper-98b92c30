import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  canonical?: string;
  ogType?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  keywords?: string;
  noindex?: boolean;
}

const DOMAIN = "https://locusfood.by";
const DEFAULT_TITLE = "Locus — Натуральные продукты с доставкой в Витебске";
const DEFAULT_DESCRIPTION = "Свежие фермерские продукты с доставкой в Витебске. Овощи, фрукты, мёд, молочные продукты напрямую от производителей.";

function setMeta(property: string, content: string, isName = false) {
  const selector = isName
    ? `meta[name='${property}']`
    : `meta[property='${property}']`;
  let el = document.querySelector(selector) as HTMLMetaElement | null;
  if (el) {
    el.content = content;
  } else {
    el = document.createElement("meta");
    if (isName) {
      el.name = property;
    } else {
      el.setAttribute("property", property);
    }
    el.content = content;
    document.head.appendChild(el);
  }
}

function setCanonical(url: string) {
  let link = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
  if (link) {
    link.href = url;
  } else {
    link = document.createElement("link");
    link.rel = "canonical";
    link.href = url;
    document.head.appendChild(link);
  }
}

const JSON_LD_SCRIPT_ID = "seo-json-ld";

function setJsonLd(data: Record<string, unknown> | Record<string, unknown>[] | undefined) {
  let script = document.getElementById(JSON_LD_SCRIPT_ID) as HTMLScriptElement | null;
  if (!data) {
    if (script) script.remove();
    return;
  }
  const payload = Array.isArray(data) ? data : { "@context": "https://schema.org", ...data };
  const json = JSON.stringify(payload);
  if (script) {
    script.textContent = json;
  } else {
    script = document.createElement("script");
    script.id = JSON_LD_SCRIPT_ID;
    script.type = "application/ld+json";
    script.textContent = json;
    document.head.appendChild(script);
  }
}

function setRobots(noindex: boolean) {
  let el = document.querySelector("meta[name='robots']") as HTMLMetaElement | null;
  if (noindex) {
    if (!el) {
      el = document.createElement("meta");
      el.name = "robots";
      document.head.appendChild(el);
    }
    el.content = "noindex, follow";
  } else if (el) {
    el.remove();
  }
}

export function SEO({
  title,
  description,
  image,
  canonical,
  ogType = "website",
  jsonLd,
  keywords,
  noindex,
}: SEOProps) {
  useEffect(() => {
    const pageTitle = title || DEFAULT_TITLE;
    const pageDescription = description || DEFAULT_DESCRIPTION;
    const pageCanonical = canonical || `${DOMAIN}${window.location.pathname}`;

    document.title = pageTitle;

    setMeta("description", pageDescription, true);
    setMeta("og:title", pageTitle);
    setMeta("og:description", pageDescription);
    setMeta("og:type", ogType);
    setMeta("og:url", pageCanonical);
    setMeta("twitter:title", pageTitle, true);
    setMeta("twitter:description", pageDescription, true);

    if (keywords) {
      setMeta("keywords", keywords, true);
    }

    if (image) {
      setMeta("og:image", image);
      setMeta("twitter:image", image, true);
    }

    setCanonical(pageCanonical);
    setJsonLd(jsonLd);
    setRobots(!!noindex);

    return () => {
      document.title = DEFAULT_TITLE;
      setMeta("description", DEFAULT_DESCRIPTION, true);
      setMeta("og:title", DEFAULT_TITLE);
      setMeta("og:description", DEFAULT_DESCRIPTION);
      setJsonLd(undefined);
      setRobots(false);
    };
  }, [title, description, image, canonical, ogType, jsonLd, keywords, noindex]);

  return null;
}
