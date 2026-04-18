import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { BannerCarousel } from "@/components/BannerCarousel";
import { CategoryCircles } from "@/components/CategoryCircles";
import { ProductCard } from "@/components/ProductCard";
import { ProductGridSkeleton } from "@/components/ProductCardSkeleton";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { useEffect, useMemo, useState } from "react";
import { useProducts, useProductRatings, transformProduct, Product } from "@/hooks/useProducts";
import { useBanners } from "@/hooks/useBanners";
import { useCategories } from "@/hooks/useCategories";
import { useHomepageBlocks, HomepageBlock } from "@/hooks/useHomepageBlocks";
import { useFavorites } from "@/hooks/useFavorites";
import { useProductsRequiredFields } from "@/hooks/useProductsRequiredFields";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/SEO";
import { computeLowestPriceIds } from "@/lib/lowestPriceUtils";

let savedAllBlockLimit = 10;

const homepageJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Locus",
    url: "https://locusfood.by",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://locusfood.by/catalog?search={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ООО «ЛОКУСФУД»",
    url: "https://locusfood.by",
    logo: "https://locusfood.by/favicon.ico",
  },
];

const Index = () => {
  useScrollRestoration();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const { data: productsWithRequiredFields = new Set<string>() } = useProductsRequiredFields();

  const { data: rawProducts = [], isLoading: isLoadingProducts } = useProducts();
  const productIds = useMemo(() => rawProducts.map((p) => p.id), [rawProducts]);
  const { data: ratings = {} } = useProductRatings(productIds);
  const { data: banners = [], isLoading: isLoadingBanners } = useBanners();
  const { data: categories = [] } = useCategories();
  const { data: blocksData, isLoading: isLoadingBlocks } = useHomepageBlocks();

  const blocks = blocksData?.blocks || [];
  const blockProducts = blocksData?.blockProducts || {};

  const products = useMemo(
    () => rawProducts.map((p) => transformProduct(p, ratings)),
    [rawProducts, ratings]
  );

  const lowestPriceIds = useMemo(() => computeLowestPriceIds(products), [products]);

  const ALL_BLOCK_STEP = 10;
  const [allBlockLimit, setAllBlockLimit] = useState(savedAllBlockLimit);

  useEffect(() => {
    savedAllBlockLimit = allBlockLimit;
  }, [allBlockLimit]);

  const getBlockProducts = useMemo(() => {
    return (block: HomepageBlock): Product[] => {
      const pinnedProductIds = blockProducts[block.id] || [];
      const pinnedProducts = products.filter((p) => pinnedProductIds.includes(p.id));

      if (block.block_type === "custom") {
        return pinnedProducts.slice(0, block.max_items || 4);
      }

      const pinnedIds = new Set(pinnedProductIds);
      let autoProducts: Product[] = [];

      switch (block.block_type) {
        case "discount":
          autoProducts = products.filter((p) => p.discount && !pinnedIds.has(p.id));
          break;
        case "new":
          autoProducts = products.filter((p) => p.isNew && !pinnedIds.has(p.id));
          break;
        case "category":
          autoProducts = products.filter((p) => (p.categories?.includes(block.category_filter!) || p.category === block.category_filter) && !pinnedIds.has(p.id));
          break;
        case "all":
        default:
          autoProducts = products.filter((p) => !pinnedIds.has(p.id));
          break;
      }

      const combined = [...pinnedProducts, ...autoProducts];
      const limit = block.block_type === "all" ? allBlockLimit : (block.max_items || 4);
      return combined.slice(0, limit);
    };
  }, [products, blockProducts, allBlockLimit]);

  const getBlockLink = (block: HomepageBlock): string => {
    switch (block.block_type) {
      case "discount":
        return "/catalog?discount=true";
      case "new":
        return "/catalog?new=true";
      case "category":
        return `/catalog?category=${block.category_filter}`;
      default:
        return "/catalog";
    }
  };

  const showBannerSkeleton = isLoadingBanners && banners.length === 0;
  const showBlocksSkeleton = (isLoadingBlocks || isLoadingProducts) && blocks.length === 0;

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <SEO jsonLd={homepageJsonLd} />

      <main className="container mx-auto px-3 pb-3 bg-[#faf5ea]">
        <section className="relative mb-4 overflow-hidden rounded-2xl">
          <Header variant="overlay" />
          {showBannerSkeleton ? (
            <Skeleton className="h-36 w-full rounded-2xl" />
          ) : (
            <BannerCarousel banners={banners} />
          )}
        </section>

        <section className="mb-5">
          <CategoryCircles categories={categories.filter((c) => c.slug !== "sets")} />
        </section>

        {showBlocksSkeleton && (
          <>
            {[1, 2, 3].map((i) => (
              <section key={i} className="mb-5">
                <Skeleton className="mb-3 h-5 w-40" />
                <ProductGridSkeleton count={4} />
              </section>
            ))}
          </>
        )}

        {blocks.map((block) => {
          const blockProductsList = getBlockProducts(block);
          if (blockProductsList.length === 0) return null;

          const isAllBlock = block.block_type === "all";
          const allProductsCount = isAllBlock
            ? products.filter((p) => !(blockProducts[block.id] || []).includes(p.id)).length + (blockProducts[block.id] || []).length
            : 0;
          const hasMoreInAllBlock = isAllBlock && allBlockLimit < allProductsCount;

          return (
            <section key={block.id} className="mb-5">
              <div className="flex items-center justify-between mb-3">
                <Link
                  to={getBlockLink(block)}
                  className="text-base text-foreground hover:text-primary font-serif font-bold"
                >
                  {block.emoji && `${block.emoji} `}
                  {block.title}
                </Link>
                <Link
                  to={getBlockLink(block)}
                  className="flex items-center text-xs hover:underline text-secondary-foreground"
                >
                  Все <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {blockProductsList.map((product) => (
                  <ProductCard key={product.id} product={product} isFavorite={favoriteIds.has(product.id)} onToggleFavorite={toggleFavorite} hasRequiredFields={productsWithRequiredFields.has(product.id)} isLowestPrice={lowestPriceIds.has(product.id)} />
                ))}
              </div>
              {hasMoreInAllBlock && (
                <div className="flex justify-center py-4">
                  <Button
                    variant="outline"
                    onClick={() => setAllBlockLimit((prev) => prev + ALL_BLOCK_STEP)}
                  >
                    Загрузить ещё
                  </Button>
                </div>
              )}
            </section>
          );
        })}

        {!isLoadingProducts && !isLoadingBlocks && products.length === 0 && blocks.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-muted-foreground mb-2">Товаров пока нет</p>
            <p className="text-sm text-muted-foreground">Продавцы скоро добавят свои товары</p>
          </div>
        )}
      </main>

      <footer className="border-t border-border py-4 pb-20 md:pb-4">
        <div className="container mx-auto px-3 flex flex-col items-center gap-1 text-[11px] text-muted-foreground">
          <span className="text-center whitespace-pre-line">УНП: CE6154534{"\n"}+375297399485 Котович Артём Владимирович</span>
          <div className="flex items-center gap-1">
            <span>© 2026 Locus</span>
            <span>·</span>
            <Link to="/privacy-policy" className="hover:underline">Политика конфиденциальности</Link>
          </div>
        </div>
      </footer>

      <BottomNavigation />
    </div>
  );
};

export default Index;
