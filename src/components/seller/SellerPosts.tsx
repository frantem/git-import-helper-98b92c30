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

          return (
            <article
              key={post.id}
              className="w-[72%] max-w-[320px] flex-shrink-0 snap-start overflow-hidden rounded-2xl bg-[hsl(var(--seller-deep))] shadow-md"
            >
              <div className="relative">
                {post.image_url && (
                  <OptimizedImage
                    src={post.image_url}
                    alt={post.title}
                    preset="card"
                    className="aspect-[4/5] w-full rounded-none"
                  />
                )}

                {/* Плашка-пилюля поверх фото */}
                <div className="absolute left-3 top-3 max-w-[85%] rounded-full bg-[hsl(var(--seller-deep)/0.65)] px-3 py-1.5 backdrop-blur-md">
                  <h3 className="truncate font-serif text-[14px] font-bold text-[hsl(var(--seller-bg))]">
                    {post.title}
                  </h3>
                </div>

                {/* Текст на градиенте снизу */}
                {body && (
                  <div
                    className={
                      post.image_url
                        ? "absolute inset-x-0 bottom-0 bg-gradient-to-t from-[hsl(var(--seller-deep))] via-[hsl(var(--seller-deep)/0.85)] to-transparent px-3 pb-3 pt-10"
                        : "px-3 pb-3 pt-12"
                    }
                  >
                    <p
                      className={`whitespace-pre-wrap text-[13px] leading-snug text-[hsl(var(--seller-bg)/0.92)] ${
                        isOpen ? "" : "line-clamp-3"
                      }`}
                    >
                      {body}
                    </p>

                    {isLong && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded((prev) => ({ ...prev, [post.id]: !prev[post.id] }))
                        }
                        className="mt-1 text-[11px] font-medium text-[hsl(var(--seller-accent))] underline-offset-2 hover:underline"
                      >
                        {isOpen ? "Свернуть" : "Читать дальше"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
});
