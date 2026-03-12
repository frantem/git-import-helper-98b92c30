import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  canonical?: string;
  ogType?: string;
}

const DOMAIN = "https://locusfood.by";
const DEFAULT_TITLE = "Locus — Маркетплейс натуральных продуктов с единой доставкой в Беларуси";
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

export function SEO({
  title,
  description,
  image,
  canonical,
  ogType = "website",
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

    if (image) {
      setMeta("og:image", image);
      setMeta("twitter:image", image, true);
    }

    setCanonical(pageCanonical);

    return () => {
      // Reset to defaults on unmount
      document.title = DEFAULT_TITLE;
      setMeta("description", DEFAULT_DESCRIPTION, true);
      setMeta("og:title", DEFAULT_TITLE);
      setMeta("og:description", DEFAULT_DESCRIPTION);
    };
  }, [title, description, image, canonical, ogType]);

  return null;
}
