import { useState, memo } from "react";
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
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  return (
    <div className={cn("relative overflow-hidden bg-secondary rounded-[inherit]", className)}>
      {isLoading && (
        <div className="absolute inset-0 animate-pulse bg-muted" />
      )}
      <img
        src={hasError ? fallbackSrc : src}
        alt={alt}
        loading={loading}
        decoding="async"
        width={width}
        height={height}
        fetchPriority={fetchPriority}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100"
        )}
      />
    </div>
  );
});
