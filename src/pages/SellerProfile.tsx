import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { PageHeader } from "@/components/PageHeader";
import { ProductCard } from "@/components/ProductCard";
import { Star, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { cdnImage } from "@/lib/imageCdn";
import { usePickupLabels } from "@/hooks/usePickupLabels";
import { useSellerPage } from "@/hooks/useSellerPage";
import { SellerHero } from "@/components/seller/SellerHero";
import { SellerPosts } from "@/components/seller/SellerPosts";
import { SellerPromos } from "@/components/seller/SellerPromos";

interface Farmer {
  id: string;
  name: string;
  description: string | null;
  district: string;
  village: string | null;
  photo_url: string | null;
  tagline?: string | null;
  about_text?: string | null;
  hero_media_url?: string | null;
  hero_media_type?: string | null;
  location_label?: string | null;
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
  isNew?: boolean;
  farmer_id?: string;
  prep_time_minutes?: number;
  order_lead_time_hours?: number;
}

interface SellerReview {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  text: string;
  createdAt: string;
  images?: string[];
  productTitle: string;
  productId: string;
  productSlug: string | null;
}


export default function SellerProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const pickupLabels = usePickupLabels(products);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [totalReviewCount, setTotalReviewCount] = useState(0);
  const [sellerReviews, setSellerReviews] = useState<SellerReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const { data: pageContent } = useSellerPage(farmer?.id);

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


  const fetchSellerReviews = useCallback(async (farmerId: string) => {
    // Get ALL products for this farmer (including deleted ones)
    const { data: allProducts } = await supabase
      .from("products")
      .select("id, title, slug")
      .eq("farmer_id", farmerId);

    if (!allProducts?.length) {
      setSellerReviews([]);
      setTotalReviewCount(0);
      return;
    }

    const productIds = allProducts.map(p => p.id);
    const productTitleMap = new Map(allProducts.map(p => [p.id, p.title]));
    const productSlugMap = new Map(allProducts.map(p => [p.id, (p as any).slug as string | null]));

    const { data: reviewsData } = await supabase
      .from("reviews")
      .select("*")
      .in("product_id", productIds)
      .order("created_at", { ascending: false });

    if (!reviewsData?.length) {
      setSellerReviews([]);
      setTotalReviewCount(0);
      setAverageRating(null);
      return;
    }

    const userIds = reviewsData.map(r => r.user_id);
    const reviewIds = reviewsData.map(r => r.id);

    const [profilesRes, imagesRes] = await Promise.all([
      supabase.rpc("get_public_profile_names", { _user_ids: userIds }),
      supabase.from("review_images").select("review_id, image_url, sort_order").in("review_id", reviewIds).order("sort_order"),
    ]);

    const profilesMap = new Map(profilesRes.data?.map(p => [p.user_id, p.full_name]) || []);
    const imagesMap = new Map<string, string[]>();
    imagesRes.data?.forEach(img => {
      const arr = imagesMap.get(img.review_id) || [];
      arr.push(img.image_url);
      imagesMap.set(img.review_id, arr);
    });

    const mapped: SellerReview[] = reviewsData.map(r => ({
      id: r.id,
      userId: r.user_id,
      userName: profilesMap.get(r.user_id) || "Пользователь",
      rating: r.rating,
      text: r.text || "",
      createdAt: r.created_at,
      images: imagesMap.get(r.id) || [],
      productTitle: productTitleMap.get(r.product_id) || "Товар",
      productId: r.product_id,
      productSlug: productSlugMap.get(r.product_id) || null,
    }));

    setSellerReviews(mapped);
    setTotalReviewCount(mapped.length);
    const avg = mapped.reduce((sum, r) => sum + r.rating, 0) / mapped.length;
    setAverageRating(avg);
  }, []);

  const handleDeleteReview = async (reviewId: string) => {
    if (!user) return;
    const review = sellerReviews.find(r => r.id === reviewId);
    if (review?.images?.length) {
      await supabase.from("review_images").delete().eq("review_id", reviewId);
      const folder = `${user.id}/${reviewId}`;
      const { data: files } = await supabase.storage.from("review-images").list(folder);
      if (files?.length) {
        await supabase.storage.from("review-images").remove(files.map(f => `${user.id}/${reviewId}/${f.name}`));
      }
    }
    const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
    if (error) {
      toast.error("Ошибка при удалении отзыва");
      return;
    }
    toast.success("Отзыв удалён");
    if (farmer) fetchSellerReviews(farmer.id);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      let farmerData: any = null;
      let farmerError: any = null;

      // Only request columns visible to anonymous visitors. street/address_details
      // are restricted to authenticated users by column-level grants.
      const safeCols = "id, name, description, district, village, photo_url, city, slug, rating, is_blocked, created_at, user_id, tagline, about_text, hero_media_url, hero_media_type, location_label";

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
        localStorage.setItem("referrer_farmer_ts", Date.now().toString());
      }

      // Fetch active products
      const { data: productsData } = await supabase
        .from("products")
        .select(`
          id, title, price, old_price, image_url, unit, is_new, farmer_id,
          category_id, prep_time_minutes, order_lead_time_hours, categories(name, slug, emoji, sort_order)
        `)
        .eq("farmer_id", farmerData.id)
        .eq("is_active", true)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

      if (productsData) {
        const productIds = productsData.map(p => p.id);
        const { data: reviewsData } = await supabase
          .from("reviews")
          .select("product_id, rating")
          .in("product_id", productIds);

        const productRatings: Record<string, { sum: number; count: number }> = {};
        reviewsData?.forEach(r => {
          if (!productRatings[r.product_id]) {
            productRatings[r.product_id] = { sum: 0, count: 0 };
          }
          productRatings[r.product_id].sum += r.rating;
          productRatings[r.product_id].count += 1;
        });

        const mappedProducts: Product[] = productsData.map(p => {
          const ratings = productRatings[p.id];
          return {
            id: p.id,
            name: p.title,
            price: p.price,
            oldPrice: p.old_price || undefined,
            discount: p.old_price ? Math.round((1 - p.price / p.old_price) * 100) : undefined,
            image: p.image_url || "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=400&fit=crop",
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
            farmer_id: p.farmer_id,
            prep_time_minutes: p.prep_time_minutes || 0,
            order_lead_time_hours: (p as any).order_lead_time_hours || 0,
          };
        });

        setProducts(mappedProducts);
      }

      // Fetch all seller reviews
      await fetchSellerReviews(farmerData.id);

      setIsLoading(false);
    };

    fetchData();
  }, [id, fetchSellerReviews]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const scrollToReviews = () => {
    document.getElementById("seller-reviews")?.scrollIntoView({ behavior: "smooth" });
  };

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

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <SEO
        title={`Фермерское хозяйство ${farmer.name} на Locus`}
        description={farmer.description || `Фермерские продукты от ${farmer.name}. ${farmer.district}.`}
        image={farmer.photo_url || undefined}
      />
      <Header />

      {/* 1. Обложка: название, девиз, о продавце, локация */}
      <SellerHero
        name={farmer.name}
        tagline={farmer.tagline}
        aboutText={farmer.about_text || farmer.description}
        locationLabel={
          farmer.location_label ||
          `📍 ${farmer.district}${farmer.village ? `, ${farmer.village}` : ""}`
        }
        mediaUrl={farmer.hero_media_url}
        mediaType={farmer.hero_media_type}
        fallbackImage={farmer.photo_url}
      />

      <main className="container mx-auto px-3 py-4 bg-[#faf5ea]">
        {averageRating !== null && (
          <div className="mb-5 flex items-center gap-1">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="font-medium text-foreground">{averageRating.toFixed(1)}</span>
            <button onClick={scrollToReviews} className="ml-1 text-sm text-primary hover:underline">
              ({totalReviewCount} отзывов)
            </button>
          </div>
        )}

        {/* 2. Посты про продукты */}
        <SellerPosts posts={pageContent?.posts || []} />

        {/* 3. Акции и наборы */}
        <SellerPromos promos={pageContent?.promos || []} />

        {/* 4. Товары по категориям */}
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
                    product={product}
                    pickupLabel={pickupLabels.get(product.id)}
                  />
                ))}
              </div>
            </section>
          ))
        )}


        {/* Seller Reviews */}
        <div id="seller-reviews" className="mb-4">
          <h2 className="text-lg font-bold text-foreground mb-3">
            Отзывы ({totalReviewCount})
          </h2>

          {sellerReviews.length > 0 ? (
            <div className="space-y-4">
              {sellerReviews.map((review) => (
                <div key={review.id} className="rounded-lg bg-card p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-medium">
                        {review.userName.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-foreground">{review.userName}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(review.createdAt)}
                    </span>
                  </div>

                  <div className="mb-1 flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn(
                          "h-4 w-4",
                          review.rating >= star
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground"
                        )}
                      />
                    ))}
                  </div>

                  <Link
                    to={`/product/${review.productSlug || review.productId}`}
                    className="text-xs text-primary hover:underline mb-1 inline-block"
                  >
                    {review.productTitle}
                  </Link>

                  {review.text && (
                    <p className="text-sm text-muted-foreground">{review.text}</p>
                  )}

                  {review.images && review.images.length > 0 && (
                    <div className="mt-2 flex gap-2">
                      {review.images.map((img, i) => (
                        <button
                          key={i}
                          onClick={() => setLightboxImage(img)}
                          className="h-16 w-16 rounded-lg overflow-hidden bg-secondary"
                        >
                          <img src={cdnImage(img, "thumb")} alt="" className="h-full w-full object-cover" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  )}

                  {user && review.userId === user.id && (
                    <button
                      onClick={() => {
                        if (window.confirm("Удалить отзыв?")) {
                          handleDeleteReview(review.id);
                        }
                      }}
                      className="mt-2 flex items-center gap-1 text-xs text-destructive hover:underline"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Удалить
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg bg-card p-4 text-center text-sm text-muted-foreground">
              Пока нет отзывов
            </div>
          )}
        </div>
      </main>

      {/* Lightbox */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-2">
          {lightboxImage && (
            <img src={cdnImage(lightboxImage, "detail")} alt="" className="w-full h-auto max-h-[80vh] object-contain rounded" />
          )}
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>
  );
}
