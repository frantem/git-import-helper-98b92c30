import { useState, useEffect, memo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { OptimizedImage } from "@/components/ui/optimized-image";

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
            className="relative min-w-full aspect-[16/7] md:aspect-[21/8] cursor-pointer"
          >
            <OptimizedImage
              src={banner.image}
              alt={banner.title}
              className="h-full w-full"
              loading={index === 0 ? "eager" : "lazy"}
            />
          </Link>
        ))}
      </div>

      {/* Navigation arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); goPrev(); }}
            className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-card/80 p-2 shadow backdrop-blur-sm transition-colors hover:bg-card md:block"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); goNext(); }}
            className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-card/80 p-2 shadow backdrop-blur-sm transition-colors hover:bg-card md:block"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={(e) => { e.preventDefault(); goTo(index); }}
              className={cn(
                "h-2 w-2 rounded-full transition-all",
                currentIndex === index
                  ? "w-6 bg-primary-foreground"
                  : "bg-primary-foreground/50"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
});
