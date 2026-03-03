import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { BannerCarousel } from "@/components/BannerCarousel";
import { ProductCard } from "@/components/ProductCard";
import { ProductGridSkeleton } from "@/components/ProductCardSkeleton";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { useEffect, useMemo, useState } from "react";
import { useProducts, useProductRatings, transformProduct, Product } from "@/hooks/useProducts";
import { useBanners } from "@/hooks/useBanners";
import { useHomepageBlocks, HomepageBlock } from "@/hooks/useHomepageBlocks";
import { useFavorites } from "@/hooks/useFavorites";
import { useProductsRequiredFields } from "@/hooks/useProductsRequiredFields";
import { Skeleton } from "@/components/ui/skeleton";

let savedAllBlockLimit = 10;

const Index = () => {
  useScrollRestoration();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const { data: productsWithRequiredFields = new Set<string>() } = useProductsRequiredFields();

  // Cached data with React Query
  const { data: rawProducts = [], isLoading: isLoadingProducts } = useProducts();
  const productIds = useMemo(() => rawProducts.map((p) => p.id), [rawProducts]);
  const { data: ratings = {} } = useProductRatings(productIds);
  const { data: banners = [], isLoading: isLoadingBanners } = useBanners();
  const { data: blocksData, isLoading: isLoadingBlocks } = useHomepageBlocks();

  const blocks = blocksData?.blocks || [];
  const blockProducts = blocksData?.blockProducts || {};

  // Transform products with ratings - memoized
  const products = useMemo(
    () => rawProducts.map((p) => transformProduct(p, ratings)),
    [rawProducts, ratings]
  );

  const ALL_BLOCK_STEP = 10;
  const [allBlockLimit, setAllBlockLimit] = useState(savedAllBlockLimit);

  useEffect(() => {
    savedAllBlockLimit = allBlockLimit;
  }, [allBlockLimit]);

  // Helper to get products for a block - memoized
  // Supports hybrid approach: pinned products first, then auto-fill with block type filter
  const getBlockProducts = useMemo(() => {
    return (block: HomepageBlock): Product[] => {

      // 1. Get pinned (manually added) products first
      const pinnedProductIds = blockProducts[block.id] || [];
      const pinnedProducts = products.filter((p) => pinnedProductIds.includes(p.id));

      // 2. For "custom" type - only show pinned products
      if (block.block_type === "custom") {
        return pinnedProducts.slice(0, block.max_items || 4);
      }

      // 3. For other types - fill remaining slots with auto-selected products
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

      // 4. Combine: pinned first, then auto-fill
      const combined = [...pinnedProducts, ...autoProducts];
      const limit = block.block_type === "all" ? allBlockLimit : (block.max_items || 4);
      return combined.slice(0, limit);
    };
  }, [products, blockProducts, allBlockLimit]);

  // Get link for block
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

  const isLoading = isLoadingProducts || isLoadingBanners || isLoadingBlocks;


  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Header />
        <main className="container mx-auto px-3 py-3">
          <Skeleton className="mb-4 h-36 w-full rounded-2xl" />
          {[1, 2, 3].map((i) => (
            <section key={i} className="mb-5">
              <Skeleton className="mb-3 h-5 w-40" />
              <ProductGridSkeleton count={4} />
            </section>
          ))}
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />

      <main className="container mx-auto px-3 py-3">
        {/* Banner carousel */}
        <section className="mb-4">
          <BannerCarousel banners={banners} />
        </section>

        {/* Dynamic homepage blocks */}
        {blocks.map((block) => {
          const blockProductsList = getBlockProducts(block);
          if (blockProductsList.length === 0) return null;

          // Check if "all" block has more products
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
                  className="text-base font-bold text-foreground hover:text-primary"
                >
                  {block.emoji && `${block.emoji} `}
                  {block.title}
                </Link>
                <Link
                  to={getBlockLink(block)}
                  className="flex items-center text-xs text-primary hover:underline"
                >
                  Все <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {blockProductsList.map((product) => (
                  <ProductCard key={product.id} product={product} isFavorite={favoriteIds.has(product.id)} onToggleFavorite={toggleFavorite} hasRequiredFields={productsWithRequiredFields.has(product.id)} />
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

        {/* Empty state */}
        {products.length === 0 && blocks.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-muted-foreground mb-2">Товаров пока нет</p>
            <p className="text-sm text-muted-foreground">Продавцы скоро добавят свои товары</p>
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Index;
