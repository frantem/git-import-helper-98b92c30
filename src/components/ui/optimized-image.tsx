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
  /** Deprecated/no-op: kept for API compatibility (was used for Supabase render API). */
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
}: OptimizedImageProps) {
  return (
    <div className={cn("relative overflow-hidden bg-secondary rounded-[inherit]", className)}>
      <img
        src={src}
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
