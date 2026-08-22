import { memo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BadgeCheck, MapPin, Package } from "lucide-react";
import { cdnImage } from "@/lib/imageCdn";

interface SellerHeroProps {
  name: string;
  /** Одна конкретная фраза-доказательство уникальности. */
  uniqueFact?: string | null;
  locationLabel?: string | null;
  ordersCount?: number | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  /** Фолбэк-картинка (аватар продавца), если медиа не задано. */
  fallbackImage?: string | null;
  /** id секции каталога для CTA-скролла. */
  catalogAnchorId?: string;
}

/**
 * Первый блок страницы продавца: фото или видео на всю ширину,
 * поверх — имя бренда, факт уникальности, бейджи доверия и CTA в каталог.
 */
export const SellerHero = memo(function SellerHero({
  name,
  uniqueFact,
  locationLabel,
  ordersCount,
  mediaUrl,
  mediaType,
  fallbackImage,
  catalogAnchorId = "seller-catalog",
}: SellerHeroProps) {
  const [videoFailed, setVideoFailed] = useState(false);
  const isVideo = mediaType === "video" && !!mediaUrl && !videoFailed;
  const imageSrc = mediaType === "image" && mediaUrl ? mediaUrl : fallbackImage || null;

  const navigate = useNavigate();

  const scrollToCatalog = () => {
    document.getElementById(catalogAnchorId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cleanLocation = locationLabel?.replace(/^📍\s*/, "");

  return (
    <section className="relative overflow-hidden rounded-b-3xl bg-brand-deep">
      {/* Медиа-фон */}
      <div className="absolute inset-0">
        {isVideo ? (
          <video
            src={mediaUrl!}
            className="h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={fallbackImage ? cdnImage(fallbackImage, "banner") : undefined}
            onError={() => setVideoFailed(true)}
          />
        ) : imageSrc ? (
          <img
            src={cdnImage(imageSrc, "banner")}
            alt={name}
            className="h-full w-full object-cover"
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
        ) : null}
        {/* Более низкий градиент: читаемость текста без затемнения всего фото */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />
      </div>

      {/* Кнопка «назад» поверх медиа */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label="Назад"
        className="absolute left-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-primary-foreground backdrop-blur-md transition-colors hover:bg-black/50 md:left-6"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      {/* Контент */}
      <div className="relative flex min-h-[420px] flex-col justify-end p-4 pt-16 md:min-h-[480px] md:p-8">
        <h1 className="font-serif font-bold leading-tight text-primary-foreground text-[28px] md:text-5xl">
          {name}
        </h1>

        <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-primary-foreground/90 md:max-w-xl md:text-base">
          {uniqueFact?.trim() || "[УНИКАЛЬНЫЙ_ФАКТ_ПРОДАВЦА]"}
        </p>

        {/* Бейджи доверия */}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-medium text-primary-foreground backdrop-blur-md">
            <BadgeCheck className="h-3.5 w-3.5" /> Проверено LOCUS
          </span>
          {cleanLocation && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-medium text-primary-foreground backdrop-blur-md">
              <MapPin className="h-3.5 w-3.5" /> {cleanLocation}
            </span>
          )}
          {!!ordersCount && ordersCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-medium text-primary-foreground backdrop-blur-md">
              <Package className="h-3.5 w-3.5" /> {ordersCount} выполненных заказов
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={scrollToCatalog}
          className="mt-4 w-full rounded-2xl bg-[hsl(var(--seller-accent))] px-6 py-3 text-[15px] font-bold text-[hsl(var(--seller-accent-foreground))] transition-transform active:scale-[0.98] md:w-auto md:self-start"
        >
          Смотреть каталог
        </button>
      </div>
    </section>
  );
});
