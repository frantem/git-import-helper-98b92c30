import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ProductCard } from "@/components/ProductCard";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { SEO } from "@/components/SEO";
import { usePickupLabels } from "@/hooks/usePickupLabels";
import { useProductsRequiredFields } from "@/hooks/useProductsRequiredFields";
import { useSellerPage } from "@/hooks/useSellerPage";
import { SellerHero } from "@/components/seller/SellerHero";
import { SellerAbout } from "@/components/seller/SellerAbout";
import { SellerContactIcons } from "@/components/seller/SellerContactIcons";
import { SellerHits } from "@/components/seller/SellerHits";
import { SellerDelivery } from "@/components/seller/SellerDelivery";
import { SellerPosts } from "@/components/seller/SellerPosts";
import { SellerPromos } from "@/components/seller/SellerPromos";
import { SellerTrustFooter, type SellerContacts } from "@/components/seller/SellerTrustFooter";

const THEMES = ["forest", "terracotta", "night", "sand"] as const;

interface Farmer {
  id: string;
  slug?: string | null;
  name: string;
  description: string | null;
  district: string;
  village: string | null;
  photo_url: string | null;
  rating?: number | null;
  tagline?: string | null;
  about_text?: string | null;
  hero_media_url?: string | null;
  hero_media_type?: string | null;
  location_label?: string | null;
  posts_block_title?: string | null;
  unique_fact?: string | null;
  delivery_note?: string | null;
  contacts?: SellerContacts | null;
  theme?: string | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  discount?: number;
  image: string;
  category: string;
  categoryName?: string;
  categoryEmoji?: string | null;
  categorySort?: number;
  rating: number | null;
  reviews: number;
  seller: string;
  description: string;
  inStock: boolean;
  deliveryDays: number;
  unit: string;
  slug?: string;
  isNew?: boolean;
  isFeatured?: boolean;
  farmer_id?: string;
  prep_time_minutes?: number;
  order_lead_time_hours?: number;
}

