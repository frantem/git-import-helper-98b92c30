/**
 * Image CDN proxy via wsrv.nl (free Cloudflare-backed image resizer).
 *
 * Why: Supabase Storage on free plan has no built-in image transformations and
 * the same large original is served everywhere (cards, detail, OG), blowing
 * through the Cached Egress quota. wsrv.nl fetches the origin once, caches
 * resized WebP versions on its own CDN, and serves them to our users — cutting
 * Supabase egress by ~90% with no quality loss for the rendered size.
 *
 * Fallback: if wsrv ever fails, <OptimizedImage> swaps back to the original
 * Supabase URL via onError, so the site never breaks.
 */

export type ImgPreset =
  | "thumb"
  | "card"
  | "detail"
  | "banner"
  | "category"
  | "avatar"
  | "og";

interface PresetConfig {
  w: number;
  h?: number;
  q: number;
  fit: "cover" | "inside" | "contain";
}

const PRESETS: Record<ImgPreset, PresetConfig> = {
  thumb: { w: 120, h: 120, q: 75, fit: "cover" },
  card: { w: 400, h: 400, q: 78, fit: "cover" },
  detail: { w: 900, q: 82, fit: "inside" },
  banner: { w: 1200, h: 600, q: 75, fit: "cover" },
  category: { w: 200, h: 200, q: 75, fit: "cover" },
  avatar: { w: 160, h: 160, q: 78, fit: "cover" },
  og: { w: 1200, h: 630, q: 80, fit: "cover" },
};

/**
 * Build a CDN-optimized URL for the given source image.
 * Returns the original src untouched for local/data/blob URLs.
 */
export function cdnImage(
  src: string | null | undefined,
  preset: ImgPreset,
  dpr: 1 | 2 = 1
): string {
  if (!src) return "/placeholder.svg";
  // Skip transformations for non-remote/non-Supabase assets.
  if (
    src.startsWith("/") ||
    src.startsWith("data:") ||
    src.startsWith("blob:")
  ) {
    return src;
  }

  const cfg = PRESETS[preset];
  const params = new URLSearchParams({
    url: src,
    w: String(Math.round(cfg.w * dpr)),
    q: String(cfg.q),
    fit: cfg.fit,
    output: "webp",
    we: "", // do not enlarge if origin is smaller than target
  });
  if (cfg.h) params.set("h", String(Math.round(cfg.h * dpr)));

  return `https://wsrv.nl/?${params.toString()}`;
}

/** Build a 1x/2x srcset string for retina displays. */
export function cdnSrcSet(
  src: string | null | undefined,
  preset: ImgPreset
): string | undefined {
  if (!src) return undefined;
  if (
    src.startsWith("/") ||
    src.startsWith("data:") ||
    src.startsWith("blob:")
  ) {
    return undefined;
  }
  return `${cdnImage(src, preset, 1)} 1x, ${cdnImage(src, preset, 2)} 2x`;
}
