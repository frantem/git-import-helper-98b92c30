import { BynSymbol } from "@/components/ui/byn-symbol";
import { formatPrice } from "@/lib/priceUtils";
import type { StoryProduct } from "./StoryProductCard";

interface Props {
  product: StoryProduct;
}

const clamp = (lines: number) => ({
  display: "-webkit-box",
  WebkitLineClamp: lines,
  WebkitBoxOrient: "vertical" as const,
  overflow: "hidden",
});

/** Компактная карточка товара для сетки меню 2×4. */
export function MenuProductCard({ product }: Props) {
  const price = formatPrice(product.price);

  return (
    <div
      style={{
        width: 448,
        height: 268,
        display: "grid",
        gridTemplateColumns: "1fr 174px",
        overflow: "hidden",
        borderRadius: 30,
        background: "rgba(255,255,255,0.96)",
        color: "#211d1a",
        boxShadow: "0 14px 30px rgba(31,24,18,0.16)",
      }}
    >
      <div style={{ minWidth: 0, padding: "27px 8px 24px 28px", display: "flex", flexDirection: "column" }}>
        <div style={{ ...clamp(2), fontSize: 27, fontWeight: 800, lineHeight: 1.08, minHeight: 58 }}>
          {product.title}
        </div>
        {product.description?.trim() && (
          <div style={{ ...clamp(2), marginTop: 7, fontSize: 17, lineHeight: 1.25, color: "#5e5853" }}>
            {product.description}
          </div>
        )}
        {product.composition?.trim() && (
          <div style={{ ...clamp(2), marginTop: 6, fontSize: 15, lineHeight: 1.25, color: "#8b827b" }}>
            Состав: {product.composition}
          </div>
        )}
        <div style={{ marginTop: "auto", display: "flex", alignItems: "baseline", gap: 5, fontSize: 25, fontWeight: 800 }}>
          {price.formatted}<BynSymbol />
          {product.unit && <span style={{ fontSize: 16, fontWeight: 600, color: "#6f6862" }}>/{product.unit}</span>}
        </div>
      </div>

      <div style={{ padding: 18, paddingLeft: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img
          src={product.image_url || "/placeholder.svg"}
          alt={product.title}
          crossOrigin="anonymous"
          style={{ width: 158, height: 210, borderRadius: 24, objectFit: "cover", display: "block" }}
        />
      </div>
    </div>
  );
}