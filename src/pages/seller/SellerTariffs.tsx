import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { useSellerPlan, type SellerPlan } from "@/hooks/useSellerPlan";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BynSymbol } from "@/components/ui/byn-symbol";
import { formatPrice } from "@/lib/priceUtils";
import { ArrowLeft, Check, Loader2, Minus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const PLAN_LABEL: Record<SellerPlan, string> = {
  free: "Free",
  standard: "Standard",
  pro: "Pro",
};

type Cell = boolean | string;

const FEATURES: Array<{ label: string; free: Cell; standard: Cell; pro: Cell }> = [
  { label: "Онлайн заказы", free: true, standard: true, pro: true },
  { label: "Продажи", free: true, standard: true, pro: true },
  { label: "Страница бренда", free: true, standard: true, pro: true },
  { label: "Ваши товары\nна LOCUS", free: true, standard: true, pro: true },
  { label: "База клиентов", free: false, standard: true, pro: true },
  { label: "Комиссия\nс продажи", free: "10%", standard: "0%", pro: "0%" },
  { label: "Контакты\nна странице", free: false, standard: true, pro: true },
  { label: "Все контакты\nклиентов открыты", free: false, standard: true, pro: true },
  { label: "Можете сами\nделать доставку", free: false, standard: true, pro: true },
  { label: "Авто рассылка", free: false, standard: false, pro: true },
  { label: "Онлайн оплата", free: false, standard: false, pro: true },
];

/** Цены в копейках */
const PRICING: Record<"standard" | "pro", { 1: number; 6: number; discount: string }> = {
  standard: { 1: 2900, 6: 9000, discount: "−48%" },
  pro: { 1: 4900, 6: 15000, discount: "−49%" },
};

function CellValue({ value }: { value: Cell }) {
  if (value === true) return <Check className="mx-auto h-4 w-4 text-primary" />;
  if (value === false) return <Minus className="mx-auto h-4 w-4 text-muted-foreground" />;
  return <span className="whitespace-nowrap">{value}</span>;
}

function Money({ kopecks }: { kopecks: number }) {
  return (
    <>
      {formatPrice(kopecks).formatted}
      <BynSymbol />
    </>
  );
}

export default function SellerTariffs() {
  const { user, role, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const planState = useSellerPlan();
  const [dialogPlan, setDialogPlan] = useState<"standard" | "pro" | null>(null);
  const [period, setPeriod] = useState<1 | 6>(6);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStartingTrial, setIsStartingTrial] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    if (role !== "seller" && role !== "admin") { navigate("/"); return; }
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    if (!planState.farmerId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("subscription_requests")
        .select("id")
        .eq("farmer_id", planState.farmerId)
        .eq("status", "pending")
        .limit(1);
      if (!cancelled) setHasPendingRequest((data || []).length > 0);
    })();
    return () => { cancelled = true; };
  }, [planState.farmerId]);

  const startTrial = async () => {
    if (!planState.farmerId) return;
    setIsStartingTrial(true);
    const now = new Date();
    const ends = new Date(now.getTime() + 14 * 86_400_000);
    const { error } = await supabase
      .from("farmers")
      .update({
        plan: "standard",
        trial_started_at: now.toISOString(),
        trial_ends_at: ends.toISOString(),
      })
      .eq("id", planState.farmerId);
    setIsStartingTrial(false);
    if (error) {
      toast.error("Не удалось запустить пробный период");
      return;
    }
    toast.success("Пробный период Standard активирован на 14 дней");
    planState.refetch();
  };

  const submitRequest = async () => {
    if (!planState.farmerId || !dialogPlan) return;
    if (hasPendingRequest) {
      toast.info("Заявка уже отправлена");
      setDialogPlan(null);
      return;
    }
    setIsSubmitting(true);
    const amount = PRICING[dialogPlan][period];
    const { error } = await supabase.from("subscription_requests").insert({
      farmer_id: planState.farmerId,
      plan: dialogPlan,
      period_months: period,
      amount_kopecks: amount,
      status: "pending",
    });
    setIsSubmitting(false);
    if (error) {
      console.error("subscription request error", error);
      toast.error("Не удалось отправить заявку");
      return;
    }
    setHasPendingRequest(true);
    setDialogPlan(null);
    toast.success("Заявка принята, свяжемся для оплаты в течение дня");
  };

  if (authLoading || planState.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentLabel = planState.isTrial
    ? `Standard (пробный, осталось ${planState.trialDaysLeft} дн.)`
    : PLAN_LABEL[planState.plan];

  const showTrialOffer = planState.plan === "free" && !planState.trialUsed;

  return (
    <div className="min-h-screen pb-20 md:pb-0 bg-[#faf5ea]">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <Link to="/seller" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          Панель продавца
        </Link>

        <h1 className="text-2xl font-bold mb-3">Тарифы</h1>

        <span className="inline-flex rounded-full bg-card px-3 py-1.5 text-sm font-medium text-foreground">
          Ваш текущий тариф: {currentLabel}
        </span>

        {showTrialOffer && (
          <div className="mt-4 rounded-xl border border-primary/40 bg-primary/10 p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="flex-1">
                <h2 className="font-bold text-foreground">Попробуйте Standard бесплатно 14 дней</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Автоматически вернётесь на Free по окончании, если не подключите платно
                </p>
                <Button className="mt-3" onClick={startTrial} disabled={isStartingTrial}>
                  {isStartingTrial ? "Активируем…" : "Начать пробный период"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Таблица тарифов — одна на всех экранах */}
        <div className="mt-6 overflow-hidden rounded-xl bg-card">
          <table className="w-full table-fixed text-[11px] sm:text-sm">
            <colgroup>
              <col />
              <col className="w-[16%] sm:w-[15%]" />
              <col className="w-[22%] sm:w-[18%]" />
              <col className="w-[16%] sm:w-[15%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border">
                <th className="px-2 py-2.5 text-left font-semibold sm:px-3">Функция</th>
                <th className="px-1 py-2.5 text-center font-semibold sm:px-2">Free</th>
                <th className="bg-primary/10 px-1 py-2.5 text-center font-semibold leading-tight sm:px-2">
                  Standard
                  <span className="mt-0.5 block rounded-full bg-primary px-1 py-0.5 text-[9px] font-bold text-primary-foreground sm:inline sm:ml-2 sm:mt-0">
                    Рекомендуем
                  </span>
                </th>
                <th className="px-1 py-2.5 text-center font-semibold sm:px-2">Pro</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f) => (
                <tr key={f.label} className="border-b border-border/50 last:border-0">
                  <td className="whitespace-pre-line px-2 py-2 text-left leading-tight text-muted-foreground sm:px-3">
                    {f.label}
                  </td>
                  <td className="px-1 py-2 text-center sm:px-2"><CellValue value={f.free} /></td>
                  <td className="bg-primary/5 px-1 py-2 text-center sm:px-2"><CellValue value={f.standard} /></td>
                  <td className="px-1 py-2 text-center sm:px-2"><CellValue value={f.pro} /></td>
                </tr>
              ))}
              <tr>
                <td className="px-2 py-2.5 text-left font-semibold sm:px-3">Стоимость</td>
                <td className="px-1 py-2.5 text-center font-semibold sm:px-2">0</td>
                <td className="bg-primary/5 px-1 py-2.5 text-center font-semibold leading-tight sm:px-2">
                  <Money kopecks={PRICING.standard[1]} />
                  <span className="block sm:inline">/мес</span>
                </td>
                <td className="px-1 py-2.5 text-center font-semibold leading-tight sm:px-2">
                  <Money kopecks={PRICING.pro[1]} />
                  <span className="block sm:inline">/мес</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>


        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button onClick={() => { setDialogPlan("standard"); setPeriod(6); }}>
            Подключить Standard
          </Button>
          <Button variant="outline" onClick={() => { setDialogPlan("pro"); setPeriod(6); }}>
            Подключить Pro
          </Button>
        </div>

        {hasPendingRequest && (
          <p className="mt-3 text-sm text-muted-foreground">
            Заявка уже отправлена — свяжемся для оплаты в течение дня.
          </p>
        )}

        <p className="mt-6 text-xs text-muted-foreground">
          «Все контакты клиентов открыты» означает доступ к телефону клиента для связи по вопросам
          заказа. Это не даёт права на массовую маркетинговую рассылку.
        </p>
      </main>

      <Dialog open={!!dialogPlan} onOpenChange={(open) => !open && setDialogPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Подключить {dialogPlan ? PLAN_LABEL[dialogPlan] : ""}
            </DialogTitle>
          </DialogHeader>

          {dialogPlan && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setPeriod(6)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl p-4 text-left transition-colors ${
                  period === 6 ? "border-2 border-primary bg-primary/10" : "bg-muted"
                }`}
              >
                <div>
                  <p className="font-bold text-foreground">6 месяцев</p>
                  <p className="text-xs text-muted-foreground">
                    <Money kopecks={Math.round(PRICING[dialogPlan][6] / 6)} />/мес
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                    {PRICING[dialogPlan].discount}
                  </span>
                  <span className="font-bold">
                    <Money kopecks={PRICING[dialogPlan][6]} />
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPeriod(1)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm ${
                  period === 1 ? "border border-primary" : ""
                }`}
              >
                <span className="text-muted-foreground">1 месяц</span>
                <span>
                  <Money kopecks={PRICING[dialogPlan][1]} />
                </span>
              </button>
            </div>
          )}

          <DialogFooter>
            <Button onClick={submitRequest} disabled={isSubmitting || hasPendingRequest}>
              {isSubmitting ? "Отправляем…" : "Оформить заявку"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>
  );
}
