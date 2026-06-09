import { useState, useEffect, memo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { cdnImage } from "@/lib/imageCdn";

export interface Banner {
  id: string;
  image: string;
  title: string;
  linkUrl?: string;
  linkProductId?: string;
  linkCategory?: string;
}

interface BannerCarouselProps {
  banners: Banner[];
}

export const BannerCarousel = memo(function BannerCarousel({ banners }: BannerCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  // Cache LCP banner URL so the next visit can preload it from index.html.
  useEffect(() => {
    if (banners.length === 0) return;
    try {
      localStorage.setItem(
        "locus-lcp-banner",
        cdnImage(banners[0].image, "banner")
      );
    } catch {}
  }, [banners]);

  useEffect(() => {
    if (banners.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) {
    return (
      <div className="rounded-xl bg-muted aspect-[16/7] md:aspect-[21/8] flex items-center justify-center">
        <p className="text-muted-foreground">Нет активных баннеров</p>
      </div>
    );
  }

  const goTo = (index: number) => setCurrentIndex(index);
  const goPrev = () => setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  const goNext = () => setCurrentIndex((prev) => (prev + 1) % banners.length);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      goNext();
    } else if (isRightSwipe) {
      goPrev();
    }
  };

  const getBannerLink = (banner: Banner): string => {
    if (banner.linkProductId) {
      return `/product/${banner.linkProductId}`;
    }
    if (banner.linkCategory) {
      return `/catalog?category=${banner.linkCategory}`;
    }
    if (banner.linkUrl) {
      return banner.linkUrl;
    }
    return "/catalog";
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {banners.map((banner, index) => (
          <Link
            key={banner.id}
            to={getBannerLink(banner)}
            className="relative min-w-full aspect-[16/8.75] md:aspect-[21/10] cursor-pointer"
          >
            <OptimizedImage
              src={banner.image}
              alt={banner.title}
              preset="banner"
              className="h-full w-full"
              width={1200}
              height={600}
              loading={index === 0 ? "eager" : "lazy"}
              fetchPriority={index === 0 ? "high" : "auto"}
            />
          </Link>
        ))}
      </div>

      {/* Navigation arrows */}
      {banners.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Предыдущий слайд"
            onClick={(e) => { e.preventDefault(); goPrev(); }}
            className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-card/80 p-2 shadow backdrop-blur-sm transition-colors hover:bg-card md:block"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Следующий слайд"
            onClick={(e) => { e.preventDefault(); goNext(); }}
            className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-card/80 p-2 shadow backdrop-blur-sm transition-colors hover:bg-card md:block"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2">
          {banners.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Слайд ${index + 1} из ${banners.length}`}
              aria-current={currentIndex === index ? "true" : undefined}
              onClick={(e) => { e.preventDefault(); goTo(index); }}
              className="flex h-11 w-11 items-center justify-center bg-transparent"
            >
              <span
                className={cn(
                  "h-2 rounded-full transition-all",
                  currentIndex === index
                    ? "w-6 bg-primary-foreground"
                    : "w-2 bg-primary-foreground/60"
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
