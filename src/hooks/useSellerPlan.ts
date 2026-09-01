import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type SellerPlan = "free" | "standard" | "pro";

export interface SellerPlanState {
  isLoading: boolean;
  farmerId: string | null;
  /** Тариф, записанный в базе */
  rawPlan: SellerPlan;
  /** Эффективный тариф с учётом истечения пробного периода */
  plan: SellerPlan;
  isTrial: boolean;
  trialUsed: boolean;
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
  canUseClients: boolean;
  canShowContacts: boolean;
  refetch: () => void;
}

function daysLeft(endsAt: string): number {
  const diff = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

export function useSellerPlan(): SellerPlanState {
  const { user, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [rawPlan, setRawPlan] = useState<SellerPlan>("free");
  const [trialStartedAt, setTrialStartedAt] = useState<string | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("farmers")
        .select("id, plan, trial_started_at, trial_ends_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setFarmerId(data?.id ?? null);
      setRawPlan(((data?.plan as SellerPlan) || "free"));
      setTrialStartedAt(data?.trial_started_at ?? null);
      setTrialEndsAt(data?.trial_ends_at ?? null);
      setIsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, authLoading, nonce]);

  const trialActive = !!trialEndsAt && new Date(trialEndsAt).getTime() > Date.now();
  const trialExpired = !!trialEndsAt && !trialActive;
  // Если тариф был выдан только пробным периодом и он истёк — считаем Free
  const plan: SellerPlan = trialExpired ? "free" : rawPlan;

  return {
    isLoading: authLoading || isLoading,
    farmerId,
    rawPlan,
    plan,
    isTrial: trialActive,
    trialUsed: !!trialStartedAt,
    trialEndsAt,
    trialDaysLeft: trialActive && trialEndsAt ? daysLeft(trialEndsAt) : null,
    canUseClients: plan !== "free",
    canShowContacts: plan !== "free",
    refetch: () => setNonce((n) => n + 1),
  };
}
