import { memo, useState } from "react";
import { OptimizedImage } from "@/components/ui/optimized-image";
import type { SellerPost } from "@/hooks/useSellerPage";

interface SellerPostsProps {
  posts: SellerPost[];
  /** Заголовок блока, настраиваемый продавцом. */
  blockTitle?: string | null;
}

/** Порог, после которого текст считается длинным и получает «Читать дальше». */
const PREVIEW_LIMIT = 180;

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

          const overlayClasses = hasImage
            ? "-mt-[30%] flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/50 to-black/10 px-3 pb-3 pt-[30%] backdrop-blur-md"
            : "flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/50 to-transparent px-3 pb-3 pt-12 backdrop-blur-md";

          return (
            <article
              key={post.id}
              className={`${widthClasses} flex-shrink-0 snap-start overflow-hidden rounded-2xl bg-[hsl(var(--seller-deep))] shadow-md`}
            >
              {hasImage && (
                <OptimizedImage
                  src={post.image_url!}
                  alt={post.title}
                  preset="card"
                  className="aspect-[4/5] w-full rounded-none"
                />
              )}

              <div className={`relative ${overlayClasses}`}>
                {body && (
                  <p
                    className={`mb-1.5 whitespace-pre-wrap text-[14px] leading-snug text-white ${
                      isOpen ? "" : "line-clamp-3"
                    }`}
                  >
                    {body}
                  </p>
                )}

                <h3 className="font-serif text-[16px] font-bold leading-tight text-white">
                  {post.title}
                </h3>

                {isLong && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded((prev) => ({ ...prev, [post.id]: !prev[post.id] }))
                    }
                    className="mt-1 text-left text-[12px] font-medium text-white/90 underline-offset-2 hover:text-white hover:underline"
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
