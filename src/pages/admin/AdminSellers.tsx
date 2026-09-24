import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Ban, CheckCircle, Store, FileText } from "lucide-react";
import type { SellerPlan } from "@/hooks/useSellerPlan";

interface Farmer {
  id: string;
  name: string;
  district: string;
  village: string | null;
  rating: number | null;
  is_blocked: boolean | null;
  user_id: string | null;
  plan: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
}

const PLAN_LABEL: Record<SellerPlan, string> = {
  free: "Free",
  standard: "Standard",
  pro: "Pro",
};

const PLAN_ORDER: SellerPlan[] = ["free", "standard", "pro"];

const PLAN_BADGE: Record<SellerPlan, string> = {
  free: "bg-muted text-muted-foreground",
  standard: "bg-primary/10 text-primary",
  pro: "bg-amber-100 text-amber-700",
};

/** Пробный период идёт прямо сейчас. */
function isTrialActive(farmer: Farmer): boolean {
  return !!farmer.trial_ends_at && new Date(farmer.trial_ends_at).getTime() > Date.now();
}

/** Тариф, который реально действует: истёкший пробный = Free. */
function effectivePlan(farmer: Farmer): SellerPlan {
  if (farmer.trial_ends_at && new Date(farmer.trial_ends_at).getTime() <= Date.now()) {
    return "free";
  }
  const plan = farmer.plan as SellerPlan | null;
  return plan && PLAN_ORDER.includes(plan) ? plan : "free";
}

export default function AdminSellers() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [planEdits, setPlanEdits] = useState<Record<string, SellerPlan>>({});
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || role !== "admin") {
      navigate("/");
      return;
    }
    fetchFarmers();
  }, [user, role]);

  const fetchFarmers = async () => {
    const { data, error } = await supabase
      .from("farmers")
      .select("*")
      .order("name");

    if (!error && data) {
      setFarmers(data as Farmer[]);
    }
    setIsLoading(false);
  };

  const toggleBlock = async (farmerId: string, currentlyBlocked: boolean | null) => {
    const { error } = await supabase
      .from("farmers")
      .update({ is_blocked: !currentlyBlocked })
      .eq("id", farmerId);

    if (error) {
      toast.error("Ошибка при обновлении статуса");
    } else {
      toast.success(currentlyBlocked ? "Продавец разблокирован" : "Продавец заблокирован");
      fetchFarmers();
    }
  };

  const handleSavePlan = async (farmerId: string) => {
    const next = planEdits[farmerId];
    if (!next) return;
    setSavingPlanId(farmerId);
    // Ручная смена тарифа завершает пробный период (trial_ends_at = null),
    // но trial_started_at сохраняется — отметка, что пробный уже использовался.
    const { error } = await supabase
      .from("farmers")
      .update({ plan: next, trial_ends_at: null })
      .eq("id", farmerId);
    setSavingPlanId(null);
    if (error) {
      toast.error("Не удалось сохранить тариф");
      return;
    }
    toast.success(`Тариф изменён на ${PLAN_LABEL[next]}`);
    setPlanEdits((prev) => {
      const n = { ...prev };
      delete n[farmerId];
      return n;
    });
    fetchFarmers();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Header />
        <main className="container mx-auto px-4 py-16 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />

      <main className="container mx-auto px-3 py-4">
        <div className="flex items-center gap-2 mb-4">
          <Link to="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-foreground">Продавцы</h1>
        </div>

        {/* Link to applications */}
        <Link
          to="/admin/applications"
          className="mb-4 flex items-center gap-3 rounded-xl bg-primary/10 p-4"
        >
          <FileText className="h-6 w-6 text-primary" />
          <div className="flex-1">
            <h3 className="font-medium text-foreground">Заявки на продавца</h3>
            <p className="text-xs text-muted-foreground">Рассмотрение новых заявок</p>
          </div>
          <ChevronRight className="h-5 w-5 text-primary" />
        </Link>

        {farmers.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            Нет зарегистрированных продавцов
          </div>
        ) : (
          <div className="space-y-2">
            {farmers.map((farmer) => {
              const currentPlan = effectivePlan(farmer);
              const selectedPlan = planEdits[farmer.id] ?? currentPlan;
              const planChanged = selectedPlan !== currentPlan;
              const savingThis = savingPlanId === farmer.id;

              return (
                <div key={farmer.id} className="rounded-xl bg-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Store className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground truncate">{farmer.name}</h3>
                        {farmer.is_blocked && (
                          <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                            Заблокирован
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {farmer.district}{farmer.village ? `, ${farmer.village}` : ""}
                      </p>
                      {farmer.rating && (
                        <p className="text-xs text-muted-foreground">
                          ⭐ {farmer.rating}
                        </p>
                      )}
                    </div>
                    <Button
                      variant={farmer.is_blocked ? "outline" : "destructive"}
                      size="sm"
                      onClick={() => toggleBlock(farmer.id, farmer.is_blocked)}
                    >
                      {farmer.is_blocked ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Разблокировать
                        </>
                      ) : (
                        <>
                          <Ban className="h-4 w-4 mr-1" />
                          Заблокировать
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Тариф */}
                  <div className="mt-3 space-y-2 border-t border-border pt-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">Тариф:</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_BADGE[currentPlan]}`}>
                        {PLAN_LABEL[currentPlan]}
                      </span>
                      {isTrialActive(farmer) && (
                        <span className="text-xs text-muted-foreground">
                          пробный до {new Date(farmer.trial_ends_at!).toLocaleDateString("ru-RU")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedPlan}
                        onValueChange={(v) =>
                          setPlanEdits((prev) => ({ ...prev, [farmer.id]: v as SellerPlan }))
                        }
                      >
                        <SelectTrigger className="h-9 w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PLAN_ORDER.map((p) => (
                            <SelectItem key={p} value={p}>
                              {PLAN_LABEL[p]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {planChanged && (
                        <Button size="sm" onClick={() => handleSavePlan(farmer.id)} disabled={savingThis}>
                          {savingThis ? "Сохранение…" : "Сохранить"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
