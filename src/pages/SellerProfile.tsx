import { useParams, Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { SellerProductCard } from "@/components/seller/SellerProductCard";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { SEO } from "@/components/SEO";
import { usePickupLabels } from "@/hooks/usePickupLabels";
import { useProductsRequiredFields } from "@/hooks/useProductsRequiredFields";
import { compareSellerCategories } from "@/lib/sellerCategoryOrder";
import { SellerHero } from "@/components/seller/SellerHero";
import { SellerAbout } from "@/components/seller/SellerAbout";
import { SellerContactIcons } from "@/components/seller/SellerContactIcons";
import { SellerDelivery } from "@/components/seller/SellerDelivery";
import { SellerTrustFooter, type SellerContacts } from "@/components/seller/SellerTrustFooter";
import { SellerStickyCart } from "@/components/seller/SellerStickyCart";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useVisitorSource } from "@/hooks/useVisitorSource";
import { SellerCategoryTabs, catSectionId } from "@/components/seller/SellerCategoryTabs";

const THEMES = ["forest", "terracotta", "night", "sand"] as const;

/** Одна ссылка для быстрой связи: мессенджер важнее телефона. */
function sellerContactHref(contacts?: SellerContacts | null): string | null {
  if (!contacts) return null;
  const telegram = contacts.telegram?.trim();
  if (telegram) return `https://t.me/${telegram.replace(/^@/, "")}`;
  const whatsapp = contacts.whatsapp?.trim();
  if (whatsapp) return `https://wa.me/${whatsapp.replace(/\D/g, "")}`;
  const viber = contacts.viber?.trim();
  if (viber) return `viber://chat?number=${viber.replace(/\D/g, "")}`;
  const phone = contacts.phone?.trim();
  if (phone) return `tel:${phone.replace(/[^\d+]/g, "")}`;
  return null;
}

interface Farmer {
  id: string;
  slug?: string | null;
  name: string;
  description: string | null;
  district: string;
  village: string | null;
  city?: string | null;
  photo_url: string | null;
  rating?: number | null;
  hero_media_url?: string | null;
  hero_media_type?: string | null;
  unique_fact?: string | null;
  delivery_terms?: string | null;
  delivery_enabled?: boolean | null;
  pickup_enabled?: boolean | null;
  street?: string | null;
  address_details?: string | null;
  contacts?: SellerContacts | null;
  theme?: string | null;
  plan?: string | null;
  trial_ends_at?: string | null;
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
  farmer_id?: string;
  prep_time_minutes?: number;
  order_lead_time_hours?: number;
}

