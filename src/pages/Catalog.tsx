import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ProductCard } from "@/components/ProductCard";
import { PageHeader } from "@/components/PageHeader";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronRight, Heart, Tag, Sparkles } from "lucide-react";
import { ProductGridSkeleton } from "@/components/ProductCardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { useMemo } from "react";
import { useProducts, useProductRatings, transformProduct } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useFavorites } from "@/hooks/useFavorites";
import { useProductsRequiredFields } from "@/hooks/useProductsRequiredFields";
import { SEO } from "@/components/SEO";

export default function Catalog() {
  useScrollRestoration();
  const [searchParams] = useSearchParams();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const { data: productsWithRequiredFields = new Set<string>() } = useProductsRequiredFields();

  const categoryFilter = searchParams.get("category");
  const discountFilter = searchParams.get("discount") === "true";
  const newFilter = searchParams.get("new") === "true";
  const searchQuery = searchParams.get("search");

  // Cached data with React Query
  const { data: rawProducts = [], isLoading: isLoadingProducts } = useProducts();
  const { data: categories = [], isLoading: isLoadingCategories } = useCategories();
  const productIds = useMemo(() => rawProducts.map((p) => p.id), [rawProducts]);
  const { data: ratings = {} } = useProductRatings(productIds);

  // Transform products with ratings
  const products = useMemo(
    () => rawProducts.map((p) => transformProduct(p, ratings)),
    [rawProducts, ratings]
  );

  // Memoized filtered products
  const { filteredProducts, pageTitle } = useMemo(() => {
    let filtered = products;
    let title = "Каталог";

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = products.filter((p) => 
        p.name.toLowerCase().includes(query) ||
        p.seller.toLowerCase().includes(query)
      );
      title = `🔍 Поиск: ${searchQuery}`;
    } else if (categoryFilter) {
      filtered = products.filter((p) => p.categories?.includes(categoryFilter) || p.category === categoryFilter);
      const category = categories.find((c) => c.slug === categoryFilter);
      title = category ? `${category.emoji || ""} ${category.name}` : "Каталог";
    } else if (discountFilter) {
      filtered = products.filter((p) => p.discount);
      title = "🏷️ Скидки";
    } else if (newFilter) {
      filtered = [...products];
      title = "✨ Новинки";
    }

    return { filteredProducts: filtered, pageTitle: title };
  }, [products, categories, categoryFilter, discountFilter, newFilter, searchQuery]);

  const showCategories = !categoryFilter && !discountFilter && !newFilter && !searchQuery;
  const isLoading = isLoadingProducts || isLoadingCategories;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Header />
        <main className="container mx-auto px-4 py-4 md:py-6">
          <Skeleton className="mb-4 h-6 w-32" />
          <ProductGridSkeleton count={8} />
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <SEO
        title={pageTitle !== "Каталог" ? `${pageTitle} — Locus` : "Каталог продуктов — Locus"}
        description={`${pageTitle}. Свежие фермерские продукты с доставкой в Витебске.`}
      />
      <Header />

      <main className="container mx-auto px-4 py-4 md:py-6">
        {showCategories ? (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Link
                to="/catalog?discount=true"
                className="flex items-center gap-3 rounded-xl bg-primary/10 p-4 hover:bg-primary/20 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
                  <Tag className="h-5 w-5 text-primary" />
                </div>
                <span className="font-medium text-foreground">Скидки</span>
              </Link>
              <Link
                to="/favorites"
                className="flex items-center gap-3 rounded-xl bg-accent/10 p-4 hover:bg-accent/20 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20">
                  <Heart className="h-5 w-5 text-accent" />
                </div>
                <span className="font-medium text-foreground">Избранное</span>
              </Link>
              <Link
                to="/catalog?new=true"
                className="flex items-center gap-3 rounded-xl bg-success/10 p-4 hover:bg-success/20 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/20">
                  <Sparkles className="h-5 w-5 text-success" />
                </div>
                <span className="font-medium text-foreground">Новинки</span>
              </Link>
              <Link
                to="/catalog?category=sets"
                className="flex items-center gap-3 rounded-xl bg-secondary p-4 hover:bg-secondary/80 transition-colors"
              >
                <span className="text-2xl">🧺</span>
                <span className="font-medium text-foreground">Наборы</span>
              </Link>
            </div>

            <h2 className="text-lg font-bold mb-3">Категории</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {categories
                .filter((c) => c.slug !== "sets")
                .map((category) => (
                  <Link
                    key={category.id}
                    to={`/catalog?category=${category.slug}`}
                    className="flex items-center gap-3 rounded-xl bg-card p-4 hover:bg-secondary transition-colors"
                  >
                    <span className="text-2xl">{category.emoji || "📁"}</span>
                    <span className="font-medium text-foreground">{category.name}</span>
                    <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <PageHeader title={pageTitle} />
              <Link to="/catalog" className="text-sm text-primary hover:underline ml-auto">
                Все категории
              </Link>
            </div>

            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} isFavorite={favoriteIds.has(product.id)} onToggleFavorite={toggleFavorite} hasRequiredFields={productsWithRequiredFields.has(product.id)} />
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">Товары не найдены</p>
                <Link to="/catalog" className="mt-2 inline-block text-primary hover:underline">
                  Посмотреть все товары
                </Link>
              </div>
            )}
          </>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
