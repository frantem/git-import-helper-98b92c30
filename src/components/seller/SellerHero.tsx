import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, MessageCircle, Package, Star } from "lucide-react";
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
  /** Короткая фраза-доказательство: одна строка, не больше двух. */
  uniqueFact?: string | null;
  locationLabel?: string | null;
  rating?: number | null;
  reviewCount?: number;
  ordersCount?: number | null;
  /** Количество активных товаров — от него зависит статус «принимает заказы». */
  productsCount?: number;
  avatarUrl?: string | null;
  /** Готовая ссылка на мессенджер продавца (tel:, viber:, t.me, wa.me). */
  contactHref?: string | null;
}

/**
 * Компактная шапка страницы продавца.
 *
 * Задача — отдать первый экран товарам: здесь только имя, статус, рейтинг
 * и кнопка связи. Высота ~110 px вместо прежнего баннера на 420 px,
 * поэтому на телефоне 393×852 под шапкой сразу видны карточки еды.
 */
export const SellerHero = memo(function SellerHero({
  name,
  uniqueFact,
  locationLabel,
  rating,
  reviewCount = 0,
  ordersCount,
  productsCount = 0,
  avatarUrl,
  contactHref,
}: SellerHeroProps) {
  const navigate = useNavigate();
  const cleanLocation = locationLabel?.replace(/^📍\s*/, "").trim();
  const showRating = !!rating && rating > 0;
  const acceptsOrders = productsCount > 0;

  return (
    <section className="px-3 pt-2">
      <div className="rounded-2xl bg-card px-3 py-2.5 shadow-sm ring-1 ring-black/[0.04]">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Назад"
            className="-ml-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground transition-colors active:bg-secondary/70"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          {avatarUrl ? (
            <img
              src={cdnImage(avatarUrl, "thumb")}
              alt={name}
              className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-[hsl(var(--seller-accent))]/40"
              loading="eager"
              decoding="async"
            />
          ) : (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--seller-deep))] text-[15px] font-bold text-primary-foreground">
              {name.trim().charAt(0).toUpperCase()}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="line-clamp-2 text-[16.5px] font-bold leading-snug text-foreground">
              {name}
            </h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] leading-tight">
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-semibold",
                  acceptsOrders ? "text-emerald-700" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    acceptsOrders ? "bg-emerald-600" : "bg-muted-foreground",
                  )}
                />
                {acceptsOrders ? "Принимает заказы" : "Нет товаров"}
              </span>
              {cleanLocation && (
                <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {cleanLocation}
                </span>
              )}
              {showRating && (
                <span className="inline-flex items-center gap-0.5 font-medium text-foreground">
                  <Star className="h-3 w-3 fill-accent text-accent" />
                  {rating!.toFixed(1)}
                  {reviewCount > 0 && (
                    <span className="font-normal text-muted-foreground">({reviewCount})</span>
                  )}
                </span>
              )}
              {!!ordersCount && ordersCount > 0 && (
                <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                  <Package className="h-3 w-3" />
                  {ordersCount} {ordersWord(ordersCount)}
                </span>
              )}
            </div>
          </div>

          {contactHref && (
            <a
              href={contactHref}
              aria-label="Написать продавцу"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--seller-deep))] text-primary-foreground transition-transform active:scale-95"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
          )}
        </div>

        {uniqueFact?.trim() && (
          <p className="mt-2 line-clamp-2 pl-[42px] text-[11.5px] leading-snug text-muted-foreground">
            {uniqueFact}
          </p>
        )}
      </div>
    </section>
  );
});