export default function SellerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  // Посетители маркетплейса видят нижнее меню и на витрине, трафик продавца — нет
  const visitorSource = useVisitorSource();
  const withMarketplaceNav = visitorSource !== "seller";

  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [ordersCount, setOrdersCount] = useState<number | null>(null);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [totalReviewCount, setTotalReviewCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsLoadError, setProductsLoadError] = useState(false);
  const pickupLabels = usePickupLabels(products as never);
  const productIds = useMemo(() => products.map((product) => product.id), [products]);
  const { data: requiredFieldIds = new Set<string>() } = useProductsRequiredFields(productIds);

  /** Наборы первыми, остальные категории — в существующем порядке. */
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
      const group = map.get(slug);
      if (group) group.items.push(p);
    });
    return Array.from(map.values()).sort(compareSellerCategories);
  }, [products]);

  useScrollRestoration();

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      if (!id) {
        setIsLoading(false);
        setProductsLoading(false);
        return;
      }

      setIsLoading(true);
      setProductsLoading(true);
      setProductsLoadError(false);
      setFarmer(null);
      setProducts([]);
      setOrdersCount(null);
      setAverageRating(null);
      setTotalReviewCount(0);

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      let farmerData: any = null;
      let farmerError: any = null;

      // Only request columns visible to anonymous visitors.
      const safeCols =
        "id, name, description, district, village, photo_url, city, slug, rating, is_blocked, created_at, user_id, hero_media_url, hero_media_type, unique_fact, delivery_terms, delivery_enabled, pickup_enabled, street, address_details, contacts, theme, plan, trial_ends_at";

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

      if (cancelled) return;
      if (farmerError || !farmerData) {
        console.error("Error fetching farmer:", farmerError);
        setIsLoading(false);
        setProductsLoading(false);
        return;
      }

      // Старая UUID-ссылка → заменяем на slug-версию (склейка дублей для SEO).
      if (isUUID && farmerData.slug && farmerData.slug !== id) {
        navigate(`/seller/${farmerData.slug}${window.location.search}`, { replace: true });
        return;
      }

      // Шапка появляется сразу; товары, отзывы и статистика не ждут друг друга.
      setFarmer(farmerData);
      setIsLoading(false);

      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("ref")) {
        localStorage.setItem("referrer_farmer_id", farmerData.id);
        localStorage.setItem("referrer_farmer_slug", farmerData.slug || farmerData.id);
        localStorage.setItem("referrer_farmer_ts", Date.now().toString());
      }

      void Promise.resolve(
        supabase
          .rpc("get_farmer_public_stats", { _farmer_id: farmerData.id })
          .then(({ data }) => {
            if (cancelled) return;
            const row = Array.isArray(data) ? data[0] : data;
            if (row?.orders_count != null) setOrdersCount(Number(row.orders_count));
          }),
      ).catch((statsError) => console.error("Error fetching farmer stats:", statsError));

      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(`
          id, title, slug, price, old_price, image_url, unit, is_new, farmer_id,
          category_id, prep_time_minutes, order_lead_time_hours,
          description, composition, shelf_life,
          categories(name, slug, emoji, sort_order)
        `)
        .eq("farmer_id", farmerData.id)
        .eq("is_active", true)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (productsError) {
        console.error("Error fetching seller products:", productsError);
        setProductsLoadError(true);
        setProductsLoading(false);
        return;
      }

      const productRows = productsData || [];
      const mappedProducts: Product[] = productRows.map((p) => ({
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
        rating: null,
        reviews: 0,
        seller: farmerData.name,
        description: (p as any).description || "",
        composition: (p as any).composition ?? null,
        shelfLife: (p as any).shelf_life ?? null,
        inStock: true,
        deliveryDays: 2,
        unit: p.unit,
        isNew: p.is_new || false,
        farmer_id: p.farmer_id,
        prep_time_minutes: p.prep_time_minutes || 0,
        order_lead_time_hours: (p as any).order_lead_time_hours || 0,
      }));

      // Карточки не блокируются запросом отзывов.
      setProducts(mappedProducts);
      setProductsLoading(false);

      if (!productRows.length) return;

      const { data: reviewsData, error: reviewsError } = await supabase
        .from("reviews")
        .select("product_id, rating")
        .in("product_id", productRows.map((p) => p.id));

      if (cancelled) return;
      if (reviewsError) {
        console.error("Error fetching seller reviews:", reviewsError);
        return;
      }

      const productRatings: Record<string, { sum: number; count: number }> = {};
      reviewsData?.forEach((r) => {
        if (!productRatings[r.product_id]) {
          productRatings[r.product_id] = { sum: 0, count: 0 };
        }
        productRatings[r.product_id].sum += r.rating;
        productRatings[r.product_id].count += 1;
      });

      const allSum = Object.values(productRatings).reduce((sum, rating) => sum + rating.sum, 0);
      const allCount = Object.values(productRatings).reduce((sum, rating) => sum + rating.count, 0);
      setTotalReviewCount(allCount);
      setAverageRating(allCount > 0 ? allSum / allCount : null);
      setProducts((current) => current.map((product) => {
        const rating = productRatings[product.id];
        return {
          ...product,
          rating: rating ? rating.sum / rating.count : null,
          reviews: rating?.count || 0,
        };
      }));
    };

    void fetchData().catch((loadError) => {
      if (cancelled) return;
      console.error("Error loading seller storefront:", loadError);
      setIsLoading(false);
      setProductsLoading(false);
      setProductsLoadError(true);
    });

    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto w-full max-w-3xl animate-pulse px-3 pt-2" aria-busy="true">
          <span className="sr-only" role="status">Загружаем магазин…</span>
          <div className="h-[190px] rounded-3xl bg-secondary sm:h-56" />
          <div className="mx-auto mt-4 h-4 w-2/3 rounded-full bg-secondary" />
          <div className="mx-auto mt-3 h-9 w-40 rounded-full bg-secondary" />
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="overflow-hidden rounded-xl bg-card">
                <div className="aspect-square bg-secondary" />
                <div className="space-y-2 p-3">
                  <div className="h-4 w-4/5 rounded bg-secondary" />
                  <div className="h-4 w-1/2 rounded bg-secondary" />
                  <div className="h-9 rounded-lg bg-secondary" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!farmer) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-xl font-bold text-foreground mb-2">Продавец не найден</h1>
          <Link to="/catalog" className="text-primary hover:underline">
            Вернуться в каталог
          </Link>
        </main>
      </div>
    );
  }

  const themeName = THEMES.includes((farmer.theme || "") as never) ? farmer.theme : "forest";
  const sellerSlug = farmer.slug || farmer.id;

  // Карточка товара — та же, что на главной странице маркетплейса
  const openProduct = (product: { slug?: string | null; id: string }) => {
    navigate(`/product/${product.slug || product.id}`);
  };
  const locationLabel = farmer.city?.trim() || farmer.village?.trim() || null;
  const canShowContacts =
    !!farmer.plan && farmer.plan !== "free" &&
    (!farmer.trial_ends_at || new Date(farmer.trial_ends_at).getTime() > Date.now());

  return (
    <div className={`seller-theme-${themeName} min-h-screen bg-background pb-0`}>
      <SEO
        title={`${farmer.name} — фермерские продукты на Locus`}
        description={
          farmer.unique_fact || farmer.description || `Продукты от ${farmer.name}. ${farmer.district}.`
        }
        image={farmer.hero_media_type === "image" ? farmer.hero_media_url || undefined : farmer.photo_url || undefined}
      />
      <Header />

      <div className="mx-auto w-full max-w-6xl">
      {/* 1. Компактная шапка: имя, статус, рейтинг, связь */}
      <SellerHero
        name={farmer.name}
        coverUrl={
          farmer.hero_media_url && farmer.hero_media_type !== "video"
            ? farmer.hero_media_url
            : products[0]?.image ?? null
        }
        description={farmer.unique_fact || farmer.description}
        locationLabel={locationLabel}
        rating={averageRating ?? farmer.rating}
        reviewCount={totalReviewCount}
        ordersCount={ordersCount}
        productsCount={products.length}
        productsLoading={productsLoading}
        avatarUrl={farmer.photo_url}
        sellerSlug={sellerSlug}
        contactHref={canShowContacts ? sellerContactHref(farmer.contacts) : null}
        instagram={farmer.contacts?.instagram}
      />

      <main className={`mx-auto w-full bg-[hsl(var(--seller-bg))] pt-1.5 ${withMarketplaceNav ? "pb-20 md:pb-2" : "pb-2"}`}>
        {/* 2. Условия получения — до каталога, чтобы снять страх доставки */}
        <SellerDelivery
          deliveryEnabled={farmer.delivery_enabled}
          deliveryTerms={farmer.delivery_terms}
          pickupEnabled={farmer.pickup_enabled}
          city={farmer.city}
          street={farmer.street}
          addressDetails={farmer.address_details}
        />

        <SellerCategoryTabs
          categories={groupedProducts.map((g) => ({ slug: g.slug, name: g.name, emoji: g.emoji }))}
        />

        <div className="px-3 pt-2">
          {/* 4. Каталог по категориям */}
          <div id="seller-catalog" className="scroll-mt-2">
            {productsLoading ? (
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3" aria-busy="true">
                <span className="sr-only" role="status">Загружаем товары…</span>
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="animate-pulse overflow-hidden rounded-xl bg-card">
                    <div className="aspect-square bg-secondary" />
                    <div className="space-y-2 p-3">
                      <div className="h-4 w-4/5 rounded bg-secondary" />
                      <div className="h-4 w-1/2 rounded bg-secondary" />
                      <div className="h-9 rounded-lg bg-secondary" />
                    </div>
                  </div>
                ))}
              </div>
            ) : productsLoadError ? (
              <div className="py-8 text-center text-muted-foreground" role="alert">
                Не удалось загрузить товары. Обновите страницу.
              </div>
            ) : products.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                У продавца пока нет товаров
              </div>
            ) : (
              groupedProducts.map((group, groupIndex) => (
                <section key={group.slug} id={catSectionId(group.slug)} className="mb-5 scroll-mt-3">
                  <h2 className="mb-2 font-sans text-[18px] font-bold tracking-tight text-foreground md:text-2xl">
                    {group.emoji ? `${group.emoji} ` : ""}
                    {group.name}
                  </h2>
                  <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
                    {group.items.map((product, index) => (
                      <SellerProductCard
                        key={product.id}
                        product={product as never}
                        pickupLabel={pickupLabels.get(product.id)}
                        hasRequiredFields={requiredFieldIds.has(product.id)}
                        priority={groupIndex === 0 && index < 2}
                        onOpen={() => openProduct(product)}
                      />
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>

          {/* 6. О продавце — после товаров: сначала еда, потом история */}
          <SellerAbout
            name={farmer.name}
            aboutText={farmer.description}
            photoUrl={farmer.photo_url}
          />

          {/* 7. Иконки контактов — только на платных тарифах */}
          {canShowContacts && <SellerContactIcons contacts={farmer.contacts} />}

          {/* 8. Футер доверия */}
          <SellerTrustFooter
            name={farmer.name}
            sellerSlug={sellerSlug}
            rating={averageRating}
            reviewCount={totalReviewCount}
          />
        </div>
      </main>
      </div>

      {/* 9. Плавающая корзина ведёт на единый checkout для всего сайта */}
      <SellerStickyCart farmerId={farmer.id} onCheckout={() => navigate("/checkout")} raised={withMarketplaceNav} />
      <BottomNavigation />
    </div>
  );
}
