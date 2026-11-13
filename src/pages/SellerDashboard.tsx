import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { SellerBottomNav } from "@/components/seller/SellerBottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Package, ShoppingBag, Settings, Loader2, Users, CreditCard, ImageIcon, Truck } from "lucide-react";
import { usePendingOrdersCount } from "@/hooks/usePendingOrdersCount";
import { useSellerPlan } from "@/hooks/useSellerPlan";
import { useSellerClientsCount } from "@/hooks/useSellerClientsCount";
import { TrialBanner } from "@/components/seller/TrialBanner";


export default function SellerDashboard() {
  const { user, role, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { sellerPendingCount } = usePendingOrdersCount();
  const { count: clientsCount } = useSellerClientsCount();
  const planState = useSellerPlan();
  const [farmerName, setFarmerName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hiddenWelcome, setHiddenWelcome] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    if (role !== "seller" && role !== "admin") { navigate("/"); return; }

    const fetchFarmer = async () => {
      const { data } = await supabase
        .from("farmers")
        .select("name")
        .eq("user_id", user.id)
        .maybeSingle();
      setFarmerName(data?.name || null);
      setIsLoading(false);
    };
    fetchFarmer();
  }, [user, role, authLoading]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!farmerName) {
    return (
      <div className="min-h-screen pb-20 md:pb-0 bg-[#faf5ea]">
        <Header />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-xl font-bold mb-2">Профиль продавца не найден</h1>
          <p className="text-muted-foreground mb-4">Свяжитесь с администрацией для создания профиля</p>
          <Button onClick={() => navigate("/profile")}>Вернуться в профиль</Button>
        </main>
        <SellerBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0 bg-[#faf5ea]">
      <Header />
      <main className="container mx-auto px-4 py-6">
        {!hiddenWelcome && new URLSearchParams(window.location.search).get("welcome") === "1" && (
          <div className="mb-4 rounded-2xl border border-primary/30 bg-white p-4">
            <p className="text-[15px] font-bold text-foreground">Ваша витрина готова 🎉</p>
            <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
              Добавьте 3 первых товара и скопируйте ссылку витрины в Instagram — заказы начнут приходить с уже
              знакомой аудитории.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => navigate("/seller/products")} className="h-9 rounded-lg px-3 text-[13px]">
                Добавить товар
              </Button>
              <Button
                variant="outline"
                onClick={() => setHiddenWelcome(true)}
                className="h-9 rounded-lg px-3 text-[13px]"
              >
                Позже
              </Button>
            </div>
          </div>
        )}
        {planState.isTrial && planState.trialDaysLeft !== null && planState.trialDaysLeft <= 2 && (
          <TrialBanner daysLeft={planState.trialDaysLeft} />
        )}

        <h1 className="text-2xl font-bold mb-4">{farmerName}</h1>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link to="/seller/products" className="flex items-center gap-4 rounded-xl bg-card p-6">
            <Package className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-bold">Мои товары</h3>
              <p className="text-sm text-muted-foreground">Управление товарами</p>
            </div>
          </Link>

          <Link to="/seller/orders" className="flex items-center gap-4 rounded-xl bg-card p-6 relative">
            <ShoppingBag className="h-8 w-8 text-primary" />
            <div className="flex-1">
              <h3 className="font-bold">Заказы</h3>
              <p className="text-sm text-muted-foreground">Заказы с моими товарами</p>
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
              <h3 className="flex items-center gap-2 font-bold">
                Клиенты
              </h3>
              <p className="text-sm text-muted-foreground">
                Покупатели и их статусы
              </p>
            </div>
            {clientsCount > 0 && (
              <span className="bg-primary text-primary-foreground text-sm font-bold px-2.5 py-1 rounded-full">
                {clientsCount}
              </span>
            )}
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



          <Link to="/seller/delivery" className="flex items-center gap-4 rounded-xl bg-card p-6">
            <Truck className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-bold">Доставка и самовывоз</h3>
              <p className="text-sm text-muted-foreground">Способы получения заказа</p>
            </div>
          </Link>

          <Link to="/seller/settings" className="flex items-center gap-4 rounded-xl bg-card p-6">
            <Settings className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-bold">Настройки</h3>
              <p className="text-sm text-muted-foreground">Профиль продавца</p>
            </div>
          </Link>

        </div>
      </main>
      <SellerBottomNav />
    </div>
  );
}
