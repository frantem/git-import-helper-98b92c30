import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SellerBottomNav } from "@/components/seller/SellerBottomNav";
import { SellerTopBar } from "@/components/seller/SellerTopBar";
import { SellerSetupCards } from "@/components/seller/SellerSetupCards";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { usePendingOrdersCount } from "@/hooks/usePendingOrdersCount";
import { useSellerPlan } from "@/hooks/useSellerPlan";
import { useSellerClientsCount } from "@/hooks/useSellerClientsCount";
import { TrialBanner } from "@/components/seller/TrialBanner";

interface SellerFarmer {
  id: string;
  name: string;
  slug: string | null;
  store_type: string | null;
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
        .select("id, name, slug, store_type, pickup_enabled, delivery_enabled, address_details, pickup_slots")
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
      <div className="flex min-h-screen items-center justify-center bg-[#FCFBF9]">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!farmer) {
    return (
      <div className="min-h-screen bg-[#FCFBF9] pb-20">
        <SellerTopBar />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="mb-2 text-xl font-bold">Профиль продавца не найден</h1>
          <p className="mb-4 text-muted-foreground">Создайте витрину — это займёт полторы минуты</p>
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
    <div className="min-h-screen bg-[#FCFBF9] pb-24 md:pb-10">
      <SellerTopBar name={farmer.name} slug={farmer.slug} />
      <main className="mx-auto max-w-3xl px-4 pb-6 pt-5">
        {planState.isTrial && planState.trialDaysLeft !== null && planState.trialDaysLeft <= 2 && (
          <TrialBanner daysLeft={planState.trialDaysLeft} />
        )}

        <h1 className="text-[27px] font-bold leading-[1.15] tracking-[-0.01em] text-[#1A1A1A] md:text-[32px]">
          {productsCount === 0 && ordersCount === 0 ? (
            <>
              Добро пожаловать в Locus.
              <br />
              Давайте настроим витрину{" "}
              <span className="underline decoration-[#D8D4CB] decoration-[3px] underline-offset-4">
                {farmer.name}
              </span>
            </>
          ) : (
            farmer.name
          )}
        </h1>

        <div className="mt-5">
          <SellerSetupCards
            farmerId={farmer.id}
            slug={farmer.slug}
            productsCount={productsCount}
            hasDeliveryConfigured={hasDeliveryConfigured}
            storeType={farmer.store_type}
          />
        </div>

        {(ordersCount > 0 || productsCount > 0 || clientsCount > 0) && (
          <section className="rounded-2xl border border-[#EAE7E0] bg-white px-4 py-3.5">
            <p className="text-[12px] uppercase tracking-[0.08em] text-[#8A8478]">Сейчас в магазине</p>
            <p className="mt-1 text-[14px] font-semibold text-[#1A1A1A]">
              Заказов: {ordersCount}
              {sellerPendingCount > 0 && (
                <span className="ml-1.5 rounded-full bg-[#FDECEA] px-1.5 py-0.5 text-[11px] font-bold text-[#C0392B]">
                  {sellerPendingCount} новых
                </span>
              )}
              <span className="text-[#C9C4B8]"> · </span>
              Товаров: {productsCount}
              <span className="text-[#C9C4B8]"> · </span>
              Клиентов: {clientsCount}
            </p>
          </section>
        )}
      </main>
      <SellerBottomNav />
    </div>
  );
}
