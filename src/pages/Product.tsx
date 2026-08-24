import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { compressImage } from "@/lib/imageUtils";
import { ArrowLeft, Heart, Share2, Star, ShoppingCart, Loader2, ChevronRight } from "lucide-react";

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

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { useProduct } from "@/hooks/useProduct";
import { useProductCustomFields } from "@/hooks/useProductCustomFields";
import { SEO } from "@/components/SEO";
import { useSeoTemplates } from "@/hooks/useSeoTemplates";
import { trackMetaEvent } from "@/lib/metaPixel";
import { formatRelativeTime } from "@/lib/pickupUtils";
import { usePickupLabels } from "@/hooks/usePickupLabels";

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
    addToCart,
    items,
    updateQuantity,
    removeFromCart,
    getItemKey
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
  } = useProductCustomFields(dbProduct?.id);
  const { data: seoTemplates } = useSeoTemplates();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);


  // Build farmer location string. Street/address_details are private and only
  // shared with authenticated buyers at checkout; the public product page shows city only.
  const farmerCity = dbProduct?.farmers?.city;
  const farmerLocation = farmerCity ? `г. ${farmerCity}` : "Уточняйте у продавца";

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
      if (!user || !dbProduct?.id) return;
      const {
        data
      } = await supabase.from("favorites").select("id").eq("user_id", user.id).eq("product_id", dbProduct.id).maybeSingle();
      setIsFavorite(!!data);
    };
    checkFavorite();
  }, [user, dbProduct?.id]);
  const toggleFavorite = async () => {
    if (!user) {
      toast.error("Войдите, чтобы добавить в избранное");
      return;
    }
    if (!dbProduct?.id) {
      toast.error("Избранное доступно только для товаров из каталога");
      return;
    }
    if (isFavorite) {
      const {
        error
      } = await supabase.from("favorites").delete().eq("user_id", user.id).eq("product_id", dbProduct.id);
      if (!error) {
        setIsFavorite(false);
        toast.success("Удалено из избранного");
      }
    } else {
      const {
        error
      } = await supabase.from("favorites").insert({
        user_id: user.id,
        product_id: dbProduct.id
      });
      if (!error) {
        setIsFavorite(true);
        toast.success("Добавлено в избранное");
      }
    }
  };
  const fetchReviews = useCallback(async () => {
    const productId = dbProduct?.id;
    if (!productId) return;
    const {
      data: reviewsData,
      error: reviewsError
    } = await supabase.from("reviews").select("*").eq("product_id", productId).order("created_at", {
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
  }, [dbProduct?.id]);
  // Scroll-to-top on navigation is handled centrally by <ScrollManager />.
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
    slug: (dbProduct as any).slug as string | null,
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
    prep_time_minutes: dbProduct.prep_time_minutes,
    order_lead_time_hours: (dbProduct as any).order_lead_time_hours || 0
  } as any : null;

  // If user arrived via UUID but the product has a slug, replace URL with slug version (SEO).
  useEffect(() => {
    if (product?.slug && id && isUUID && id !== product.slug) {
      navigate(`/product/${product.slug}`, { replace: true });
    }
  }, [product?.slug, id, isUUID, navigate]);

  const pickupLabelInput = useMemo(
    () => (product ? [{ id: product.id, farmer_id: product.farmer_id, prep_time_minutes: product.prep_time_minutes, order_lead_time_hours: product.order_lead_time_hours }] : []),
    [product?.id, product?.farmer_id, product?.prep_time_minutes, product?.order_lead_time_hours]
  );
  const pickupLabels = usePickupLabels(pickupLabelInput);
  const pickupLabel = product ? pickupLabels.get(product.id) : undefined;

  // Build all images array for carousel
  const allImages = dbProduct ? [dbProduct.image_url || "/placeholder.svg", ...productImages.map(img => img.image_url)] : [];
  const handleAddReview = async (rating: number, text: string, files: File[]) => {
    if (!user || !id) {
      toast.error("Войдите, чтобы оставить отзыв");
      return;
    }
    if (!dbProduct?.id) {
      toast.error("Отзывы доступны только для товаров из каталога");
      return;
    }
    const {
      data: reviewData,
      error
    } = await supabase.from("reviews").insert({
      user_id: user.id,
      product_id: dbProduct.id,
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
  const cartVariantData = useMemo(() => selectedVariant ? {
    id: selectedVariant.id,
    label: selectedVariant.label,
    price: selectedVariant.price,
    unit: selectedVariant.unit
  } : undefined, [selectedVariant]);
  const cartCustomFields = useMemo(() => customFields.length > 0 ? buildCustomFieldsData() : undefined, [customFields, customFieldValues]);
  const cartAddons = useMemo(() => addons.length > 0 ? buildAddonsData() : undefined, [addons, selectedCheckboxAddons, selectedRadioAddon]);
  const currentItemKey = useMemo(() => {
    if (!product) return null;
    return getItemKey({ product: product as any, quantity: 1, variant: cartVariantData, customFields: cartCustomFields, addons: cartAddons });
  }, [product, cartVariantData, cartCustomFields, cartAddons, getItemKey]);
  const currentQuantity = useMemo(() => {
    if (!currentItemKey) return 0;
    const item = items.find(i => getItemKey(i) === currentItemKey);
    return item ? item.quantity : 0;
  }, [items, currentItemKey, getItemKey]);
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

  const handleBuyNow = () => {
    if (!allCustomFieldsFilled) {
      toast.error("Заполните все обязательные поля");
      return;
    }
    if (product) {
      addToCart(product as any, cartVariantData, cartCustomFields, cartAddons);
    }
    navigate("/cart");
  };
  const handleAddToCart = () => {
    if (!allCustomFieldsFilled) {
      toast.error("Заполните все обязательные поля");
      return;
    }
    if (product) {
      addToCart(product as any, cartVariantData, cartCustomFields, cartAddons);
      toast.success("Добавлено в корзину");
    }
  };
  const handleIncrement = () => {
    if (!product) return;
    if (currentQuantity > 0) {
      updateQuantity(currentItemKey!, currentQuantity + 1);
    } else {
      addToCart(product as any, cartVariantData, cartCustomFields, cartAddons);
    }
  };
  const handleDecrement = () => {
    if (!currentItemKey || currentQuantity <= 0) return;
    if (currentQuantity > 1) {
      updateQuantity(currentItemKey, currentQuantity - 1);
    } else {
      removeFromCart(currentItemKey);
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
      name: product.seller || "Locus",
    },
    offers: {
      "@type": "Offer",
      price: (displayPrice / 100).toFixed(2),
      priceCurrency: "BYN",
      availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `https://locusfood.by/product/${product.slug || product.id}`,
      priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: "6.90",
          currency: "BYN",
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "BY",
          addressRegion: "Витебская область",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
          transitTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "BY",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteWindow",
        merchantReturnDays: 14,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/FreeReturn",
        merchantReturnLink: "https://locusfood.by/delivery",
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
      { "@type": "ListItem", position: 3, name: product.name, item: `https://locusfood.by/product/${product.slug || product.id}` },
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

  const nutrition = [
    { label: "К", value: dbProduct?.calories, unit: "ккал" },
    { label: "Б", value: dbProduct?.protein, unit: "г" },
    { label: "Ж", value: dbProduct?.fat, unit: "г" },
    { label: "У", value: dbProduct?.carbs, unit: "г" },
  ];
  const hasNutrition = nutrition.some(n => n.value != null);

  return <div className="min-h-screen bg-background pb-20 md:pb-0">
      <SEO
        title={productSeoTitle}
        description={productSeoDescription}
        image={product?.image}
        ogType="product"
        canonical={product ? `https://locusfood.by/product/${product.slug || product.id}` : undefined}
        jsonLd={allJsonLd as unknown as Record<string, unknown> | Record<string, unknown>[]}
      />
      <Header />

      <main className="container mx-auto px-0 pb-6 md:px-4 md:py-6 bg-[#faf5ea]">
        <div className="flex flex-col lg:flex-row lg:items-start lg:gap-10">
          {/* Product image(s) */}
          <div className="relative lg:flex-1">
            {/* Floating back button over image */}
            <button
              type="button"
              onClick={handleGoBack}
              aria-label="Назад"
              className="absolute left-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-primary-foreground backdrop-blur-md transition-colors hover:bg-black/50 md:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            {allImages.length > 1 ? <Carousel className="w-full">
                <CarouselContent>
                  {allImages.map((img, index) => <CarouselItem key={index}>
                      <button
                        type="button"
                        onClick={() => setLightboxIndex(index)}
                        className="relative aspect-square w-full overflow-hidden rounded-b-[28px] bg-card cursor-zoom-in lg:rounded-2xl"
                        aria-label="Открыть фото"
                      >
                        <OptimizedImage src={img} alt={`${product.name} - фото ${index + 1}`} preset="detail" className="h-full w-full" loading={index === 0 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : "auto"} />
                      </button>
                    </CarouselItem>)}
                </CarouselContent>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </Carousel> : <button
                type="button"
                onClick={() => setLightboxIndex(0)}
                className="relative aspect-square w-full overflow-hidden rounded-b-[28px] bg-card cursor-zoom-in lg:rounded-2xl"
                aria-label="Открыть фото"
              >
                <OptimizedImage src={product.image} alt={product.name} preset="detail" className="h-full w-full" loading="eager" fetchPriority="high" />
              </button>}

            <ProductImageLightbox
              images={allImages.length > 0 ? allImages : [product.image]}
              startIndex={lightboxIndex}
              alt={product.name}
              onClose={() => setLightboxIndex(null)}
            />

            {/* Actions */}
            <div className="absolute right-4 top-4 flex gap-2 z-10">
              <button onClick={toggleFavorite} aria-label={isFavorite ? "Убрать из избранного" : "В избранное"} className="rounded-full bg-card/80 p-2 backdrop-blur-sm transition-colors hover:bg-card">
                <Heart className={cn("h-5 w-5", isFavorite ? "fill-primary text-primary" : "text-muted-foreground")} />
              </button>
              <button onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              handleShare();
            }} aria-label="Поделиться" className="rounded-full bg-card/80 p-2 backdrop-blur-sm transition-colors hover:bg-card">
                <Share2 className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Info card */}
          <div className="relative -mt-7 rounded-t-[28px] bg-[#faf5ea] px-4 pt-10 lg:mt-0 lg:w-96 lg:flex-shrink-0 lg:rounded-2xl lg:px-0 lg:pt-0">
            {/* Floating price + add to cart pill */}
            {!isArchived && (
              <div className="absolute -top-6 left-1/2 z-20 flex -translate-x-1/2 items-center rounded-full bg-card shadow-lg lg:static lg:left-auto lg:top-auto lg:mb-4 lg:translate-x-0">
                <span className="flex h-12 items-center rounded-full bg-brand-deep px-5 text-base font-bold text-brand-deep-foreground">
                  {currentPrice.formatted}<BynSymbol />
                </span>
                {currentQuantity > 0 ? (
                  <div className="flex h-12 items-center gap-1 whitespace-nowrap pl-3 pr-5 text-sm font-bold text-foreground">
                    <button
                      onClick={handleDecrement}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary"
                      aria-label="Уменьшить количество"
                    >
                      −
                    </button>
                    <span className="min-w-[1.5rem] text-center">{currentQuantity}</span>
                    <button
                      onClick={handleIncrement}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary"
                      aria-label="Увеличить количество"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleAddToCart}
                    className="flex h-12 items-center gap-2 whitespace-nowrap pl-3 pr-5 text-sm font-bold text-foreground"
                  >
                    В корзину
                    <ShoppingCart className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}

            {/* Meta row: rating + availability */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              {displayRating !== null && displayReviewCount > 0 && <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-bold text-foreground">{displayRating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({displayReviewCount})</span>
                  <span className="text-muted-foreground">·</span>
                </span>}
              {(() => {
                if (pickupLabel) {
                  const isUnavailable = pickupLabel === "Нет в наличии";
                  const isFast = pickupLabel === "Сегодня" || pickupLabel === "Завтра";
                  return (
                    <span className={cn(isUnavailable ? "text-[#d41111]" : isFast ? "text-green-600" : "text-muted-foreground")}>
                      {isUnavailable ? pickupLabel : `Самовывоз: ${pickupLabel}`}
                    </span>
                  );
                }
                const totalMin = (product.prep_time_minutes || 0) + ((product as any).order_lead_time_hours || 0) * 60;
                const isInStock = totalMin === 0;
                return (
                  <span className={cn(isInStock ? "text-green-600" : "text-muted-foreground")}>
                    {isInStock ? "В наличии" : `Время приготовления: ${formatRelativeTime(totalMin).replace("~", "")}`}
                  </span>
                );
              })()}
            </div>

            {/* Title */}
            <h1 className="mt-1 text-2xl font-bold leading-tight text-foreground">{product.name}</h1>

            {/* Price details (unit + old price) */}
            <div className="mt-1 flex items-baseline gap-2 text-sm">
              <span className="text-muted-foreground">за {displayUnit}</span>
              {oldPriceFormatted && <span className="flex items-center gap-1.5">
                  <span className="text-muted-foreground line-through">
                    {oldPriceFormatted.formatted}<BynSymbol />
                  </span>
                  {effectiveDiscount > 0 && (
                    <span className="inline-flex items-center rounded-full bg-[#be5c41] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                      −{effectiveDiscount}%
                    </span>
                  )}
                </span>}
            </div>

            {/* Product Variants selector - only show if more than 1 variant */}
            {variants.length > 1 && <div className="mt-4 flex flex-wrap gap-2">
                {variants.map(variant => <button key={variant.id} onClick={() => setSelectedVariantId(variant.id)} className={cn("rounded-lg text-sm font-semibold transition-colors border-2 py-[4px] px-[12px]", selectedVariant?.id === variant.id ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-foreground border-border hover:bg-secondary/80 hover:border-primary/50")}>
                    {variant.label}
                  </button>)}
              </div>}

            {/* Custom fields */}
            {customFields.length > 0 && <div className="mt-4 space-y-3">
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
              <div className="mt-4 space-y-2">
                <span className="text-sm font-medium text-foreground">Добавки:</span>

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

            {/* Nutrition capsules */}
            {hasNutrition && (
              <div className="mt-5">
                <h2 className="text-base font-bold text-nutrition-label">КБЖУ на 100 г</h2>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {nutrition.map(n => (
                    <div key={n.label} className="flex flex-col items-center rounded-full bg-nutrition px-1 py-3">
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-nutrition-value text-lg font-bold text-nutrition-value-foreground">
                        {n.value ?? 0}
                      </span>
                      <span className="mt-1 text-sm font-bold text-foreground">{n.label}</span>
                      <span className="text-[10px] text-muted-foreground">{n.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            {isArchived ? <div className="mt-4 rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-center">
                <p className="font-medium text-destructive">Товар снят с продажи</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Этот товар больше недоступен для заказа
                </p>
              </div> : <Button variant="buy" size="lg" className="mt-4 w-full" onClick={handleBuyNow}>
                Купить сейчас
              </Button>}

            {/* Description */}
            {product.description && (
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            )}

            {/* Composition & shelf life */}
            {dbProduct?.composition && (
              <p className="mt-4 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Состав: </span>
                {dbProduct.composition}
              </p>
            )}
            {dbProduct?.shelf_life && (
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Срок хранения: </span>
                {dbProduct.shelf_life}
              </p>
            )}

            {/* Seller - compact */}
            <Link to={`/seller/${product.farmer_id}`} className="mt-4 block group">
              <div className="rounded-xl bg-card p-2 hover:bg-card/80 transition-colors cursor-pointer px-px mx-0 py-[8px]">
                <div className="flex items-center justify-between px-[10px]">
                  <div className="flex items-center gap-1.5">
                    {dbProduct?.farmers?.photo_url ? <img src={dbProduct.farmers.photo_url} alt={product.seller} className="h-9 w-9 rounded-full object-cover" /> : <span className="text-lg">🧑‍🌾</span>}
                    <span className="font-medium text-primary text-sm group-hover:underline">{product.seller}</span>
                    <ChevronRight className="h-4 w-4 text-primary" />
                  </div>
                  {farmerRating !== null && <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {farmerRating.toFixed(1)}
                    </div>}
                </div>
                {farmerCity && (
                  <div className="mt-2 px-[10px]">
                    <p className="text-sm text-foreground">📍 Доступен самовывоз: г.{farmerCity}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 ml-5">Точный адрес станет доступен после оформления заказа</p>
                  </div>
                )}
              </div>
            </Link>
          </div>
        </div>

        {/* Reviews section */}
        <section className="mt-8 px-4 lg:px-0">
            <ProductReviews productId={product.id} reviews={reviews} averageRating={displayRating || 0} totalReviews={displayReviewCount} onAddReview={handleAddReview} onDeleteReview={handleDeleteReview} />
          </section>
      </main>

      <BottomNavigation />
    </div>;
}

