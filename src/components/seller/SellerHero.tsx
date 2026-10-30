import { memo } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Instagram, MapPin, MessageCircle, Package, Star } from "lucide-react";
import { cleanSellerName } from "@/lib/sellerName";
import { cdnImage } from "@/lib/imageCdn";
import { cn } from "@/lib/utils";

/** «1 заказ / 2 заказа / 5 заказов» */
function ordersWord(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "заказ";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "заказа";
  return "заказов";
}

interface SellerHeroProps {
  name: string;
  /** Обложка магазина: hero_media_url или фото первого товара. */
  coverUrl?: string | null;
  /** Короткое описание или уникальный факт — до двух строк. */
  description?: string | null;
  locationLabel?: string | null;
  rating?: number | null;
  reviewCount?: number;
  ordersCount?: number | null;
  /** Количество активных товаров — от него зависит статус «принимает заказы». */
  productsCount?: number;
  avatarUrl?: string | null;
  /** Слаг продавца для перехода в отзывы. */
  sellerSlug?: string | null;
  /** Готовая ссылка на мессенджер продавца (tel:, viber:, t.me, wa.me). */
  contactHref?: string | null;
  /** Ник в Instagram из контактов продавца. */
  instagram?: string | null;
}

/**
 * Шапка магазина продавца: обложка, наплывающий аватар, имя, рейтинг,
 * короткое описание и плашка статуса. Держим её компактной, чтобы
 * на телефоне сразу под шапкой начинались товары.
 */
export const SellerHero = memo(function SellerHero({
  name,
  coverUrl,
  description,
  locationLabel,
  rating,
  reviewCount = 0,
  ordersCount,
  productsCount = 0,
  avatarUrl,
  sellerSlug,
  contactHref,
  instagram,
}: SellerHeroProps) {
  const cleanLocation = locationLabel?.replace(/^📍\s*/, "").trim();
  const displayName = cleanSellerName(name);
  const instagramHandle = instagram?.trim().replace(/^@/, "").replace(/\/$/, "") || null;
  const showRating = !!rating && rating > 0;
  const acceptsOrders = productsCount > 0;
  const reviewsHref = sellerSlug ? `/seller/${sellerSlug}/reviews` : null;

  return (
    <section className="mx-auto w-full max-w-3xl px-3 pt-2 sm:max-w-6xl">
      {/* Обложка: аватар, имя и рейтинг лежат прямо на фото */}
      <div className="relative overflow-hidden rounded-3xl bg-[hsl(var(--seller-deep))]">
        {coverUrl ? (
          <img
            src={cdnImage(coverUrl, "banner")}
            alt=""
            className="h-[190px] w-full object-cover sm:h-56"
            loading="eager"
            decoding="async"
          />
        ) : (
          <div
            aria-hidden="true"
            className="h-[190px] w-full bg-[radial-gradient(circle_at_20%_20%,hsl(var(--seller-accent))_0%,transparent_55%),radial-gradient(circle_at_80%_60%,hsl(var(--seller-accent))_0%,transparent_50%)] opacity-70 sm:h-56"
          />
        )}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent"
        />

        <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
          {instagramHandle && (
            <a
              href={`https://instagram.com/${instagramHandle}`}
              target="_blank"
              rel="noreferrer"
              aria-label={`Instagram @${instagramHandle}`}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-transform active:scale-95"
            >
              <Instagram className="h-4 w-4" />
            </a>
          )}
          {contactHref && (
            <a
              href={contactHref}
              aria-label="Написать продавцу"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-transform active:scale-95"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-4 pb-3">
          <div className="h-[68px] w-[68px] overflow-hidden rounded-full bg-card shadow-lg ring-[3px] ring-white/90 sm:h-20 sm:w-20">
            {avatarUrl ? (
              <img
                src={cdnImage(avatarUrl, "thumb")}
                alt={displayName}
                className="h-full w-full object-cover"
                loading="eager"
                decoding="async"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-[hsl(var(--seller-deep))] text-[24px] font-bold text-primary-foreground">
                {displayName.trim().charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <h1 className="mt-1.5 px-2 text-center text-[19px] font-bold leading-tight text-white drop-shadow-sm sm:text-xl">
            {displayName}
          </h1>

          {showRating ? (
            reviewsHref ? (
              <Link
                to={reviewsHref}
                className="mt-1 flex items-center justify-center gap-1 text-[13.5px] font-semibold text-white"
              >
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                {rating!.toFixed(1)}
                {reviewCount > 0 && (
                  <span className="font-normal text-white/75">( {reviewCount} )</span>
                )}
                <ChevronRight className="h-4 w-4 text-white/75" aria-hidden="true" />
              </Link>
            ) : (
              <p className="mt-1 flex items-center justify-center gap-1 text-[13.5px] font-semibold text-white">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                {rating!.toFixed(1)}
              </p>
            )
          ) : (
            <p className="mt-1 flex items-center justify-center gap-1 text-[12px] font-medium text-white/80">
              <Package className="h-3.5 w-3.5" aria-hidden="true" />
              {ordersCount && ordersCount > 0
                ? `${ordersCount} ${ordersWord(ordersCount)} на Locus`
                : "Новый продавец"}
            </p>
          )}
        </div>
      </div>

      {description?.trim() && (
        <p className="mx-auto mt-2 line-clamp-2 max-w-[340px] px-4 text-center text-[12.5px] leading-snug text-muted-foreground">
          {description}
        </p>
      )}

      {/* Статус и город */}
      <div className="mt-2 flex justify-center">
        <div className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-secondary/60 px-3.5 py-1.5 text-[11.5px] font-medium text-foreground/90 sm:text-[12px]">
          <span
            className={cn(
              "h-1.5 w-1.5 shrink-0 rounded-full",
              acceptsOrders ? "bg-emerald-500" : "bg-muted-foreground",
            )}
            aria-hidden="true"
          />
          <span className="whitespace-nowrap">{acceptsOrders ? "Принимает заказы" : "Под заказ"}</span>

          {cleanLocation && (
            <>
              <span className="text-muted-foreground/50" aria-hidden="true">
                ·
              </span>
              <span className="inline-flex min-w-0 items-center gap-0.5">
                <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="truncate">{cleanLocation}</span>
              </span>
            </>
          )}
        </div>
      </div>
    </section>
  );
});
