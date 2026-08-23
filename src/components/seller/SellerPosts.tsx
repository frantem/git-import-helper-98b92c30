import { memo, useMemo, useState } from "react";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { cdnImage } from "@/lib/imageCdn";
import type { SellerPost } from "@/hooks/useSellerPage";

interface SellerPostsProps {
  posts: SellerPost[];
  /** Заголовок блока, настраиваемый продавцом. */
  blockTitle?: string | null;
}

/** Длина текста, после которой он не помещается в 3 строки превью. */
const PREVIEW_LIMIT = 60;

/**
 * Блок «О нас»: стандартные карточки-истории продавца (фото обязательно).
 * Никаких переходов — длинный текст разворачивается внутри карточки.
 */
export const SellerPosts = memo(function SellerPosts({ posts, blockTitle }: SellerPostsProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const visible = useMemo(() => posts.filter((p) => !!p.image_url), [posts]);

  if (visible.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-3 font-serif text-lg font-bold text-foreground md:text-2xl">
        {blockTitle?.trim() || "О нас"}
      </h2>

      <div className="-mx-3 flex snap-x snap-mandatory items-start gap-3 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {visible.map((post) => {
          const isOpen = !!expanded[post.id];
          const body = post.body?.trim() || "";
          const isLong = body.length > PREVIEW_LIMIT;

          return (
            <article
              key={post.id}
              className="relative flex w-[66%] max-w-[280px] flex-shrink-0 snap-start flex-col overflow-hidden rounded-[24px] shadow-lg"
            >
              {/* Фото — фон карточки */}
              <OptimizedImage
                src={post.image_url!}
                alt={post.title}
                preset="post"
                className="absolute inset-0 h-full w-full rounded-none object-cover"
              />

              {/* Пропорция карточки 4:5 как на референсе */}
              <div className="aspect-[4/5] w-full" />

              {/* Стеклянная плашка: размытие самого фото + мягкое затемнение */}
              <div className="relative">
                <div className="absolute inset-0 overflow-hidden">
                  <img
                    src={cdnImage(post.image_url, "post")}
                    alt=""
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-full w-full scale-110 object-cover object-bottom blur-xl"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/55 to-black/75" />
                </div>

                <div className="relative px-4 pb-4 pt-3">
                  <h3 className="text-[19px] font-bold leading-tight text-white">
                    {post.title}
                  </h3>

                  {body && (
                    <p
                      className={`mt-1.5 whitespace-pre-wrap text-[14px] leading-snug text-white ${
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
                      className="mt-2 block text-left text-[13px] font-medium text-white underline underline-offset-2"
                    >
                      {isOpen ? "Свернуть" : "Читать дальше"}
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
});
