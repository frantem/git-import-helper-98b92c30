import { forwardRef } from "react";
import { AboutProductCard, type AboutTheme } from "./AboutProductCard";
import type { StoryProduct } from "./StoryProductCard";
import type { StoryBackground } from "./storyBackgrounds";
import { isLightBackground } from "./storyBackgrounds";
import type { ProductRating } from "@/hooks/useProductRatings";
import { STORY_W, STORY_H } from "./StoryCanvas";

interface Props {
  background: StoryBackground;
  products: StoryProduct[];
  theme: AboutTheme;
  ratings: Map<string, ProductRating>;
  showRating: boolean;
  heading: string;
}

const FONT = "'Manrope', 'Inter', system-ui, sans-serif";

/** Холст шаблона «О продукте» 1080×1920. */
export const AboutStoryCanvas = forwardRef<HTMLDivElement, Props>(function AboutStoryCanvas(
  { background, products, theme, ratings, showRating, heading },
  ref,
) {
  const light = isLightBackground(background);
  const count = products.length;

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
        color: light ? "#2a1d14" : "#ffffff",
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

      {/* Заголовок — тот же стиль и логика, что в шаблоне «В наличии» */}
      {heading.trim() && (
        <div
          style={{
            position: "absolute", top: 150, left: 80, right: 80,
            textAlign: "center",
            fontSize: 66, fontWeight: 800, lineHeight: 1.1,
            letterSpacing: 1,
            textTransform: "uppercase",
            textShadow: light ? "none" : "0 4px 24px rgba(0,0,0,0.35)",
            whiteSpace: "pre-wrap", wordBreak: "break-word",
          }}
        >
          {heading}
        </div>
      )}

      <div
        style={{
          position: "absolute", top: 330, left: 0, right: 0, bottom: 300,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {count === 0 ? (
          <div style={{ fontSize: 34, fontWeight: 600, opacity: 0.75, textAlign: "center", padding: "0 120px", lineHeight: 1.3 }}>
            Выберите до 2 товаров — они появятся здесь
          </div>
        ) : (
          <div style={{ display: "flex", gap: 40, justifyContent: "center", alignItems: "center" }}>
            {products.map((p) => (
              <AboutProductCard
                key={p.id}
                product={p}
                theme={theme}
                size={count === 1 ? "lg" : "md"}
                rating={ratings.get(p.id)}
                showRating={showRating}
              />
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          position: "absolute", left: 100, right: 100, bottom: 120,
          padding: "30px 40px",
          borderRadius: 32,
          background: light ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.16)",
          border: `1px solid ${light ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.28)"}`,
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          textAlign: "center",
          fontSize: 30, fontWeight: 600, lineHeight: 1.35,
          color: light ? "rgba(42,29,20,0.85)" : "rgba(255,255,255,0.9)",
        }}
      >
        Переходите на сайт и заказывайте,
        <br />
        ссылка в шапке профиля
      </div>
    </div>
  );
});
