import { memo, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
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
 * Длинные тексты свёрнуты до 3 строк — чтобы открыть продолжение,
 * нужно нажать на блок.
 */
export const SellerAbout = memo(function SellerAbout({
  name,
  aboutText,
  photoUrl,
}: SellerAboutProps) {
  const hasAbout = !!aboutText?.trim();
  const textRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [clipped, setClipped] = useState(false);

  // Новый текст — снова свёрнут.
  useEffect(() => {
    setExpanded(false);
  }, [aboutText]);

  // Текст длиннее 3 строк? Проверяем только в свёрнутом виде.
  useEffect(() => {
    if (expanded) return;
    const el = textRef.current;
    if (!el) return;

    const check = () => {
      const style = window.getComputedStyle(el);
      const lineHeight =
        parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.625;
      console.log('[about-check]', el.scrollHeight, lineHeight * MAX_LINES + 2, el.scrollHeight > lineHeight * MAX_LINES + 2);
      setClipped(el.scrollHeight > lineHeight * MAX_LINES + 2);
    };
    check();


    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [expanded, aboutText]);

  if (!hasAbout) return null;

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
          <p
            ref={textRef}
            className={cn(
              "whitespace-pre-wrap text-[14px] leading-relaxed text-foreground",
              clipped && !expanded && "max-h-[4.875em] overflow-hidden",
            )}
          >
            {aboutText}
          </p>
          {clipped && !expanded && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-card to-transparent"
            />
          )}
        </div>

        {clipped && (
          <div className="mt-2 flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold",
                expanded
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-accent text-accent-foreground",
              )}
            >
              {expanded ? "Свернуть" : "Читать полностью"}
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </span>
            {!expanded && (
              <span className="text-[12px] text-secondary-foreground">
                нажмите на текст
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <section className="mb-6">
      {clipped ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="w-full cursor-pointer rounded-2xl bg-card text-left transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {content}
        </button>
      ) : (
        <div className="rounded-2xl bg-card">{content}</div>
      )}
    </section>
  );
});
