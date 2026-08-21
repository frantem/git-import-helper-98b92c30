import { memo } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { OptimizedImage } from "@/components/ui/optimized-image";
import type { SellerPost } from "@/hooks/useSellerPage";

interface SellerPostsProps {
  posts: SellerPost[];
  /** slug (или id) продавца для ссылок на статьи. */
  sellerSlug: string;
}

/** Второй блок: компактные карточки-статьи продавца со ссылкой на полную страницу. */
export const SellerPosts = memo(function SellerPosts({ posts, sellerSlug }: SellerPostsProps) {
  if (posts.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-3 font-serif text-lg font-bold text-foreground md:text-2xl">
        О наших продуктах
      </h2>

      <div className="grid gap-2 md:grid-cols-2">
        {posts.map((post) => (
          <Link
            key={post.id}
            to={`/seller/${sellerSlug}/post/${post.slug || post.id}`}
            className="flex items-center gap-3 rounded-2xl bg-card p-2.5 transition-colors hover:bg-accent/40"
          >
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-serif text-[15px] font-bold text-foreground">
                {post.title}
              </h3>
              {post.body && (
                <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-muted-foreground">
                  {post.body}
                </p>
              )}
            </div>

            {post.image_url ? (
              <OptimizedImage
                src={post.image_url}
                alt={post.title}
                preset="thumb"
                className="h-16 w-16 flex-shrink-0 rounded-xl"
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
