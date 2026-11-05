import type { PickupSlots } from "@/components/PickupSettingsSection";

export interface BuyerDetails {
  name: string;
  phone: string;
  address: string;
}

export function normalizeCheckoutPhone(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("375")) digits = digits.slice(3);
  else if (digits.startsWith("80")) digits = digits.slice(2);
  return digits.slice(0, 9);
}

export function buyerDetailsKey(userId?: string): string {
  return `locus-checkout-details:${userId || "guest"}`;
}

export function readBuyerDetails(userId?: string): BuyerDetails {
  try {
    const stored = JSON.parse(localStorage.getItem(buyerDetailsKey(userId)) || "{}");
    return {
      name: typeof stored.name === "string" ? stored.name : "",
      phone: typeof stored.phone === "string" ? normalizeCheckoutPhone(stored.phone) : "",
      address: typeof stored.address === "string" ? stored.address : "",
    };
  } catch {
    return { name: "", phone: "", address: "" };
  }
}

export function mergeBuyerDetails(saved: BuyerDetails, profile: {
  full_name: string | null; phone: string | null; delivery_address: string | null;
} | null): BuyerDetails {
  return {
    name: saved.name || profile?.full_name || "",
    phone: saved.phone || normalizeCheckoutPhone(profile?.phone || ""),
    address: saved.address || profile?.delivery_address || "",
  };
}

export function getReceivingOptions(seller: {
  delivery_enabled: boolean | null; pickup_enabled: boolean | null;
} | null): ("courier" | "self")[] {
  if (!seller) return [];
  return [
    ...(seller.delivery_enabled === true ? ["courier" as const] : []),
    ...(seller.pickup_enabled === true ? ["self" as const] : []),
  ];
}

export function formatPickupSchedule(slots: PickupSlots | null): string[] {
  if (!slots) return [];
  const days = [["mon", "Пн"], ["tue", "Вт"], ["wed", "Ср"], ["thu", "Чт"], ["fri", "Пт"], ["sat", "Сб"], ["sun", "Вс"]];
  const groups = new Map<string, string[]>();
  for (const [key, label] of days) {
    const slot = slots[key];
    if (!slot?.active || !slot.start || !slot.end) continue;
    const time = `${slot.start}–${slot.end}`;
    groups.set(time, [...(groups.get(time) || []), label]);
  }
  return [...groups].map(([time, labels]) => `${labels.join(", ")}: ${time}`);
}