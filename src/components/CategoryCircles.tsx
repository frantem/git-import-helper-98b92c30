import { memo } from "react";
import { Link } from "react-router-dom";
import { ImageIcon } from "lucide-react";
import { OptimizedImage } from "@/components/ui/optimized-image";
import type { Category } from "@/hooks/useCategories";

interface CategoryCirclesProps {
  categories: Category[];
}

export const CategoryCircles = memo(function CategoryCircles({ categories }: CategoryCirclesProps) {
  if (categories.length === 0) return null;

  return (
    <div className="-mx-3 overflow-x-auto scrollbar-hide">
      <div className="flex gap-3 px-3 pb-1">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            to={`/catalog?category=${cat.slug}`}
            className="flex flex-shrink-0 flex-col items-center gap-1.5 w-[68px]"
          >
            <div
              className="relative h-[68px] w-[68px] rounded-full p-[2.4px]"
              style={{ backgroundColor: "#234835" }}
            >
              <div className="relative h-full w-full overflow-hidden rounded-full border-[3.1px] border-[#faf5ea] bg-muted mx-0 my-0">
                {cat.image_url ? (
                  <OptimizedImage
                    src={cat.image_url}
                    alt={cat.name}
                    className="h-full w-full"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
            <span className="text-center leading-tight text-foreground line-clamp-2 font-medium text-xs">
              {cat.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
});
