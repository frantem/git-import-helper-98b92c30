import { memo, useEffect, useRef, useState } from "react";
import type { HTMLAttributes, KeyboardEvent } from "react";
import { cdnImage } from "@/lib/imageCdn";
import { cn } from "@/lib/utils";

interface SellerAboutProps {
  name: string;
  aboutText?: string | null;
  photoUrl?: string | null;
}

/** Сколько строк текста видно, пока покупатель не развернул блок. */
const MAX_LINES = 3;

/**
 * Блок «О нас»: человек, история.
 * Длинные тексты свёрнуты до 3 строк и заканчиваются многоточием —
 * чтобы прочитать продолжение, покупатель нажимает на блок.
 */
export const SellerAbout = memo(function SellerAbout({
  name,
  aboutText,
  photoUrl,
}: SellerAboutProps) {
  const hasAbout = !!aboutText?.trim();
  const measureRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [clipped, setClipped] = useState(false);

  // Новый текст — снова свёрнут.
  useEffect(() => {
    setExpanded(false);
  }, [aboutText]);

  // Скрытый клон текста никогда не сжимается, поэтому по нему надёжно
  // видно, сколько строк занимает описание.
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;

    const check = () => {
      if (!el.isConnected) return;
      const style = window.getComputedStyle(el);
      const lineHeight =
        parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.625;
      if (!Number.isFinite(lineHeight) || lineHeight <= 0) return;
      setClipped(el.scrollHeight > lineHeight * MAX_LINES + 2);
    };
    check();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [aboutText]);

  if (!hasAbout) return null;

  const toggle = () => setExpanded((v) => !v);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle();
    }
  };

  const interactive: HTMLAttributes<HTMLDivElement> = clipped
    ? {
        role: "button",
        tabIndex: 0,
        "aria-expanded": expanded,
        onClick: toggle,
        onKeyDown,
      }
    : {};

  const content = (
    <div className="flex items-start gap-3 p-4">
      {photoUrl && (
        <img
          src={cdnImage(photoUrl, "thumb")}
          alt={name}
          loading="lazy"
          decoding="async"
          className="h-16 w-16 flex-shrink-0 rounded-full object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="relative">
          {/* Служебный клон: по нему меряем длину, он всегда невидим. */}
          <p
            ref={measureRef}
            aria-hidden
            className="invisible pointer-events-none absolute inset-x-0 top-0 m-0 whitespace-pre-wrap text-[14px] leading-relaxed"
          >
            {aboutText}
          </p>
          <p
            className={cn(
              "whitespace-pre-wrap text-[14px] leading-relaxed text-foreground",
              clipped && !expanded && "line-clamp-3",
            )}
          >
            {aboutText}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <section className="mb-6">
      <div
        {...interactive}
        className={cn(
          "rounded-2xl bg-card text-left",
          clipped &&
            "cursor-pointer transition-colors duration-200 hover:bg-accent/5 active:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        {content}
      </div>
    </section>
  );
});
