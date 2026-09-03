import { forwardRef } from "react";
import { StoryProductCard, type StoryProduct } from "./StoryProductCard";
import type { StoryBackground } from "./storyBackgrounds";
import { isLightBackground } from "./storyBackgrounds";

export const STORY_W = 1080;
export const STORY_H = 1920;

interface Props {
  background: StoryBackground;
  products: StoryProduct[];
  pickupLabels: Map<string, string>;
  heading: string;
}

const FONT = "'Manrope', 'Inter', system-ui, sans-serif";

/**
 * Холст сторис 1080×1920. Рендерится в реальном размере; на экране
 * масштабируется родителем через transform: scale().
 */
export const StoryCanvas = forwardRef<HTMLDivElement, Props>(function StoryCanvas(
  { background, products, pickupLabels, heading },
  ref,
) {
  const light = isLightBackground(background);
  const textColor = light ? "#2a1d14" : "#ffffff";
  const count = products.length;

  const cardScale = count === 1 ? 1.25 : 1;

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
        color: textColor,
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

      {/* Заголовок */}
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

      {/* Карточки */}
      <div
        style={{
          position: "absolute", top: 330, left: 0, right: 0, bottom: 300,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {count === 0 ? (
          <div
            style={{
              fontSize: 34, fontWeight: 600, opacity: 0.75, textAlign: "center",
              padding: "0 120px", lineHeight: 1.3,
            }}
          >
            Выберите до 4 товаров — они появятся здесь
          </div>
        ) : (
          <div
            style={{
              display: "flex", flexWrap: "wrap", justifyContent: "center",
              gap: 40, width: 940,
              transform: `scale(${cardScale})`,
            }}
          >
            {products.map((p) => (
              <StoryProductCard key={p.id} product={p} pickupLabel={pickupLabels.get(p.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Нижняя стеклянная плашка */}
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
