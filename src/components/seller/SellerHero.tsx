import { memo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { cdnImage } from "@/lib/imageCdn";

interface SellerHeroProps {
  name: string;
  tagline?: string | null;
  aboutText?: string | null;
  locationLabel?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  /** Фолбэк-картинка (аватар продавца), если медиа не задано. */
  fallbackImage?: string | null;
}

/**
 * Первый блок страницы продавца: фото или видео на всю ширину,
 * поверх — название бренда, девиз, карточка «о продавце» и плашка локации.
 */
export const SellerHero = memo(function SellerHero({
  name,
  tagline,
  aboutText,
  locationLabel,
  mediaUrl,
  mediaType,
  fallbackImage,
}: SellerHeroProps) {
  const [videoFailed, setVideoFailed] = useState(false);
  const isVideo = mediaType === "video" && !!mediaUrl && !videoFailed;
  const imageSrc = mediaType === "image" && mediaUrl ? mediaUrl : fallbackImage || null;

  const navigate = useNavigate();

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
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/40 to-black/80" />
      </div>

      {/* Кнопка «назад» поверх медиа */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label="Назад"
        className="absolute left-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md transition-colors hover:bg-black/50 md:left-6"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      {/* Контент */}
      <div className="relative flex min-h-[380px] flex-col justify-end p-4 pt-16 md:min-h-[460px] md:p-8">
        <div className="mb-6 md:mb-10 md:max-w-3xl">
          <h1 className="font-serif font-bold leading-tight text-white text-[28px] md:text-5xl">
            {name}
          </h1>
          {tagline && (
            <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-white/80 md:text-base md:max-w-xl">
              {tagline}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          {aboutText ? (
            <div className="max-w-sm rounded-2xl bg-white/10 p-4 backdrop-blur-md">
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-white/90">
                {aboutText}
              </p>
            </div>
          ) : (
            <div />
          )}

          {locationLabel && (
            <div className="self-start rounded-full bg-[#faf5ea] px-5 py-2.5 text-sm font-medium text-foreground md:self-end">
              {locationLabel}
            </div>
          )}
        </div>
      </div>
    </section>
  );
});
