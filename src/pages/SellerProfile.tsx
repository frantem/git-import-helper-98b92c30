import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { PageHeader } from "@/components/PageHeader";
import { ProductCard } from "@/components/ProductCard";
import { Star, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { SEO } from "@/components/SEO";

interface Farmer {
  id: string;
  name: string;
  description: string | null;
  district: string;
  village: string | null;
  photo_url: string | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  discount?: number;
  image: string;
  category: string;
  rating: number | null;
  reviews: number;
  seller: string;
  description: string;
  inStock: boolean;
  deliveryDays: number;
  unit: string;
  isNew?: boolean;
  farmer_id?: string;
}

export default function SellerProfile() {
  const { id } = useParams();
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useScrollRestoration();

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      // Fetch farmer info
      const { data: farmerData, error: farmerError } = await supabase
        .from("farmers")
        .select("*")
        .eq("id", id)
        .single();

      if (farmerError) {
        console.error("Error fetching farmer:", farmerError);
        setIsLoading(false);
        return;
      }

      setFarmer(farmerData);

      // Fetch farmer's active products
      const { data: productsData } = await supabase
        .from("products")
        .select(`
          id,
          title,
          price,
          old_price,
          image_url,
          unit,
          is_new,
          farmer_id,
          category_id,
          categories(name, slug)
        `)
        .eq("farmer_id", id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (productsData) {
        // Get product IDs to fetch reviews
        const productIds = productsData.map(p => p.id);
        
        // Fetch reviews for all products
        const { data: reviewsData } = await supabase
          .from("reviews")
          .select("product_id, rating")
          .in("product_id", productIds);

        // Calculate ratings per product
        const productRatings: Record<string, { sum: number; count: number }> = {};
        reviewsData?.forEach(r => {
          if (!productRatings[r.product_id]) {
            productRatings[r.product_id] = { sum: 0, count: 0 };
          }
          productRatings[r.product_id].sum += r.rating;
          productRatings[r.product_id].count += 1;
        });

        // Calculate overall farmer rating
        if (reviewsData && reviewsData.length > 0) {
          const totalRating = reviewsData.reduce((sum, r) => sum + r.rating, 0);
          setAverageRating(totalRating / reviewsData.length);
        }

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
            rating: ratings ? ratings.sum / ratings.count : null,
            reviews: ratings?.count || 0,
            seller: farmerData.name,
            description: "",
            inStock: true,
            deliveryDays: 2,
            unit: p.unit,
            isNew: p.is_new || false,
            farmer_id: p.farmer_id,
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

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <SEO
        title={`Фермерское хозяйство ${farmer.name} на Locus`}
        description={farmer.description || `Фермерские продукты от ${farmer.name}. ${farmer.district}.`}
        image={farmer.photo_url || undefined}
      />
      <Header />

      <main className="container mx-auto px-3 py-4">
        <PageHeader title="Продавец" />

        {/* Seller profile header */}
        <div className="mb-6 rounded-2xl bg-card p-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {farmer.photo_url ? (
                <img
                  src={farmer.photo_url}
                  alt={farmer.name}
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center">
                  <span className="text-4xl">🧑‍🌾</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-foreground mb-1">{farmer.name}</h1>
              
              {/* Rating */}
              {averageRating !== null && (
                <div className="flex items-center gap-1 mb-2">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-medium text-foreground">{averageRating.toFixed(1)}</span>
                </div>
              )}
              
              {/* Location */}
              <p className="text-sm text-muted-foreground">
                📍 {farmer.district}{farmer.village ? `, ${farmer.village}` : ""}
              </p>
            </div>
          </div>

          {/* Description */}
          {farmer.description && (
            <p className="mt-4 text-sm text-muted-foreground">{farmer.description}</p>
          )}
        </div>

        {/* Products */}
        <div className="mb-4">
          <h2 className="text-lg font-bold text-foreground mb-3">
            Товары ({products.length})
          </h2>
          
          {products.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              У продавца пока нет товаров
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
