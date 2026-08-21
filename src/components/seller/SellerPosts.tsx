import { memo } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { OptimizedImage } from "@/components/ui/optimized-image";
import type { SellerPost } from "@/hooks/useSellerPage";

interface SellerPostsProps {
  posts: SellerPost[];
  /** slug (или id) продавца для ссылок на статьи. */
  sellerSlug: string;
  /** Заголовок блока, настраиваемый продавцом. */
  blockTitle?: string | null;
}

/** Второй блок: компактные карточки-статьи продавца, листаются вправо. */
export const SellerPosts = memo(function SellerPosts({ posts, sellerSlug, blockTitle }: SellerPostsProps) {
  if (posts.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-3 font-serif text-lg font-bold text-foreground md:text-2xl">
        {blockTitle?.trim() || "О нас"}
      </h2>

      <div className="-mx-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {posts.map((post) => (
          <Link
            key={post.id}
            to={`/seller/${sellerSlug}/post/${post.slug || post.id}`}
            className="flex w-[62%] max-w-[240px] flex-shrink-0 snap-start items-center gap-2 rounded-2xl bg-card p-2 transition-colors hover:bg-accent/40"
          >
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-serif text-[14px] font-bold text-foreground">
                {post.title}
              </h3>
              {post.body && (
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                  {post.body}
                </p>
              )}
            </div>

            {post.image_url ? (
              <OptimizedImage
                src={post.image_url}
                alt={post.title}
                preset="thumb"
                className="h-14 w-14 flex-shrink-0 rounded-xl"
              />
            ) : (
              <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
            )}
          </Link>
        ))}
      </div>

    </section>
  );
});
