import { useState } from "react";
import { cn } from "@/lib/utils";

/** id секции каталога: слаг категории может содержать пробелы и кириллицу. */
export function catSectionId(slug: string) {
  return `cat-${slug.replace(/[^A-Za-z0-9_-]/g, "-")}`;
}

interface Category {
  slug: string;
  name: string;
  emoji?: string | null;
}

/**
 * Табы категорий под тизером доставки.
 *
 * Быстрый серфинг: тап плавно прокручивает к нужной секции каталога,
 * «Все» возвращает к началу каталога. Названия — из категорий продавца.
 */
export function SellerCategoryTabs({ categories }: { categories: Category[] }) {
  const [active, setActive] = useState<string>("all");

  if (categories.length < 2) return null;

  const go = (slug: string) => {
    setActive(slug);
    const id = slug === "all" ? "seller-catalog" : catSectionId(slug);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="scrollbar-hide -mx-3 overflow-x-auto px-3 pt-2">
      <div className="flex w-max gap-1.5">
        {[{ slug: "all", name: "Все", emoji: null }, ...categories].map((category) => {
          const isActive = active === category.slug;
          return (
            <button
              key={category.slug}
              type="button"
              onClick={() => go(category.slug)}
              className={cn(
                "h-8 shrink-0 whitespace-nowrap rounded-full px-3 text-[12px] font-medium transition-colors",
                isActive
                  ? "bg-[hsl(var(--seller-deep))] text-primary-foreground"
                  : "bg-card text-foreground/80 ring-1 ring-black/[0.05]",
              )}
            >
              {category.emoji ? `${category.emoji} ` : ""}
              {category.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
