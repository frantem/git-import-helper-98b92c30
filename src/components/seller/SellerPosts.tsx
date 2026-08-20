import { memo } from "react";
import { OptimizedImage } from "@/components/ui/optimized-image";
import type { SellerPost } from "@/hooks/useSellerPage";

interface SellerPostsProps {
  posts: SellerPost[];
}

/** Второй блок: посты продавца о своих продуктах. Свайп-лента на мобиле, сетка на ПК. */
export const SellerPosts = memo(function SellerPosts({ posts }: SellerPostsProps) {
  if (posts.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-3 font-serif text-lg font-bold text-foreground md:text-2xl">
        О наших продуктах
      </h2>

      <div className="-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-1 scrollbar-hide md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
        {posts.map((post) => (
          <article
            key={post.id}
            className="w-[80%] flex-shrink-0 snap-start overflow-hidden rounded-2xl bg-card md:w-auto"
          >
            {post.image_url && (
              <OptimizedImage
                src={post.image_url}
                alt={post.title}
                preset="detail"
                className="aspect-[4/3] w-full"
              />
            )}
            <div className="p-4">
              <h3 className="mb-1.5 font-serif text-base font-bold text-foreground">
                {post.title}
              </h3>
              {post.body && (
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                  {post.body}
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
});
