import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { SellerBottomNav } from "@/components/seller/SellerBottomNav";
import { SellerLaunchChecklist } from "@/components/seller/SellerLaunchChecklist";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Package, ShoppingBag, Settings, Loader2, Users, CreditCard, ImageIcon, Truck } from "lucide-react";
import { usePendingOrdersCount } from "@/hooks/usePendingOrdersCount";
import { useSellerPlan } from "@/hooks/useSellerPlan";
import { useSellerClientsCount } from "@/hooks/useSellerClientsCount";
import { TrialBanner } from "@/components/seller/TrialBanner";

interface SellerFarmer {
  id: string;
  name: string;
  slug: string | null;
  pickup_enabled: boolean | null;
  delivery_enabled: boolean | null;
  address_details: string | null;
  pickup_slots: unknown;
}

export default function SellerDashboard() {
  const { user, role, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { sellerPendingCount } = usePendingOrdersCount();
  const { count: clientsCount } = useSellerClientsCount();
  const planState = useSellerPlan();
  const [farmer, setFarmer] = useState<SellerFarmer | null>(null);
  const [productsCount, setProductsCount] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    if (role !== "seller" && role !== "admin") { navigate("/"); return; }

    const fetchDashboard = async () => {
      const { data } = await supabase
        .from("farmers")
        .select("id, name, slug, pickup_enabled, delivery_enabled, address_details, pickup_slots")
        .eq("user_id", user.id)
        .maybeSingle();

      const seller = (data as SellerFarmer | null) ?? null;
      setFarmer(seller);

      if (seller) {
        const [{ count: products }, { data: items }] = await Promise.all([
          supabase
            .from("products")
            .select("id", { count: "exact", head: true })
            .eq("farmer_id", seller.id)
            .eq("is_deleted", false),
          supabase.from("order_items").select("order_id").eq("farmer_id", seller.id),
        ]);

        setProductsCount(products ?? 0);
        setOrdersCount(new Set((items ?? []).map((item) => (item as { order_id: string }).order_id)).size);
      }

      setIsLoading(false);
    };
    void fetchDashboard();
  }, [user, role, authLoading, navigate]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!farmer) {
    return (
      <div className="min-h-screen pb-20 md:pb-0 bg-[#faf5ea]">
        <Header />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-xl font-bold mb-2">Профиль продавца не найден</h1>
          <p className="text-muted-foreground mb-4">Создайте витрину — это займёт полторы минуты</p>
          <Button onClick={() => navigate("/seller-application")}>Создать витрину</Button>
        </main>
        <SellerBottomNav />
      </div>
    );
  }

  const hasDeliveryConfigured = Boolean(
    farmer.pickup_enabled ||
      farmer.delivery_enabled ||
      (farmer.address_details && farmer.address_details.trim().length > 0) ||
      (Array.isArray(farmer.pickup_slots) ? farmer.pickup_slots.length > 0 : Boolean(farmer.pickup_slots)),
  );

  return (
    <div className="min-h-screen pb-20 md:pb-0 bg-[#faf5ea]">
      <Header />
      <main className="container mx-auto px-4 py-6">
        {planState.isTrial && planState.trialDaysLeft !== null && planState.trialDaysLeft <= 2 && (
          <TrialBanner daysLeft={planState.trialDaysLeft} />
        )}

        <SellerLaunchChecklist
          farmerId={farmer.id}
          storeName={farmer.name}
          slug={farmer.slug}
          productsCount={productsCount}
          hasDeliveryConfigured={hasDeliveryConfigured}
          ordersCount={ordersCount}
        />

        <h1 className="text-2xl font-bold mb-4">{farmer.name}</h1>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link to="/seller/products" className="flex items-center gap-4 rounded-xl bg-card p-6 relative">
            <Package className="h-8 w-8 text-primary" />
            <div className="flex-1">
              <h3 className="font-bold">Мои товары</h3>
              <p className="text-sm text-muted-foreground">Управление товарами</p>
            </div>
            {productsCount > 0 && (
              <span className="bg-primary/10 text-primary text-sm font-bold px-2.5 py-1 rounded-full">
                {productsCount}
              </span>
            )}
          </Link>

          <Link to="/seller/orders" className="flex items-center gap-4 rounded-xl bg-card p-6 relative">
            <ShoppingBag className="h-8 w-8 text-primary" />
            <div className="flex-1">
              <h3 className="font-bold">Заказы</h3>
              <p className="text-sm text-muted-foreground">
                {ordersCount > 0 ? `Всего заказов: ${ordersCount}` : "Заказы с моими товарами"}
              </p>
            </div>
            {sellerPendingCount > 0 && (
              <span className="bg-destructive text-destructive-foreground text-sm font-bold px-2.5 py-1 rounded-full">
                {sellerPendingCount}
              </span>
            )}
          </Link>

          <Link to="/seller/clients" className="flex items-center gap-4 rounded-xl bg-card p-6 relative">
            <Users className="h-8 w-8 text-primary" />
            <div className="flex-1">
              <h3 className="flex items-center gap-2 font-bold">Клиенты</h3>
              <p className="text-sm text-muted-foreground">Покупатели и их статусы</p>
            </div>
            {clientsCount > 0 && (
              <span className="bg-primary text-primary-foreground text-sm font-bold px-2.5 py-1 rounded-full">
                {clientsCount}
              </span>
            )}
          </Link>

          <Link to="/seller/delivery" className="flex items-center gap-4 rounded-xl bg-card p-6 relative">
            <Truck className="h-8 w-8 text-primary" />
            <div className="flex-1">
              <h3 className="font-bold">Доставка и самовывоз</h3>
              <p className="text-sm text-muted-foreground">
                {hasDeliveryConfigured ? "Способы получения настроены" : "Пока не настроено"}
              </p>
            </div>
            {!hasDeliveryConfigured && <span className="h-2 w-2 rounded-full bg-destructive" />}
          </Link>

          <Link to="/seller/settings" className="flex items-center gap-4 rounded-xl bg-card p-6">
            <Settings className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-bold">Настройки</h3>
              <p className="text-sm text-muted-foreground">Профиль продавца</p>
            </div>
          </Link>

          <Link to="/seller/tariffs" className="flex items-center gap-4 rounded-xl bg-card p-6">
            <CreditCard className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-bold">Тарифы</h3>
              <p className="text-sm text-muted-foreground">
                {planState.isTrial ? `Бесплатный период · ${planState.trialDaysLeft} дн.` : "Один тариф · все возможности"}
              </p>
            </div>
          </Link>

          <Link to="/seller/page" className="flex items-center gap-4 rounded-xl bg-card p-6">
            <Package className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-bold">Моя страница</h3>
              <p className="text-sm text-muted-foreground">Обложка, посты, акции</p>
            </div>
          </Link>

          <Link to="/seller/story" className="flex items-center gap-4 rounded-xl bg-card p-6">
            <ImageIcon className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-bold">Создать изображение</h3>
              <p className="text-sm text-muted-foreground">Сторис с вашими товарами</p>
            </div>
          </Link>
        </div>
      </main>
      <SellerBottomNav />
    </div>
  );
}
