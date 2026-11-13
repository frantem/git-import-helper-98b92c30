import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SellerTopBar } from "@/components/seller/SellerTopBar";
import { SellerBottomNav } from "@/components/seller/SellerBottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useSellerPlan } from "@/hooks/useSellerPlan";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BynSymbol } from "@/components/ui/byn-symbol";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/priceUtils";
import { SELLER_SUBSCRIPTION, subscriptionAmount } from "@/lib/sellerSubscription";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

function Money({ kopecks }: { kopecks: number }) {
  return <span className="inline-flex items-baseline gap-1">{formatPrice(kopecks).formatted}<BynSymbol /></span>;
}

export default function SellerTariffs() {
  const { user, role, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const planState = useSellerPlan();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [period, setPeriod] = useState<1 | 6>(6);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [requestLoading, setRequestLoading] = useState(true);
  const [requestError, setRequestError] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    if (role !== "seller" && role !== "admin") navigate("/");
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    if (!planState.farmerId) return;
    let cancelled = false;
    Promise.resolve(supabase.from("subscription_requests").select("id")
      .eq("farmer_id", planState.farmerId).eq("status", "pending").limit(1))
      .then(({ data, error }) => {
        if (cancelled) return;
        setHasPendingRequest(Boolean(data?.length));
        setRequestError(Boolean(error));
        setRequestLoading(false);
      });
    return () => { cancelled = true; };
  }, [planState.farmerId]);

  const submitRequest = async () => {
    if (!planState.farmerId || hasPendingRequest || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("subscription_requests").insert({
        farmer_id: planState.farmerId,
        plan: "standard", // Existing storage value represents the single subscription.
        period_months: period,
        amount_kopecks: subscriptionAmount(period),
        status: "pending",
      });
      if (error) throw error;
      setHasPendingRequest(true);
      setDialogOpen(false);
      toast.success("Заявка принята, свяжемся для оплаты в течение дня");
    } catch {
      toast.error("Не удалось отправить заявку. Попробуйте ещё раз");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || planState.isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  if (!user || (role !== "seller" && role !== "admin")) return null;

  const status = planState.isTrial
    ? `Бесплатный период активен · осталось ${planState.trialDaysLeft} дн.`
    : planState.rawPlan !== "free" && !planState.trialUsed
      ? "Подписка подключена"
      : planState.trialUsed ? "Бесплатный период завершён" : "Первый месяц бесплатно";

  return (
    <div className="min-h-screen pb-20 md:pb-0 bg-background">
      <SellerTopBar />
      <main className="container mx-auto max-w-2xl px-4 py-6">
        <Link to="/seller" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />Панель продавца
        </Link>
        <h1 className="text-2xl font-bold mb-5">Тариф</h1>
        <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
          <p className="text-sm font-medium text-foreground">{status}</p>
          {planState.trialEndsAt && <p className="mt-1 text-xs text-muted-foreground">
            {planState.isTrial ? "Бесплатно до" : "Пробный период до"} {new Date(planState.trialEndsAt).toLocaleDateString("ru-RU", { timeZone: "Europe/Minsk" })}
          </p>}
          <h2 className="mt-5 text-xl font-bold">Все возможности Locus</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {["Личный сайт и приём заказов", "Контакты на вашей странице", "База ваших клиентов", "Уведомления в Telegram", "Создание сторис с товарами", "0% комиссии с заказов"].map((feature) => (
              <li key={feature} className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-primary" />{feature}</li>
            ))}
          </ul>
          <div className="mt-6 border-t border-border pt-5">
            <p className="font-semibold">Первые {SELLER_SUBSCRIPTION.trialDays} дней бесплатно</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Далее <Money kopecks={SELLER_SUBSCRIPTION.sixMonthsKopecks / 6} />/мес при оплате за 6 месяцев
              {" или "}<Money kopecks={SELLER_SUBSCRIPTION.monthlyKopecks} /> помесячно.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Без автосписаний и привязки карты на старте. Все возможности уже открыты.</p>
            <Button className="mt-5 w-full" onClick={() => setDialogOpen(true)}
              disabled={!planState.farmerId || requestLoading || requestError || hasPendingRequest}>
              {hasPendingRequest ? "Заявка на продление отправлена" : "Продлить доступ"}
            </Button>
            {requestError && <p role="alert" className="mt-2 text-sm text-destructive">Не удалось проверить заявки. Обновите страницу.</p>}
            {hasPendingRequest && <p className="mt-2 text-xs text-muted-foreground">Свяжемся с вами для оплаты в течение дня.</p>}
          </div>
        </section>
      </main>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Продлить доступ к Locus</DialogTitle></DialogHeader>
          <RadioGroup value={String(period)} onValueChange={(value) => setPeriod(value === "6" ? 6 : 1)} className="gap-3">
            <Label htmlFor="period-six" className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-4">
              <RadioGroupItem value="6" id="period-six" />
              <span className="flex-1">6 месяцев<span className="block mt-1 text-xs text-muted-foreground"><Money kopecks={SELLER_SUBSCRIPTION.sixMonthsKopecks / 6} />/мес</span></span>
              <Money kopecks={subscriptionAmount(6)} />
            </Label>
            <Label htmlFor="period-one" className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-4">
              <RadioGroupItem value="1" id="period-one" /><span className="flex-1">1 месяц</span><Money kopecks={subscriptionAmount(1)} />
            </Label>
          </RadioGroup>
          <p className="text-xs text-muted-foreground">Итого: <Money kopecks={subscriptionAmount(period)} />. Это заявка, деньги сейчас не списываются.</p>
          <DialogFooter><Button onClick={submitRequest} disabled={isSubmitting || hasPendingRequest}>
            {isSubmitting ? "Отправляем…" : "Отправить заявку"}
          </Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <SellerBottomNav />
    </div>
  );
}
