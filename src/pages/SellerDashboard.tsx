import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Package, ShoppingBag, Settings, Loader2, Users, Lock, CreditCard } from "lucide-react";
import { usePendingOrdersCount } from "@/hooks/usePendingOrdersCount";
import { useSellerPlan } from "@/hooks/useSellerPlan";
import { TrialBanner } from "@/components/seller/TrialBanner";

const PLAN_LABEL = { free: "Free", standard: "Standard", pro: "Pro" } as const;

export default function SellerDashboard() {
  const { user, role, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { sellerPendingCount } = usePendingOrdersCount();
  const planState = useSellerPlan();
  const [farmerName, setFarmerName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0 bg-[#faf5ea]">
      <Header />
      <main className="container mx-auto px-4 py-6">
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

          <Link to="/seller/clients" className="flex items-center gap-4 rounded-xl bg-card p-6">
            <Users className="h-8 w-8 text-primary" />
            <div className="flex-1">
              <h3 className="flex items-center gap-2 font-bold">
                Клиенты
                {!planState.canUseClients && <Lock className="h-4 w-4 text-muted-foreground" />}
              </h3>
              <p className="text-sm text-muted-foreground">
                {planState.canUseClients ? "Покупатели и их статусы" : "Доступно на Standard"}
              </p>
            </div>
          </Link>

          <Link to="/seller/tariffs" className="flex items-center gap-4 rounded-xl bg-card p-6">
            <CreditCard className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-bold">Тарифы</h3>
              <p className="text-sm text-muted-foreground">
                Текущий тариф: {planState.isTrial ? "Standard (пробный)" : PLAN_LABEL[planState.plan]}
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


          <Link to="/seller/settings" className="flex items-center gap-4 rounded-xl bg-card p-6">
            <Settings className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-bold">Настройки</h3>
              <p className="text-sm text-muted-foreground">Профиль и самовывоз</p>
            </div>
          </Link>

        </div>
      </main>
      <BottomNavigation />
    </div>
  );
}
