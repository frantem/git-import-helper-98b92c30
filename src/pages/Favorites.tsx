import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { PageHeader } from "@/components/PageHeader";
import { ProductCard } from "@/components/ProductCard";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { supabase } from "@/integrations/supabase/client";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Product } from "@/data/products";
import { computeLowestPriceIds } from "@/lib/lowestPriceUtils";
import { usePickupLabels } from "@/hooks/usePickupLabels";

interface DBProduct {
  id: string;
  title: string;
  price: number;
  old_price: number | null;
  image_url: string | null;
  unit: string;
  stock: number;
  is_new: boolean | null;
  is_featured: boolean | null;
  description: string | null;
  farmer_id: string;
  prep_time_minutes: number | null;
  order_lead_time_hours: number | null;
  category: {
    slug: string;
  } | null;
  farmer: {
    name: string;
    rating: number | null;
  } | null;
}

export default function Favorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { favoriteIds, toggleFavorite } = useFavorites();

  useEffect(() => {
    if (user) {
      fetchFavorites();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchFavorites = async () => {
    const { data, error } = await supabase
      .from("favorites")
      .select(`
        product_id,
        product:products!inner(
          id,
          title,
          price,
          old_price,
          image_url,
          unit,
          stock,
          is_new,
          is_featured,
          is_active,
          description,
          farmer_id,
          prep_time_minutes,
          order_lead_time_hours,
          category:categories(slug),
          farmer:farmers(name, rating)
        )
      `)
      .eq("user_id", user?.id)
      .eq("product.is_active", true);

    if (!error && data) {
      const products: Product[] = data
        .filter((f: any) => f.product)
        .map((f: any) => {
          const p = f.product as DBProduct;
          const discount = p.old_price ? Math.round((1 - p.price / p.old_price) * 100) : undefined;
          
          return {
            id: p.id,
            name: p.title,
            price: p.price,
            oldPrice: p.old_price || undefined,
            discount,
            image: p.image_url || "https://placehold.co/400x400",
            category: p.category?.slug || "",
            rating: p.farmer?.rating || 4.5,
            reviews: 0,
            seller: p.farmer?.name || "Фермер",
            description: p.description || "",
            inStock: p.stock > 0,
            deliveryDays: 2,
            unit: p.unit,
            isNew: p.is_new || false,
            farmer_id: p.farmer_id,
            prep_time_minutes: p.prep_time_minutes || 0,
            order_lead_time_hours: p.order_lead_time_hours || 0,
          } as Product;
        });
      
      setFavorites(products);
    }
    setIsLoading(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Header />
        <main className="container mx-auto px-4 py-16 text-center">
          <Heart className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">Войдите в аккаунт</h1>
          <p className="text-muted-foreground mb-4">
            Чтобы сохранять избранные товары, необходимо авторизоваться
          </p>
          <Link to="/auth">
            <Button>Войти</Button>
          </Link>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />

      <main className="container mx-auto px-3 py-4">
        <PageHeader title="Избранное" />

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : favorites.length === 0 ? (
          <div className="py-12 text-center">
            <Heart className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium text-foreground mb-2">Пока ничего нет</h2>
            <p className="text-muted-foreground mb-4">
              Нажимайте на сердечко на товарах, чтобы добавить в избранное
            </p>
            <Link to="/catalog">
              <Button>Перейти в каталог</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {(() => {
              const lpIds = computeLowestPriceIds(favorites);
              return favorites.map((product) => (
                <ProductCard key={product.id} product={product} isFavorite={favoriteIds.has(product.id)} onToggleFavorite={toggleFavorite} isLowestPrice={lpIds.has(product.id)} />
              ));
            })()}
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
