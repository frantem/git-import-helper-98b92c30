import { memo } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  loading?: "lazy" | "eager";
  width?: number;
  height?: number;
  fetchPriority?: "high" | "low" | "auto";
  /** If provided and the src points to Supabase Storage, the URL is rewritten
   *  to use Supabase image transformations for smaller payloads. */
  transformWidth?: number;
  /** JPEG/WebP quality 1–100. Defaults to 70 when transformWidth is set. */
  quality?: number;
}

function buildSupabaseTransform(src: string, width: number, quality: number): string {
  // Rewrite "/storage/v1/object/public/<bucket>/<path>" → "/storage/v1/render/image/public/<bucket>/<path>"
  // Supabase transformations work for both public and signed URLs of supported formats.
  if (!src) return src;
  const marker = "/storage/v1/object/public/";
  const idx = src.indexOf(marker);
  if (idx === -1) return src;
  const base = src.slice(0, idx) + "/storage/v1/render/image/public/" + src.slice(idx + marker.length);
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}width=${width}&quality=${quality}&resize=cover`;
}

export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  className,
  fallbackSrc = "/placeholder.svg",
  loading = "lazy",
  width,
  height,
  fetchPriority,
  transformWidth,
  quality = 70,
}: OptimizedImageProps) {
  const finalSrc = transformWidth ? buildSupabaseTransform(src, transformWidth, quality) : src;

  return (
    <div className={cn("relative overflow-hidden bg-secondary rounded-[inherit]", className)}>
      <img
        src={finalSrc}
        alt={alt}
        loading={loading}
        decoding="async"
        width={width}
        height={height}
        fetchPriority={fetchPriority}
        onError={(e) => {
          const img = e.currentTarget;
          if (img.src !== fallbackSrc) img.src = fallbackSrc;
        }}
        className="h-full w-full object-cover"
      />
    </div>
  );
});
