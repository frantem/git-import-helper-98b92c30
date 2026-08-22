import { memo, useState } from "react";
import { OptimizedImage } from "@/components/ui/optimized-image";
import type { SellerPost } from "@/hooks/useSellerPage";

interface SellerPostsProps {
  posts: SellerPost[];
  /** Заголовок блока, настраиваемый продавцом. */
  blockTitle?: string | null;
}

/** Порог, после которого текст считается длинным и получает «Читать дальше». */
const PREVIEW_LIMIT = 90;

/**
 * Блок «О нас»: карточки-истории продавца.
 * Никаких переходов — длинный текст разворачивается внутри карточки.
 */
export const SellerPosts = memo(function SellerPosts({ posts, blockTitle }: SellerPostsProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (posts.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-3 font-serif text-lg font-bold text-foreground md:text-2xl">
        {blockTitle?.trim() || "О нас"}
      </h2>

      <div className="-mx-3 flex snap-x snap-mandatory items-start gap-3 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {posts.map((post) => {
          const isOpen = !!expanded[post.id];
          const body = post.body?.trim() || "";
          const isLong = body.length > PREVIEW_LIMIT;
          const hasImage = !!post.image_url;

          const widthClasses = hasImage
            ? "w-[54%] max-w-[240px]"
            : "w-[72%] max-w-[320px]";

          return (
            <article
              key={post.id}
              className={`${widthClasses} relative flex flex-shrink-0 snap-start flex-col overflow-hidden rounded-[22px] bg-[hsl(var(--seller-deep))] shadow-md`}
            >
              {hasImage && (
                <OptimizedImage
                  src={post.image_url!}
                  alt={post.title}
                  preset="card"
                  className="absolute inset-0 h-full w-full rounded-none object-cover"
                />
              )}

              {/* Пропорция как на референсе: фото занимает верх карточки */}
              <div className="aspect-[9/13] w-full" />

              <div className="relative bg-black/25 px-3 pb-3 pt-2.5 backdrop-blur-xl">
                <h3 className="font-serif text-[17px] font-bold leading-tight text-white">
                  {post.title}
                </h3>

                {body && (
                  <p
                    className={`mt-1 whitespace-pre-wrap text-[13.5px] leading-snug text-white/95 ${
                      isOpen ? "" : "line-clamp-3"
                    }`}
                  >
                    {body}
                  </p>
                )}

                {isLong && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded((prev) => ({ ...prev, [post.id]: !prev[post.id] }))
                    }
                    className="mt-1.5 text-left text-[12px] font-medium text-white/85 underline underline-offset-2 hover:text-white"
                  >
                    {isOpen ? "Свернуть" : "Читать дальше"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
});
