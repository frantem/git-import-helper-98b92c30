import { formatPrice } from "@/lib/priceUtils";
import { BynSymbol } from "@/components/ui/byn-symbol";
import { cn } from "@/lib/utils";

export interface StoryProduct {
  id: string;
  title: string;
  price: number;
  old_price: number | null;
  unit: string;
  image_url: string | null;
  farmer_id: string;
  prep_time_minutes?: number;
  order_lead_time_hours?: number;
}

function formatPrepTime(prepMinutes?: number, leadHours?: number): { label: string; isInStock: boolean } {
  const totalMinutes = (prepMinutes || 0) + (leadHours || 0) * 60;
  if (totalMinutes === 0) return { label: "В наличии", isInStock: true };
  if (totalMinutes < 60) return { label: `~${totalMinutes}мин.`, isInStock: false };
  const hours = Math.round(totalMinutes / 60);
  if (hours < 24) return { label: `~${hours}ч.`, isInStock: false };
  const days = Math.round(hours / 24);
  return { label: `~${days}дн.`, isInStock: false };
}

interface Props {
  product: StoryProduct;
  pickupLabel?: string;
  /** Масштаб карточки внутри холста 1080px (базовая ширина карточки ~ 440px) */
  className?: string;
}

/**
 * Статичная копия карточки товара с сайта — без ссылок, сердечка и корзины.
 * Размеры заданы в px под холст 1080×1920.
 */
export function StoryProductCard({ product, pickupLabel, className }: Props) {
  const discount = product.old_price && product.old_price > product.price
    ? Math.round((1 - product.price / product.old_price) * 100)
    : 0;
  const price = formatPrice(product.price);
  const oldPrice = discount > 0 && product.old_price ? formatPrice(product.old_price) : null;

  const availability = (() => {
    if (pickupLabel) {
      const isFast = pickupLabel === "Сегодня" || pickupLabel === "Завтра";
      const isUnavailable = pickupLabel === "Нет в наличии";
      return { label: pickupLabel, color: isUnavailable ? "#d41111" : isFast ? "#15803d" : "rgba(28,25,23,0.8)" };
    }
    const prep = formatPrepTime(product.prep_time_minutes, product.order_lead_time_hours);
    return { label: prep.label, color: prep.isInStock ? "#15803d" : "rgba(28,25,23,0.8)" };
  })();

  return (
    <div
      className={cn("flex flex-col overflow-hidden", className)}
      style={{
        width: 440,
        borderRadius: 28,
        background: "#ffffff",
        boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
        color: "#1c1917",
      }}
    >
      <div style={{ position: "relative", width: 440, height: 440, background: "#f1f0ea", overflow: "hidden" }}>
        <img
          src={product.image_url || "/placeholder.svg"}
          alt={product.title}
          crossOrigin="anonymous"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        {discount > 0 && (
          <div
            style={{
              position: "absolute", left: 0, bottom: 0,
              background: "#be5c41", color: "#fff",
              fontSize: 22, fontWeight: 700, lineHeight: 1,
              padding: "8px 14px", borderTopRightRadius: 14,
            }}
          >
            -{discount}%
          </div>
        )}
      </div>

      <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          style={{
            fontSize: 30, fontWeight: 600, lineHeight: 1.15,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            minHeight: 69,
          }}
        >
          {product.title}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>
            {price.formatted}<BynSymbol />
          </span>
          {product.unit && <span style={{ fontSize: 22, color: "#78716c" }}>/{product.unit}</span>}
        </div>
        {oldPrice && (
          <span style={{ fontSize: 22, color: "#78716c", textDecoration: "line-through", lineHeight: 1 }}>
            {oldPrice.formatted}<BynSymbol />
          </span>
        )}
        <span style={{ fontSize: 20, color: availability.color, lineHeight: 1, marginTop: 4 }}>
          {availability.label}
        </span>
      </div>
    </div>
  );
}
