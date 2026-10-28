import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

/**
 * Лента карточек-«полароидов» с бейджем, заголовком и стрелками —
 * так сделаны блоки отзывов и «Что входит» на /for-sellers.
 */
export function CardCarousel({
  pill,
  title,
  children,
}: {
  pill: string;
  title: ReactNode;
  children: ReactNode;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: true });

  const sync = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setEdges({
      left: el.scrollLeft > 8,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 8,
    });
  }, []);

  useEffect(() => {
    sync();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [sync]);

  const scroll = (dir: number) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <span className="inline-flex items-center rounded-full bg-white px-3.5 py-1.5 text-[12px] font-medium text-[#57534C] shadow-[0_1px_2px_rgba(20,20,20,0.06)] ring-1 ring-[#E7E2D8]">
            {pill}
          </span>
          <h2 className="mt-6 max-w-[900px] font-['Fraunces'] text-[32px] leading-[1.06] tracking-[-0.02em] sm:text-[42px] lg:text-[50px]">
            {title}
          </h2>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 pb-1">
          <button
            type="button"
            aria-label="Назад"
            disabled={!edges.left}
            onClick={() => scroll(-1)}
            className="grid h-9 w-9 place-items-center rounded-full bg-[#FBE3E1] text-[#E5453D] transition enabled:hover:bg-[#E5453D] enabled:hover:text-white disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Вперёд"
            disabled={!edges.right}
            onClick={() => scroll(1)}
            className="grid h-9 w-9 place-items-center rounded-full bg-[#E5453D] text-white transition enabled:hover:bg-[#D43830] disabled:opacity-50"
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        className="-mx-5 mt-8 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </div>
  );
}

/** Общая «полароидная» рамка карточки. */
export const polaroidClass =
  "shrink-0 snap-start rounded-[14px] bg-white p-2 shadow-[0_10px_30px_rgba(20,20,20,0.08)] ring-1 ring-[#EDE9E0]";

/** Карточка отзыва: фото продавца, шапка с ником и городом, цитата. */
export function ReviewCard({
  img,
  handle,
  followers,
  city,
  quote,
  author,
}: {
  img: string;
  handle: string;
  followers: string;
  city: string;
  quote: string;
  author: string;
}) {
  return (
    <article className={`${polaroidClass} w-[268px] sm:w-[300px] lg:w-[330px]`}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-[10px] bg-[#EDEAE2]">
        <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/80"
        />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <div className="flex min-w-0 items-center gap-2">
            <img src={img} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
            <div className="min-w-0 text-white">
              <p className="truncate text-[12.5px] font-semibold leading-tight">{handle}</p>
              <p className="truncate text-[10.5px] leading-tight text-white/75">{followers}</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-black/35 px-2.5 py-1 text-[10.5px] font-medium text-white backdrop-blur-sm">
            {city}
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="text-[14.5px] font-semibold leading-[1.3] text-white">{quote}</p>
          <p className="mt-2 text-[11px] text-white/75">{author}</p>
        </div>
      </div>
    </article>
  );
}

/** Карточка возможностей: мокап интерфейса и серифный заголовок под ним. */
export function FeatureCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className={`${polaroidClass} w-[240px] sm:w-[300px] lg:w-[330px]`}>
      <div className="relative aspect-[4/3.8] overflow-hidden rounded-[10px] bg-[#EDEAE2]">
        <div className="absolute inset-x-0 top-0 flex justify-center px-3 pt-4">
          <div className="w-[400px] shrink-0 origin-top scale-[0.6] sm:scale-[0.72]">{children}</div>
        </div>
      </div>
      <div className="px-3 pb-2 pt-4">
        <h3 className="font-['Fraunces'] text-[21px] leading-[1.1] tracking-[-0.01em]">{title}</h3>
      </div>
    </article>
  );
}