export default function SellerProfile() {
  const { id } = useParams();
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [ordersCount, setOrdersCount] = useState<number | null>(null);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [totalReviewCount, setTotalReviewCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const pickupLabels = usePickupLabels(products as never);
  const { data: requiredFieldIds = new Set<string>() } = useProductsRequiredFields();
  const { data: pageContent } = useSellerPage(farmer?.id);

  /** Хиты: товары, отмеченные продавцом (максимум 4). */
  const hits = useMemo(() => products.filter((p) => p.isFeatured).slice(0, 4), [products]);

  /** Группировка товаров по категориям (порядок — как в каталоге). */
  const groupedProducts = useMemo(() => {
    const map = new Map<
      string,
      { slug: string; name: string; emoji: string | null; sort: number; items: Product[] }
    >();
    products.forEach((p) => {
      const slug = p.category || "other";
      if (!map.has(slug)) {
        map.set(slug, {
          slug,
          name: p.categoryName || "Другое",
          emoji: p.categoryEmoji || null,
          sort: p.categorySort ?? 999,
          items: [],
        });
      }
      map.get(slug)!.items.push(p);
    });
    return Array.from(map.values()).sort((a, b) => a.sort - b.sort);
  }, [products]);

  useScrollRestoration();

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

      let farmerData: any = null;
      let farmerError: any = null;

      // Only request columns visible to anonymous visitors.
      const safeCols =
        "id, name, description, district, village, photo_url, city, slug, rating, is_blocked, created_at, user_id, tagline, about_text, hero_media_url, hero_media_type, location_label, posts_block_title, unique_fact, delivery_note, contacts, theme, plan, trial_ends_at";

      if (!isUUID) {
        const res = await supabase.from("farmers").select(safeCols).eq("slug", id).single();
        farmerData = res.data;
        farmerError = res.error;
      }

      if (!farmerData) {
        const res = await supabase.from("farmers").select(safeCols).eq("id", id).single();
        farmerData = res.data;
        farmerError = res.error;
      }

      if (farmerError) {
        console.error("Error fetching farmer:", farmerError);
        setIsLoading(false);
        return;
      }

      setFarmer(farmerData);

      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("ref")) {
        localStorage.setItem("referrer_farmer_id", farmerData.id);
        localStorage.setItem("referrer_farmer_slug", farmerData.slug || farmerData.id);
        localStorage.setItem("referrer_farmer_ts", Date.now().toString());
      }

      // Публичная статистика продавца (кол-во выполненных заказов)
      supabase
        .rpc("get_farmer_public_stats", { _farmer_id: farmerData.id })
        .then(({ data }) => {
          const row = Array.isArray(data) ? data[0] : data;
          if (row?.orders_count != null) setOrdersCount(Number(row.orders_count));
        });

      // Fetch active products
      const { data: productsData } = await supabase
        .from("products")
        .select(`
          id, title, slug, price, old_price, image_url, unit, is_new, is_featured, farmer_id,
          category_id, prep_time_minutes, order_lead_time_hours, categories(name, slug, emoji, sort_order)
        `)
        .eq("farmer_id", farmerData.id)
        .eq("is_active", true)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

      if (productsData) {
        const productIds = productsData.map((p) => p.id);
        const { data: reviewsData } = await supabase
          .from("reviews")
          .select("product_id, rating")
          .in("product_id", productIds);

        const productRatings: Record<string, { sum: number; count: number }> = {};
        reviewsData?.forEach((r) => {
          if (!productRatings[r.product_id]) {
            productRatings[r.product_id] = { sum: 0, count: 0 };
          }
          productRatings[r.product_id].sum += r.rating;
          productRatings[r.product_id].count += 1;
        });

        const allSum = Object.values(productRatings).reduce((s, r) => s + r.sum, 0);
        const allCount = Object.values(productRatings).reduce((s, r) => s + r.count, 0);
        setTotalReviewCount(allCount);
        setAverageRating(allCount > 0 ? allSum / allCount : null);

        const mappedProducts: Product[] = productsData.map((p) => {
          const ratings = productRatings[p.id];
          return {
            id: p.id,
            name: p.title,
            slug: (p as any).slug || undefined,
            price: p.price,
            oldPrice: p.old_price || undefined,
            discount: p.old_price ? Math.round((1 - p.price / p.old_price) * 100) : undefined,
            image:
              p.image_url ||
              "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=400&fit=crop",
            category: p.categories?.slug || "",
            categoryName: p.categories?.name || "Другое",
            categoryEmoji: (p.categories as any)?.emoji ?? null,
            categorySort: (p.categories as any)?.sort_order ?? 999,
            rating: ratings ? ratings.sum / ratings.count : null,
            reviews: ratings?.count || 0,
            seller: farmerData.name,
            description: "",
            inStock: true,
            deliveryDays: 2,
            unit: p.unit,
            isNew: p.is_new || false,
            isFeatured: (p as any).is_featured || false,
            farmer_id: p.farmer_id,
            prep_time_minutes: p.prep_time_minutes || 0,
            order_lead_time_hours: (p as any).order_lead_time_hours || 0,
          };
        });

        setProducts(mappedProducts);
      }

      setIsLoading(false);
    };

    fetchData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Header />
        <main className="container mx-auto flex items-center justify-center px-4 py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <BottomNavigation />
      </div>
    );
  }

  if (!farmer) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Header />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-xl font-bold text-foreground mb-2">Продавец не найден</h1>
          <Link to="/catalog" className="text-primary hover:underline">
            Вернуться в каталог
          </Link>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  const themeName = THEMES.includes((farmer.theme || "") as never) ? farmer.theme : "forest";
  const sellerSlug = farmer.slug || farmer.id;
  const locationLabel =
    farmer.location_label || `${farmer.district}${farmer.village ? `, ${farmer.village}` : ""}`;

  return (
    <div className={`seller-theme-${themeName} min-h-screen bg-background pb-16 md:pb-0`}>
      <SEO
        title={`${farmer.name} — фермерские продукты на Locus`}
        description={
          farmer.unique_fact || farmer.description || `Продукты от ${farmer.name}. ${farmer.district}.`
        }
        image={farmer.hero_media_type === "image" ? farmer.hero_media_url || undefined : farmer.photo_url || undefined}
      />
      <Header />

      {/* 1. Hero */}
      <SellerHero
        name={farmer.name}
        uniqueFact={farmer.unique_fact}
        locationLabel={locationLabel}
        ordersCount={ordersCount}
        mediaUrl={farmer.hero_media_url}
        mediaType={farmer.hero_media_type}
        fallbackImage={farmer.photo_url}
      />

      <main className="container mx-auto bg-[hsl(var(--seller-bg))] px-3 py-4">
        {/* 2. О нас */}
        <SellerAbout
          name={farmer.name}
          aboutText={farmer.about_text || farmer.tagline || farmer.description}
          photoUrl={farmer.photo_url}
        />

        {/* 3. Хиты */}
        <SellerHits products={hits as never} requiredFieldIds={requiredFieldIds} />

        {/* 4. Доставка и самовывоз */}
        <SellerDelivery note={farmer.delivery_note} />

        {/* Посты-статьи продавца */}
        <SellerPosts
          posts={pageContent?.posts || []}
          blockTitle={farmer.posts_block_title}
        />

        {/* Иконки контактов — под блоком «О нас» */}
        <SellerContactIcons contacts={farmer.contacts} />

        {/* 5. Акции и наборы */}
        <SellerPromos promos={pageContent?.promos || []} />

        {/* 6. Полный каталог по категориям */}
        <div id="seller-catalog" className="scroll-mt-4">
          {products.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              У продавца пока нет товаров
            </div>
          ) : (
            groupedProducts.map((group) => (
              <section key={group.slug} className="mb-6">
                <h2 className="mb-3 font-serif text-lg font-bold text-foreground md:text-2xl">
                  {group.emoji ? `${group.emoji} ` : ""}
                  {group.name}
                </h2>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {group.items.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product as never}
                      pickupLabel={pickupLabels.get(product.id)}
                      hasRequiredFields={requiredFieldIds.has(product.id)}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        {/* 7. Футер доверия */}
        <SellerTrustFooter
          name={farmer.name}
          sellerSlug={sellerSlug}
          rating={averageRating}
          reviewCount={totalReviewCount}
        />
      </main>

      <BottomNavigation />
    </div>
  );
}
