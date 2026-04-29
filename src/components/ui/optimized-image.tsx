import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import { cdnImage, cdnSrcSet, type ImgPreset } from "@/lib/imageCdn";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  loading?: "lazy" | "eager";
  width?: number;
  height?: number;
  fetchPriority?: "high" | "low" | "auto";
  /** CDN preset — when set, image is served via wsrv.nl resized WebP. */
  preset?: ImgPreset;
  /** Deprecated/no-op: kept for API compatibility. */
  transformWidth?: number;
  /** Deprecated/no-op: kept for API compatibility. */
  quality?: number;
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
  preset,
}: OptimizedImageProps) {
  const [errored, setErrored] = useState(false);

  const finalSrc = preset && !errored ? cdnImage(src, preset) : src;
  const srcSet =
    preset && !errored ? cdnSrcSet(src, preset) : undefined;

  return (
    <div className={cn("relative overflow-hidden bg-secondary rounded-[inherit]", className)}>
      <img
        src={finalSrc}
        srcSet={srcSet}
        alt={alt}
        loading={loading}
        decoding="async"
        width={width}
        height={height}
        fetchPriority={fetchPriority}
        onError={(e) => {
          const img = e.currentTarget;
          // First failure: drop CDN, fall back to original Supabase URL.
          if (preset && !errored) {
            setErrored(true);
            return;
          }
          // Second failure: drop to placeholder.
          if (img.src !== fallbackSrc) img.src = fallbackSrc;
        }}
        className="h-full w-full object-cover"
      />
    </div>
  );
});
