import { forwardRef } from "react";
import type { StoryBackground } from "./storyBackgrounds";
import type { StoryProduct } from "./StoryProductCard";
import { MenuProductCard } from "./MenuProductCard";
import { STORY_H, STORY_W } from "./StoryCanvas";

interface SellerIdentity {
  name: string;
  photoUrl: string | null;
}

interface Props {
  background: StoryBackground;
  products: StoryProduct[];
  heading: string;
  seller: SellerIdentity | null;
}

const FONT = "'Manrope', 'Inter', system-ui, sans-serif";

/** Холст товарного меню 1080×1920: шапка продавца и до восьми товаров. */
export const MenuStoryCanvas = forwardRef<HTMLDivElement, Props>(function MenuStoryCanvas(
  { background, products, heading, seller },
  ref,
) {
  const sellerName = seller?.name?.trim() || "Ваше название";
  const initial = sellerName.slice(0, 1).toLocaleUpperCase("ru");

  return (
    <div
      ref={ref}
      style={{
        width: STORY_W,
        height: STORY_H,
        position: "relative",
        overflow: "hidden",
        fontFamily: FONT,
        background: background.css,
        color: "#ffffff",
      }}
    >
      {background.image && (
        <img
          src={background.image}
          alt=""
          crossOrigin="anonymous"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}
      <div style={{ position: "absolute", inset: 0, background: "rgba(22,19,16,0.24)" }} />

      <header
        style={{
          position: "absolute",
          top: 76,
          left: 66,
          right: 66,
          height: 262,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 42,
        }}
      >
        <div
          style={{
            maxWidth: 650,
            fontSize: heading.length > 25 ? 58 : 70,
            fontWeight: 800,
            lineHeight: 1.02,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            textShadow: "0 4px 20px rgba(0,0,0,0.28)",
          }}
        >
          {heading}
        </div>

        <div style={{ width: 280, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          {seller?.photoUrl ? (
            <img
              src={seller.photoUrl}
              alt={sellerName}
              crossOrigin="anonymous"
              style={{ width: 132, height: 132, borderRadius: "50%", objectFit: "cover", border: "7px solid rgba(255,255,255,0.92)", boxShadow: "0 10px 30px rgba(0,0,0,0.22)" }}
            />
          ) : (
            <div style={{ width: 132, height: 132, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.94)", border: "7px solid rgba(255,255,255,0.7)", color: "#3f352d", fontSize: 58, fontWeight: 800 }}>
              {initial}
            </div>
          )}
          <div
            style={{
              maxWidth: 280,
              textAlign: "center",
              fontSize: sellerName.length > 24 ? 22 : 27,
              fontWeight: 800,
              lineHeight: 1.08,
              overflowWrap: "anywhere",
              textShadow: "0 3px 14px rgba(0,0,0,0.35)",
            }}
          >
            {sellerName}
          </div>
        </div>
      </header>

      <div style={{ position: "absolute", top: 370, left: 66, right: 66, bottom: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {products.length === 0 ? (
          <div style={{ padding: "30px 55px", borderRadius: 28, background: "rgba(255,255,255,0.9)", color: "#2a241f", fontSize: 32, fontWeight: 700, textAlign: "center" }}>
            Выберите до 8 товаров — они появятся здесь
          </div>
        ) : (
          <div style={{ width: 948, display: "grid", gridTemplateColumns: "repeat(2, 448px)", gridAutoRows: "268px", gap: "26px 52px", alignContent: "center" }}>
            {products.map((product) => <MenuProductCard key={product.id} product={product} />)}
          </div>
        )}
      </div>
    </div>
  );
});