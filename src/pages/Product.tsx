import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { compressImage } from "@/lib/imageUtils";
import { ArrowLeft, Heart, Share2, Star, ShoppingCart, Loader2 } from "lucide-react";

import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ProductReviews } from "@/components/ProductReviews";
import { useCart } from "@/contexts/CartContext";
import { CartItemCustomField, CartItemAddon } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatPrice, calculateOldPrice } from "@/lib/priceUtils";
import { BynSymbol } from "@/components/ui/byn-symbol";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { useProduct } from "@/hooks/useProduct";
import { useProductCustomFields } from "@/hooks/useProductCustomFields";
import { SEO } from "@/components/SEO";
import { useSeoTemplates } from "@/hooks/useSeoTemplates";
import { trackMetaEvent } from "@/lib/metaPixel";

import { MapPin } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { ProductImageLightbox } from "@/components/ProductImageLightbox";
interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  text: string;
  createdAt: string;
  images?: string[];
}


export default function Product() {
  const {
    id
  } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    addToCart
  } = useCart();
  const {
    user
  } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [selectedCheckboxAddons, setSelectedCheckboxAddons] = useState<Set<string>>(new Set());
  const [selectedRadioAddon, setSelectedRadioAddon] = useState<string | null>(null);
  useScrollRestoration();

  // Show toast if redirected from product card with required fields
  useEffect(() => {
    if (searchParams.get("fill_required") === "true") {
      toast.info("Заполните обязательные поля перед добавлением в корзину");
    }
  }, [searchParams]);

  // Determine if ID is UUID (from database)
  const isUUID = id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  // Use cached product data
  const {
    data: productData,
    isLoading: isLoadingProduct
  } = useProduct(id);

  const dbProduct = productData?.product || null;
  const productImages = productData?.images || [];
  const variants = productData?.variants || [];
  const farmerRating = productData?.farmerRating || null;
  const addons = productData?.addons || [];
  // Custom fields
  const {
    data: customFields = []
  } = useProductCustomFields(id);
  const { data: seoTemplates } = useSeoTemplates();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);


  // Build farmer location string
  const farmerCity = dbProduct?.farmers?.city;
  const farmerStreet = dbProduct?.farmers?.street;
  const farmerLocation = farmerCity && farmerStreet ? `г. ${farmerCity} ${farmerStreet}` : farmerCity ? `г. ${farmerCity}` : "Уточняйте у продавца";

  // Set default variant when data loads
  useEffect(() => {
    if (variants.length > 0 && !selectedVariantId) {
      const defaultVariant = variants.find(v => v.is_default) || variants[0];
      setSelectedVariantId(defaultVariant.id);
    }
  }, [variants, selectedVariantId]);
  const selectedVariant = useMemo(() => variants.find(v => v.id === selectedVariantId) || null, [variants, selectedVariantId]);

  // Check if product is in favorites
  useEffect(() => {
    const checkFavorite = async () => {
      if (!user || !id || !isUUID) return;
      const {
        data
      } = await supabase.from("favorites").select("id").eq("user_id", user.id).eq("product_id", id).maybeSingle();
      setIsFavorite(!!data);
    };
    checkFavorite();
  }, [user, id, isUUID]);
  const toggleFavorite = async () => {
    if (!user) {
      toast.error("Войдите, чтобы добавить в избранное");
      return;
    }
    if (!id || !isUUID) {
      toast.error("Избранное доступно только для товаров из каталога");
      return;
    }
    if (isFavorite) {
      const {
        error
      } = await supabase.from("favorites").delete().eq("user_id", user.id).eq("product_id", id);
      if (!error) {
        setIsFavorite(false);
        toast.success("Удалено из избранного");
      }
    } else {
      const {
        error
      } = await supabase.from("favorites").insert({
        user_id: user.id,
        product_id: id
      });
      if (!error) {
        setIsFavorite(true);
        toast.success("Добавлено в избранное");
      }
    }
  };
  const fetchReviews = useCallback(async () => {
    if (!id || !isUUID) return;
    const {
      data: reviewsData,
      error: reviewsError
    } = await supabase.from("reviews").select("*").eq("product_id", id).order("created_at", {
      ascending: false
    });
    if (reviewsError) {
      console.error("Error fetching reviews:", reviewsError);
      return;
    }
    if (reviewsData && reviewsData.length > 0) {
      const userIds = reviewsData.map(r => r.user_id);
      const reviewIds = reviewsData.map(r => r.id);

      // Fetch profiles and images in parallel
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

      const mappedReviews = reviewsData.map(r => ({
        id: r.id,
        userId: r.user_id,
        userName: profilesMap.get(r.user_id) || "Пользователь",
        rating: r.rating,
        text: r.text || "",
        createdAt: r.created_at,
        images: imagesMap.get(r.id) || [],
      }));
      setReviews(mappedReviews);
      const avg = mappedReviews.reduce((sum, r) => sum + r.rating, 0) / mappedReviews.length;
      setAverageRating(avg);
    } else {
      setReviews([]);
    }
  }, [id, isUUID]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);
  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Meta Pixel: ViewContent on product load
  useEffect(() => {
    if (!dbProduct) return;
    trackMetaEvent("ViewContent", {
      content_ids: [dbProduct.id],
      content_name: dbProduct.title,
      content_type: "product",
      content_category: dbProduct.categories?.name,
      value: dbProduct.price / 100,
      currency: "BYN",
    });
  }, [dbProduct?.id]);

  // Build unified product object from database
  const product = dbProduct ? {
    id: dbProduct.id,
    name: dbProduct.title,
    price: dbProduct.price,
    oldPrice: dbProduct.old_price,
    discount: dbProduct.old_price ? Math.round((1 - dbProduct.price / dbProduct.old_price) * 100) : undefined,
    image: dbProduct.image_url || "/placeholder.svg",
    category: dbProduct.categories?.name || "",
    rating: averageRating || null,
    reviews: reviews.length,
    seller: dbProduct.farmers?.name || "Фермер",
    description: dbProduct.description || "",
    inStock: dbProduct.stock > 0 && dbProduct.is_active,
    isActive: dbProduct.is_active,
    deliveryDays: 2,
    unit: dbProduct.unit,
    district: dbProduct.farmers?.district,
    village: dbProduct.farmers?.village,
    isNew: dbProduct.is_new,
    farmer_id: dbProduct.farmer_id,
    prep_time_minutes: dbProduct.prep_time_minutes
  } : null;

  // Build all images array for carousel
  const allImages = dbProduct ? [dbProduct.image_url || "/placeholder.svg", ...productImages.map(img => img.image_url)] : [];
  const handleAddReview = async (rating: number, text: string, files: File[]) => {
    if (!user || !id) {
      toast.error("Войдите, чтобы оставить отзыв");
      return;
    }
    if (!isUUID) {
      toast.error("Отзывы доступны только для товаров из каталога");
      return;
    }
    const {
      data: reviewData,
      error
    } = await supabase.from("reviews").insert({
      user_id: user.id,
      product_id: id,
      rating,
      text: text || null
    }).select("id").single();
    if (error || !reviewData) {
      console.error("Error adding review:", error);
      toast.error("Ошибка при добавлении отзыва");
      return;
    }

    // Upload images if any
    if (files.length > 0) {
      const imageRows: { review_id: string; image_url: string; sort_order: number }[] = [];
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressImage(files[i]);
        const ext = compressed.name.split(".").pop() || "jpg";
        const path = `${user.id}/${reviewData.id}/${i}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("review-images")
          .upload(path, compressed, { upsert: true });
        if (uploadErr) {
          console.error("Upload error:", uploadErr);
          continue;
        }
        const { data: urlData } = supabase.storage
          .from("review-images")
          .getPublicUrl(path);
        imageRows.push({
          review_id: reviewData.id,
          image_url: urlData.publicUrl,
          sort_order: i,
        });
      }
      if (imageRows.length > 0) {
        await supabase.from("review_images").insert(imageRows);
      }
    }

    toast.success("Отзыв добавлен!");
    fetchReviews();
  };

  const handleDeleteReview = async (reviewId: string) => {
    // Delete images from storage first
    const review = reviews.find(r => r.id === reviewId);
    if (review?.images?.length) {
      await supabase.from("review_images").delete().eq("review_id", reviewId);
      // Delete files from storage
      const folder = `${user!.id}/${reviewId}/`;
      const { data: files } = await supabase.storage.from("review-images").list(folder.replace(/\/$/, ""));
      if (files?.length) {
        await supabase.storage.from("review-images").remove(files.map(f => `${user!.id}/${reviewId}/${f.name}`));
      }
    }
    const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
    if (error) {
      toast.error("Ошибка при удалении отзыва");
      return;
    }
    toast.success("Отзыв удалён");
    fetchReviews();
  };
  // Check if all custom fields are filled
  const allCustomFieldsFilled = useMemo(() => {
    if (customFields.length === 0) return true;
    return customFields.every(field => {
      const value = customFieldValues[field.id];
      return value && value.trim().length > 0;
    });
  }, [customFields, customFieldValues]);

  // Calculate addons total (must be before early returns)
  const checkboxAddons = addons.filter(a => a.selection_type === 'checkbox');
  const radioAddons = addons.filter(a => a.selection_type === 'radio');
  
  const addonsTotal = useMemo(() => {
    let total = 0;
    checkboxAddons.forEach(a => {
      if (selectedCheckboxAddons.has(a.id)) total += a.price;
    });
    if (selectedRadioAddon) {
      const ra = radioAddons.find(a => a.id === selectedRadioAddon);
      if (ra) total += ra.price;
    }
    return total;
  }, [selectedCheckboxAddons, selectedRadioAddon, checkboxAddons, radioAddons]);

  if (isLoadingProduct) {
    return <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Header />
        <main className="container mx-auto flex items-center justify-center px-4 py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <BottomNavigation />
      </div>;
  }
  if (!product) {
    return <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Header />
        <main className="container mx-auto flex flex-col items-center justify-center px-4 py-16">
          <h1 className="mb-2 text-xl font-bold text-foreground">Товар не найден</h1>
          <Link to="/catalog">
            <Button variant="default">Вернуться в каталог</Button>
          </Link>
        </main>
        <BottomNavigation />
      </div>;
  }

  // Check if product is archived/inactive
  const isArchived = dbProduct && !dbProduct.is_active;

  // Price logic - use selected variant if available
  const displayPrice = selectedVariant ? selectedVariant.price : product.price;
  const displayUnit = selectedVariant ? selectedVariant.unit : product.unit;
  const variantDiscount = selectedVariant?.discount_percent || 0;
  const currentPrice = formatPrice(displayPrice + addonsTotal);
  // Calculate old price from variant discount or product discount
  const effectiveDiscount = variantDiscount > 0 ? variantDiscount : product.discount || 0;
  const calculatedOldPrice = effectiveDiscount > 0 ? calculateOldPrice(displayPrice, effectiveDiscount) : null;
  const oldPriceFormatted = calculatedOldPrice ? formatPrice(calculatedOldPrice + addonsTotal) : null;
  const displayRating = reviews.length > 0 ? averageRating : product.rating || null;
  const displayReviewCount = reviews.length > 0 ? reviews.length : product.reviews || 0;
  const buildCustomFieldsData = (): CartItemCustomField[] => {
    return customFields.map(field => ({
      fieldId: field.id,
      label: field.label,
      value: customFieldValues[field.id] || "",
      fieldType: field.field_type
    }));
  };
  const buildAddonsData = (): CartItemAddon[] => {
    const selected: CartItemAddon[] = [];
    checkboxAddons.forEach(a => {
      if (selectedCheckboxAddons.has(a.id)) {
        selected.push({ addonId: a.id, name: a.name, price: a.price });
      }
    });
    if (selectedRadioAddon) {
      const ra = radioAddons.find(a => a.id === selectedRadioAddon);
      if (ra) selected.push({ addonId: ra.id, name: ra.name, price: ra.price });
    }
    return selected;
  };
  const handleBuyNow = () => {
    if (!allCustomFieldsFilled) {
      toast.error("Заполните все обязательные поля");
      return;
    }
    if (product) {
      const variantData = selectedVariant ? {
        id: selectedVariant.id,
        label: selectedVariant.label,
        price: selectedVariant.price,
        unit: selectedVariant.unit
      } : undefined;
      const cf = customFields.length > 0 ? buildCustomFieldsData() : undefined;
      const adns = addons.length > 0 ? buildAddonsData() : undefined;
      addToCart(product as any, variantData, cf, adns);
    }
    navigate("/cart");
  };
  const handleAddToCart = () => {
    if (!allCustomFieldsFilled) {
      toast.error("Заполните все обязательные поля");
      return;
    }
    if (product) {
      const variantData = selectedVariant ? {
        id: selectedVariant.id,
        label: selectedVariant.label,
        price: selectedVariant.price,
        unit: selectedVariant.unit
      } : undefined;
      const cf = customFields.length > 0 ? buildCustomFieldsData() : undefined;
      const adns = addons.length > 0 ? buildAddonsData() : undefined;
      addToCart(product as any, variantData, cf, adns);
      toast.success("Добавлено в корзину");
    }
  };
  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };
  const copyToClipboard = async (text: string): Promise<boolean> => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // Fall through to fallback
      }
    }
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      return successful;
    } catch {
      return false;
    }
  };
  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareTitle = product?.name || "Товар";
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: `Смотрите: ${shareTitle} на Locus`,
          url: shareUrl
        });
        return;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
      }
    }
    const copied = await copyToClipboard(shareUrl);
    if (copied) {
      toast.success("Ссылка скопирована!");
    } else {
      toast.error("Не удалось скопировать ссылку");
    }
  };
  const productSeoTitle = product
    ? (seoTemplates?.product_title_template || "{name} купить в Витебске — Locus").replace("{name}", product.name)
    : undefined;

  const productJsonLd = product ? {
    "@type": "Product",
    name: product.name,
    sku: product.id,
    mpn: product.id,
    productID: product.id,
    category: product.category || undefined,
    description: product.description || undefined,
    image: product.image !== "/placeholder.svg" ? product.image : undefined,
    brand: {
      "@type": "Brand",
      name: product.seller,
    },
    offers: {
      "@type": "Offer",
      price: (displayPrice / 100).toFixed(2),
      priceCurrency: "BYN",
      availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `https://locusfood.by/product/${product.id}`,
      priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: "0",
          currency: "BYN",
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "BY",
          addressRegion: "Витебск",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
          transitTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 2, unitCode: "DAY" },
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "BY",
        returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
        merchantReturnLink: "https://locusfood.by/privacy-policy",
      },
    },
    ...(displayRating && displayReviewCount > 0 ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: displayRating.toFixed(1),
        reviewCount: displayReviewCount,
      },
    } : {}),
    ...(reviews.length > 0 ? {
      review: reviews.slice(0, 5).map(r => ({
        "@type": "Review",
        author: { "@type": "Person", name: r.userName },
        datePublished: r.createdAt?.split("T")[0],
        reviewRating: {
          "@type": "Rating",
          ratingValue: r.rating,
          bestRating: 5,
        },
        ...(r.text ? { reviewBody: r.text } : {}),
      })),
    } : {}),
  } : undefined;

  const breadcrumbJsonLd = product ? {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: "https://locusfood.by" },
      { "@type": "ListItem", position: 2, name: "Каталог", item: "https://locusfood.by/catalog" },
      { "@type": "ListItem", position: 3, name: product.name, item: `https://locusfood.by/product/${product.id}` },
    ],
  } : undefined;

  const allJsonLd = productJsonLd && breadcrumbJsonLd
    ? [
        { "@context": "https://schema.org", ...productJsonLd },
        { "@context": "https://schema.org", ...breadcrumbJsonLd },
      ]
    : productJsonLd;

  const productSeoDescription = product
    ? `Купить ${product.name.toLowerCase()} в Витебске. Цена ${(displayPrice / 100).toFixed(2).replace(".", ",")} BYN${product.unit ? ` за ${product.unit}` : ""}. ${product.seller ? `Фермер: ${product.seller}. ` : ""}Доставка по Витебску, оплата при получении.${product.description ? ` ${product.description}` : ""}`.slice(0, 160)
    : undefined;

  return <div className="min-h-screen bg-background pb-32 md:pb-0">
      <SEO
        title={productSeoTitle}
        description={productSeoDescription}
        image={product?.image}
        ogType="product"
        canonical={product ? `https://locusfood.by/product/${product.id}` : undefined}
        jsonLd={allJsonLd as unknown as Record<string, unknown> | Record<string, unknown>[]}
      />
      <Header />

      <main className="container mx-auto px-4 py-4 md:py-6 bg-[#faf5ea]">
        {/* Mobile back button */}
        <button onClick={handleGoBack} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary md:hidden">
          <ArrowLeft className="h-4 w-4" />
          Назад
        </button>

        <div className="flex flex-col lg:flex-row lg:gap-10 gap-[10px]">
          {/* Product image(s) */}
          <div className="relative lg:flex-1">
            {allImages.length > 1 ? <Carousel className="w-full">
                <CarouselContent>
                  {allImages.map((img, index) => <CarouselItem key={index}>
                      <div className="relative aspect-square overflow-hidden rounded-xl bg-card">
                        <OptimizedImage src={img} alt={`${product.name} - фото ${index + 1}`} preset="detail" className="h-full w-full" loading={index === 0 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : "auto"} />
                      </div>
                    </CarouselItem>)}
                </CarouselContent>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </Carousel> : <div className="relative aspect-square overflow-hidden rounded-xl bg-card">
                <OptimizedImage src={product.image} alt={product.name} preset="detail" className="h-full w-full" loading="eager" fetchPriority="high" />
              </div>}

            {product.discount && <span className="absolute left-4 top-4 rounded px-3 py-1 text-sm font-bold text-primary-foreground z-10 bg-[#ab5a3f]">
                -{product.discount}%
              </span>}

            {/* Actions */}
            <div className="absolute right-4 top-4 flex gap-2 z-10">
              <button onClick={toggleFavorite} className="rounded-full bg-card/80 p-2 backdrop-blur-sm transition-colors hover:bg-card">
                <Heart className={cn("h-5 w-5", isFavorite ? "fill-primary text-primary" : "text-muted-foreground")} />
              </button>
              <button onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              handleShare();
            }} className="rounded-full bg-card/80 p-2 backdrop-blur-sm transition-colors hover:bg-card">
                <Share2 className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Title - right after image */}
          <h1 className="mt-2 text-xl font-bold text-foreground md:text-2xl">{product.name}</h1>
          <p className={cn("mt-1 text-sm", product.prep_time_minutes && product.prep_time_minutes > 0 ? "text-muted-foreground" : "text-green-600")}>
            {!product.prep_time_minutes || product.prep_time_minutes === 0
              ? "В наличии"
              : `Время приготовления: ${product.prep_time_minutes < 60 ? `${product.prep_time_minutes}мин.` : `${Math.round(product.prep_time_minutes / 60)}ч.`}`
            }
          </p>

          {/* Rating - compact, only show if there are reviews */}
          {displayRating !== null && displayReviewCount > 0 && <div className="mt-1 flex items-center gap-3 rounded-md p-1">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-base font-bold text-foreground">
                  {displayRating.toFixed(1)}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">{displayReviewCount} оценок</span>
            </div>}

          {/* Price block - compact format */}
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-base font-bold text-foreground">
              {currentPrice.formatted}<BynSymbol />
              <span className="text-sm font-normal text-muted-foreground">/{displayUnit}</span>
            </span>
            {oldPriceFormatted && <span className="text-sm text-muted-foreground line-through">
                {oldPriceFormatted.formatted}<BynSymbol />
              </span>}
          </div>

          {/* Product Variants selector - only show if more than 1 variant */}
          {variants.length > 1 && <div className="mt-3 flex flex-wrap gap-2">
              {variants.map(variant => <button key={variant.id} onClick={() => setSelectedVariantId(variant.id)} className={cn("rounded-lg text-sm font-semibold transition-colors border-2 py-[4px] px-[12px]", selectedVariant?.id === variant.id ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-foreground border-border hover:bg-secondary/80 hover:border-primary/50")}>
                  {variant.label}
                </button>)}
            </div>}

          {/* Custom fields - between variants and product info */}
          {customFields.length > 0 && <div className="mt-3 space-y-3">
              {customFields.map(field => <div key={field.id}>
                  <label className="text-sm font-medium text-foreground">
                    {field.label} <span className="text-destructive">*</span>
                  </label>
                  {field.field_type === "text" ? <Input value={customFieldValues[field.id] || ""} onChange={e => setCustomFieldValues(prev => ({
              ...prev,
              [field.id]: e.target.value
            }))} placeholder={field.placeholder || ""} maxLength={field.max_length || 50} className="mt-1" /> : <div className="mt-1 flex flex-wrap gap-2">
                      {field.options.map(option => <button key={option.id} onClick={() => setCustomFieldValues(prev => ({
                ...prev,
                [field.id]: option.label
              }))} className={cn("rounded-lg text-sm font-semibold transition-colors border-2 py-[4px] px-[12px]", customFieldValues[field.id] === option.label ? "bg-primary text-primary-foreground border-primary" : "text-foreground border-border hover:border-primary/50 bg-primary-foreground")}>
                          {option.label}
                        </button>)}
                    </div>}
                </div>)}
            </div>}

          {/* Add-ons block */}
          {addons.length > 0 && (
            <div className="mt-3 space-y-2">
              <span className="text-sm font-medium text-foreground">Добавки:</span>
              
              {/* Checkbox add-ons */}
              {checkboxAddons.map(addon => {
                const addonPrice = formatPrice(addon.price);
                return (
                  <label key={addon.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedCheckboxAddons.has(addon.id)}
                      onCheckedChange={(checked) => {
                        setSelectedCheckboxAddons(prev => {
                          const next = new Set(prev);
                          if (checked) next.add(addon.id);
                          else next.delete(addon.id);
                          return next;
                        });
                      }}
                    />
                    <span className="text-sm text-foreground">{addon.name}</span>
                    <span className="text-sm text-muted-foreground">
                      +{addonPrice.formatted}<BynSymbol />
                    </span>
                  </label>
                );
              })}

              {/* Radio add-ons */}
              {radioAddons.length > 0 && (
                <div className="space-y-1">
                  {radioAddons.map(addon => {
                    const addonPrice = formatPrice(addon.price);
                    return (
                      <label key={addon.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="product-addon-radio"
                          checked={selectedRadioAddon === addon.id}
                          onChange={() => setSelectedRadioAddon(prev => prev === addon.id ? null : addon.id)}
                          className="h-4 w-4 accent-primary"
                        />
                        <span className="text-sm text-foreground">{addon.name}</span>
                        <span className="text-sm text-muted-foreground">
                          +{addonPrice.formatted}<BynSymbol />
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Product info */}
          <div className="lg:w-96 lg:flex-shrink-0">
            {/* Rating moved above price */}

            {/* Composition, KBZU, Shelf life */}
            {dbProduct?.composition && (
              <p className="mb-2 text-muted-foreground">
                <span className="font-medium text-foreground">Состав: </span>
                {dbProduct.composition}
              </p>
            )}
            {(dbProduct?.calories != null || dbProduct?.protein != null || dbProduct?.fat != null || dbProduct?.carbs != null) && (
              <p className="mb-2 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">На 100гр</span>
                <span className="font-medium text-foreground">
                  К: {dbProduct.calories ?? 0}, Б: {dbProduct.protein ?? 0}, Ж: {dbProduct.fat ?? 0}, У: {dbProduct.carbs ?? 0}
                </span>
              </p>
            )}
            {dbProduct?.shelf_life && (
              <p className="mb-2 text-muted-foreground">
                <span className="font-medium text-foreground">Срок хранения: </span>
                {dbProduct.shelf_life}
              </p>
            )}

            {/* Description */}
            <p className="mb-2 text-muted-foreground"><span className="font-medium text-foreground">Описание: </span>{product.description}</p>

            {/* Seller - compact */}
            <Link to={`/seller/${product.farmer_id}`} className="block mb-2">
              <div className="rounded-md bg-card p-2 hover:bg-card/80 transition-colors cursor-pointer px-px mx-0 py-[8px]">
                <div className="flex items-center justify-between px-[10px]">
                  <div className="flex items-center gap-1.5">
                    {dbProduct?.farmers?.photo_url ? <img src={dbProduct.farmers.photo_url} alt={product.seller} className="h-9 w-9 rounded-full object-cover" /> : <span className="text-lg">🧑‍🌾</span>}
                    <span className="font-medium text-foreground text-sm">{product.seller}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {farmerRating !== null && <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {farmerRating.toFixed(1)}
                      </div>}
                    <span className="text-xs text-primary font-medium">Все товары →</span>
                  </div>
                </div>
                {farmerCity && farmerStreet && (
                  <div className="mt-2 px-[10px]">
                    <p className="text-sm text-foreground">📍 Доступен самовывоз: г.{farmerCity} ул.{farmerStreet}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 ml-5">Точный адрес станет доступен после оформления заказа</p>
                  </div>
                )}
              </div>
            </Link>

            {/* Features */}
            <div className="mb-6 space-y-2 text-sm">
              
            </div>

            {/* Action buttons - desktop */}
            {isArchived ? <div className="hidden md:block rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-center">
                <p className="font-medium text-destructive">Товар снят с продажи</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Этот товар больше недоступен для заказа
                </p>
              </div> : <div className="hidden gap-3 md:flex">
                <Button variant="buy" size="lg" className="flex-1" onClick={handleBuyNow}>
                  Купить сейчас
                </Button>
                <Button variant="cart" size="lg" className="flex-1" onClick={handleAddToCart}>
                  <ShoppingCart className="mr-2 h-5 w-5" />В корзину
                </Button>
              </div>}
          </div>
        </div>

        {/* Reviews section */}
        {isUUID && <section className="mt-8">
            <ProductReviews productId={product.id} reviews={reviews} averageRating={displayRating || 0} totalReviews={displayReviewCount} onAddReview={handleAddReview} onDeleteReview={handleDeleteReview} />
          </section>}
      </main>

      {/* Mobile action buttons */}
      {isArchived ? <div className="fixed bottom-16 left-0 right-0 z-40 border-t border-border bg-card p-4 shadow-lg md:hidden">
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-center">
            <p className="font-medium text-destructive">Товар снят с продажи</p>
          </div>
        </div> : <div className="fixed bottom-16 left-0 right-0 z-40 flex gap-2 border-t border-border bg-card p-4 shadow-lg md:hidden">
          <Button variant="buy" size="lg" className="flex-1" onClick={handleBuyNow}>
            Купить сейчас
          </Button>
          <Button variant="cart" size="lg" className="flex-1" onClick={handleAddToCart}>
            В корзину
          </Button>
        </div>}

      <BottomNavigation />
    </div>;
}
