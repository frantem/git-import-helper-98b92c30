import { formatPrice } from "@/lib/priceUtils";
import { BynSymbol } from "@/components/ui/byn-symbol";
import type { StoryProduct } from "./StoryProductCard";
import type { ProductRating } from "@/hooks/useProductRatings";

export type AboutTheme = "photoTop" | "photoFull";

interface Props {
  product: StoryProduct;
  theme: AboutTheme;
  size: "lg" | "md";
  rating?: ProductRating;
  showRating: boolean;
}

const STAR = (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1.5" style={{ display: "inline-block", verticalAlign: "-0.12em" }}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

/**
 * Карточка шаблона «О продукте». Тема A — фото сверху, белая карточка;
 * тема B — фото на всю карточку с тёмным градиентом снизу.
 */
export function AboutProductCard({ product, theme, size, rating, showRating }: Props) {
  const lg = size === "lg";
  const width = lg ? 900 : 480;
  const k = lg ? 1 : 0.62; // масштаб типографики
  const full = theme === "photoFull";
  const price = formatPrice(product.price);

  const stats: { value: React.ReactNode; label: string }[] = [];
  if (showRating && rating && rating.count > 0) {
    stats.push({ value: <>{STAR} {rating.avg.toFixed(1)}</>, label: "Рейтинг" });
  }
  stats.push({ value: <>{price.formatted}<BynSymbol /></>, label: "Цена" });
  if (product.unit) stats.push({ value: product.unit, label: "Порция" });

  const textColor = full ? "#ffffff" : "#1c1917";
  const mutedColor = full ? "rgba(255,255,255,0.8)" : "#57534e";
  const dividerColor = full ? "rgba(255,255,255,0.35)" : "#e7e5e4";

  const textBlock = (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 * k, padding: full ? `0 ${40 * k}px ${40 * k}px` : `${28 * k}px ${40 * k}px ${36 * k}px`, color: textColor }}>
      <div
        style={{
          fontSize: 52 * k, fontWeight: 800, lineHeight: 1.12,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          textShadow: full ? "0 2px 12px rgba(0,0,0,0.35)" : "none",
        }}
      >
        {product.title}
      </div>
      {product.description?.trim() && (
        <div
          style={{
            fontSize: 30 * k, fontWeight: 500, lineHeight: 1.3, color: mutedColor,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            whiteSpace: "pre-wrap",
          }}
        >
          {product.description.trim()}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "stretch", marginTop: 10 * k }}>
        {stats.map((s, i) => (
          <div
            key={s.label}
            style={{
              flex: 1, textAlign: "center", padding: `0 ${12 * k}px`,
              borderLeft: i > 0 ? `2px solid ${dividerColor}` : "none",
            }}
          >
            <div style={{ fontSize: 38 * k, fontWeight: 800, lineHeight: 1.15, whiteSpace: "nowrap" }}>{s.value}</div>
            <div style={{ fontSize: 24 * k, fontWeight: 600, color: mutedColor, marginTop: 6 * k }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const img = (
    <img
      src={product.image_url || "/placeholder.svg"}
      alt={product.title}
      crossOrigin="anonymous"
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
    />
  );

  if (full) {
    const height = lg ? 1240 : 820;
    return (
      <div
        style={{
          width, height, position: "relative", overflow: "hidden",
          borderRadius: 44 * k, boxShadow: "0 18px 40px rgba(0,0,0,0.28)", background: "#2a2a2a",
        }}
      >
        <div style={{ position: "absolute", inset: 0 }}>{img}</div>
        <div
          style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0.1) 100%)",
          }}
        />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>{textBlock}</div>
      </div>
    );
  }

  return (
    <div
      style={{
        width, overflow: "hidden", background: "#ffffff",
        borderRadius: 44 * k, boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
        display: "flex", flexDirection: "column",
      }}
    >
      <div style={{ width, height: width, background: "#f1f0ea", overflow: "hidden" }}>{img}</div>
      {textBlock}
    </div>
  );
}
