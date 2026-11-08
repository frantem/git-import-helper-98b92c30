export const SELLER_SUBSCRIPTION = {
  trialDays: 30,
  monthlyKopecks: 1490,
  sixMonthsKopecks: 5940,
  commissionPercent: 0,
} as const;

export function subscriptionAmount(period: 1 | 6): number {
  return period === 6 ? SELLER_SUBSCRIPTION.sixMonthsKopecks : SELLER_SUBSCRIPTION.monthlyKopecks;
}

// Subscription status is informational during the product trial rollout.
export function sellerFeatureAccess() {
  return { canUseClients: true, canShowContacts: true };
}