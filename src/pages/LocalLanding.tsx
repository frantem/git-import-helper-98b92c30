import { useParams, Link, Navigate } from "react-router-dom";
import { useMemo } from "react";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ProductCard } from "@/components/ProductCard";
import { ProductGridSkeleton } from "@/components/ProductCardSkeleton";
import { SEO } from "@/components/SEO";
import { useProducts, useProductRatings, transformProduct } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useFavorites } from "@/hooks/useFavorites";
import { useProductsRequiredFields } from "@/hooks/useProductsRequiredFields";
import { computeLowestPriceIds } from "@/lib/lowestPriceUtils";
import { usePickupLabels } from "@/hooks/usePickupLabels";
import {
  localLandingTitle,
  localLandingDescription,
  faqJsonLd,
  breadcrumbJsonLd,
  defaultLocalFaq,
  DOMAIN,
  CITY_NOM,
} from "@/lib/seoHelpers";

export default function LocalLanding() {
  const { slug } = useParams<{ slug: string }>();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const { data: productsWithRequiredFields = new Set<string>() } = useProductsRequiredFields();

  const { data: rawProducts = [], isLoading: isLoadingProducts } = useProducts();
  const { data: categories = [], isLoading: isLoadingCategories } = useCategories();
  const productIds = useMemo(() => rawProducts.map((p) => p.id), [rawProducts]);
  const { data: ratings = {} } = useProductRatings(productIds);

  const products = useMemo(
    () => rawProducts.map((p) => transformProduct(p, ratings)),
    [rawProducts, ratings]
  );
  const lowestPriceIds = useMemo(() => computeLowestPriceIds(products), [products]);
  const pickupLabels = usePickupLabels(products);

  const category = useMemo(
    () => categories.find((c) => c.slug === slug) || null,
    [categories, slug]
  );

  const filtered = useMemo(() => {
    if (!category) return [];
    return products.filter(
      (p) => p.categories?.includes(category.slug) || p.category === category.slug
    );
  }, [products, category]);

  const faq = useMemo(
    () => (category ? defaultLocalFaq(category.name) : []),
    [category]
  );

  const otherCategories = useMemo(
    () => categories.filter((c) => c.slug !== slug && c.slug !== "sets").slice(0, 8),
    [categories, slug]
  );

  if (!isLoadingCategories && categories.length > 0 && !category) {
    return <Navigate to="/catalog" replace />;
  }

  if (isLoadingCategories || isLoadingProducts || !category) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Header />
        <main className="container mx-auto px-4 py-6">
          <ProductGridSkeleton count={8} />
        </main>
        <BottomNavigation />
      </div>
    );
  }

  const seoCat = {
    slug: category.slug,
    name: category.name,
    emoji: category.emoji,
    seo_title: (category as any).seo_title,
    seo_description: (category as any).seo_description,
    seo_keywords: (category as any).seo_keywords,
  };

  const title = localLandingTitle(seoCat);
  const description = localLandingDescription(seoCat, filtered.length);
  const canonical = `${DOMAIN}/vitebsk/${category.slug}`;

  const jsonLd = [
    faqJsonLd(faq),
    breadcrumbJsonLd([
      { name: "Главная", url: DOMAIN },
      { name: CITY_NOM, url: `${DOMAIN}/catalog` },
      { name: category.name, url: canonical },
    ]),
  ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <SEO
        title={title}
        description={description}
        canonical={canonical}
        jsonLd={jsonLd as unknown as Record<string, unknown>[]}
      />
      <Header />

      <main className="container mx-auto px-4 py-6 bg-[#faf5ea]">
        <nav className="mb-3 text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">Главная</Link>
          {" / "}
          <Link to="/catalog" className="hover:underline">Каталог</Link>
          {" / "}
          <span className="text-foreground">{category.name}</span>
        </nav>

        <h1 className="mb-2 font-serif text-2xl font-bold md:text-3xl">
          {category.emoji ? `${category.emoji} ` : ""}
          {category.name} в {CITY_NOM}е с доставкой
        </h1>
        <p className="mb-6 text-sm text-secondary-foreground md:text-base">
          {description}
        </p>

        {filtered.length > 0 ? (
          <section className="mb-8">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {filtered.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isFavorite={favoriteIds.has(product.id)}
                  onToggleFavorite={toggleFavorite}
                  hasRequiredFields={productsWithRequiredFields.has(product.id)}
                  isLowestPrice={lowestPriceIds.has(product.id)}
                />
              ))}
            </div>
          </section>
        ) : (
          <p className="py-8 text-center text-muted-foreground">
            Скоро здесь появятся товары этой категории. <Link to="/catalog" className="text-primary hover:underline">Посмотреть все товары</Link>
          </p>
        )}

        {otherCategories.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 font-serif text-lg font-bold">Смотрите также</h2>
            <div className="flex flex-wrap gap-2">
              {otherCategories.map((c) => (
                <Link
                  key={c.id}
                  to={`/vitebsk/${c.slug}`}
                  className="rounded-full bg-primary-foreground px-4 py-2 text-sm hover:bg-primary/10"
                >
                  {c.emoji ? `${c.emoji} ` : ""}{c.name} в {CITY_NOM}е
                </Link>
              ))}
            </div>
          </section>
        )}

        {faq.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 font-serif text-lg font-bold">Частые вопросы</h2>
            <div className="space-y-3">
              {faq.map((item, i) => (
                <details key={i} className="rounded-xl bg-primary-foreground p-4">
                  <summary className="cursor-pointer font-medium text-foreground">
                    {item.question}
                  </summary>
                  <p className="mt-2 text-sm text-secondary-foreground">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
