import type { PickupSlots } from "@/components/PickupSettingsSection";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/** Get current time in Europe/Minsk (UTC+3) */
function getMinskTime(): Date {
  const now = new Date();
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcTime + 3 * 60 * 60000);
}

/** Format time as HH:MM */
function fmtTime(hours: number, minutes: number): string {
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

/** Parse "HH:MM" to minutes since midnight */
function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Format date as DD.MM */
function fmtDate(d: Date): string {
  return `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}

/** Check if a date string (YYYY-MM-DD or ISO) matches a given date */
function dateMatches(dateStr: string, target: Date): boolean {
  const d = new Date(dateStr);
  return (
    d.getFullYear() === target.getFullYear() &&
    d.getMonth() === target.getMonth() &&
    d.getDate() === target.getDate()
  );
}

interface OrderCounts {
  [key: string]: number; // "farmerId:YYYY-MM-DD" -> count
}

export interface PickupTimeResult {
  text: string;
  isFallback: boolean;
}

export interface DeliveryTimeResult {
  text: string;           // "Сегодня 18:30–19:30"
  isTomorrow: boolean;
  earliestMinutes: number; // минуты от полуночи — для фильтрации слотов
}

/**
 * Calculate per-seller delivery readiness time (minutes from midnight).
 * Returns when the seller's order will be ready for pickup by courier.
 */
function getSellerReadyMinutes(
  prepTimeMinutes: number,
  pickupSlots: PickupSlots | null | undefined,
  busyDates: string[] | null | undefined,
  vacationDates: string[] | null | undefined,
  checkDate: Date,
  isToday: boolean,
  nowMinutes: number,
): number | null {
  if (!pickupSlots) {
    // No slots configured — assume seller is always available
    if (isToday) {
      return Math.max(nowMinutes, 0) + prepTimeMinutes;
    }
    return prepTimeMinutes; // from midnight
  }

  const dayKey = DAY_KEYS[checkDate.getDay()];
  const slot = pickupSlots[dayKey];
  if (!slot || !slot.active) return null; // seller doesn't work this day

  // Check busy/vacation
  const dateStr = `${checkDate.getFullYear()}-${(checkDate.getMonth() + 1).toString().padStart(2, "0")}-${checkDate.getDate().toString().padStart(2, "0")}`;
  if (busyDates?.some((d) => dateMatches(d, checkDate))) return null;
  if (vacationDates?.some((d) => dateMatches(d, checkDate))) return null;

  const slotStart = parseTime(slot.start);
  const slotEnd = parseTime(slot.end);

  if (isToday) {
    const cookStart = Math.max(nowMinutes, slotStart);
    const readyTime = cookStart + prepTimeMinutes;
    if (readyTime > slotEnd) return null; // can't fit today
    return readyTime;
  }

  // Future day: start cooking at slot opening
  return slotStart + prepTimeMinutes;
}

/**
 * Calculate delivery time for "Nearest Delivery" and "Pickup Point".
 *
 * @param maxPrepTimeMinutes - Max prep time among cart items
 * @param sellerSettings - Array of seller pickup configurations
 * @param adminSettings - Admin delivery configuration
 */
/** Parse working_hours string like "10:00–20:00" and return closing time in minutes */
export function parseWorkingHoursEnd(workingHours: string | null | undefined): number | null {
  if (!workingHours) return null;
  const match = workingHours.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
  if (!match) return null;
  return parseTime(match[2]);
}

export function calculateDeliveryTime(
  maxPrepTimeMinutes: number,
  sellerSettings: Array<{
    farmerId?: string;
    pickupSlots: PickupSlots | null;
    busyDates: string[] | null;
    vacationDates: string[] | null;
  }>,
  adminSettings: {
    cutoff_time_minutes: number;
    avg_delivery_time_minutes: number;
    delivery_start_hour: number;
    delivery_end_hour: number;
  },
  pickupPointEndMinutes?: number,
): DeliveryTimeResult {
  const { cutoff_time_minutes, avg_delivery_time_minutes, delivery_start_hour, delivery_end_hour } = adminSettings;
  const deliveryStartMin = delivery_start_hour * 60;
  const rawDeliveryEndMin = delivery_end_hour * 60;
  const deliveryEndMin = pickupPointEndMinutes
    ? Math.min(rawDeliveryEndMin, pickupPointEndMinutes)
    : rawDeliveryEndMin;

  // Try today and tomorrow (up to 7 days)
  for (let offset = 0; offset < 7; offset++) {
    const now = getMinskTime();
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() + offset);

    const isToday = offset === 0;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    // Cutoff check: if today and past cutoff, skip to tomorrow
    if (isToday && nowMinutes > cutoff_time_minutes) continue;

    // Find the latest readiness time among all sellers
    let latestReady = -1;
    let allSellersAvailable = true;

    if (sellerSettings.length === 0) {
      // Fallback: no seller data
      latestReady = isToday
        ? nowMinutes + maxPrepTimeMinutes
        : maxPrepTimeMinutes;
    } else {
      for (const seller of sellerSettings) {
        const ready = getSellerReadyMinutes(
          maxPrepTimeMinutes,
          seller.pickupSlots,
          seller.busyDates,
          seller.vacationDates,
          checkDate,
          isToday,
          nowMinutes,
        );
        if (ready === null) {
          allSellersAvailable = false;
          break;
        }
        latestReady = Math.max(latestReady, ready);
      }
    }

    if (!allSellersAvailable || latestReady < 0) continue;

    // Add courier delivery time
    let arrivalMin = latestReady + avg_delivery_time_minutes;

    // Adjust for delivery working hours
    if (arrivalMin < deliveryStartMin) {
      arrivalMin = deliveryStartMin + avg_delivery_time_minutes;
    }
    if (arrivalMin >= deliveryEndMin) continue; // too late, try next day

    // Round up to next 10 minutes for cleaner display
    arrivalMin = Math.ceil(arrivalMin / 10) * 10;

    const endMin = Math.min(arrivalMin + 60, deliveryEndMin);
    const arrH = Math.floor(arrivalMin / 60);
    const arrM = arrivalMin % 60;
    const endH = Math.floor(endMin / 60);
    const endM = endMin % 60;

    const prefix = isToday ? "Сегодня" : offset === 1 ? "Завтра" : fmtDate(checkDate);

    return {
      text: `${prefix} ${fmtTime(arrH, arrM)}–${fmtTime(endH, endM)}`,
      isTomorrow: offset > 0,
      earliestMinutes: arrivalMin,
    };
  }

  return { text: "Нет доступных дат", isTomorrow: true, earliestMinutes: 0 };
}

/**
 * Calculate delivery time per seller (for pickup point item list).
 */
export function calculateDeliveryTimePerSeller(
  prepTimeMinutes: number,
  pickupSlots: PickupSlots | null,
  busyDates: string[] | null,
  vacationDates: string[] | null,
  adminSettings: {
    avg_delivery_time_minutes: number;
    delivery_start_hour: number;
    delivery_end_hour: number;
    cutoff_time_minutes: number;
  },
  pickupPointEndMinutes?: number,
): DeliveryTimeResult {
  return calculateDeliveryTime(
    prepTimeMinutes,
    [{ pickupSlots, busyDates, vacationDates }],
    adminSettings,
    pickupPointEndMinutes,
  );
}

export function calculatePickupTime(
  prepTimeMinutes: number,
  pickupSlots: PickupSlots | null | undefined,
  maxOrdersPerDay: number,
  busyDates: string[] | null | undefined,
  vacationDates: string[] | null | undefined,
  orderCounts: OrderCounts,
  farmerId: string
): PickupTimeResult {
  // Fallback if no pickup_slots configured
  if (!pickupSlots) {
    const hours = Math.ceil(prepTimeMinutes / 60);
    return { text: `Через ${hours}ч.`, isFallback: true };
  }

  // Check if at least one day is active
  const hasActiveDay = Object.values(pickupSlots).some((s) => s.active);
  if (!hasActiveDay) {
    const hours = Math.ceil(prepTimeMinutes / 60);
    return { text: `Через ${hours}ч.`, isFallback: true };
  }

  const now = getMinskTime();

  // Try today + up to 14 days ahead
  for (let offset = 0; offset < 14; offset++) {
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() + offset);

    const dayKey = DAY_KEYS[checkDate.getDay()];
    const slot = pickupSlots[dayKey];

    // Skip if day not active
    if (!slot || !slot.active) continue;

    // Skip busy/vacation dates
    const dateStr = `${checkDate.getFullYear()}-${(checkDate.getMonth() + 1).toString().padStart(2, "0")}-${checkDate.getDate().toString().padStart(2, "0")}`;

    if (busyDates?.some((d) => dateMatches(d, checkDate))) continue;
    if (vacationDates?.some((d) => dateMatches(d, checkDate))) continue;

    // Check max orders per day
    const countKey = `${farmerId}:${dateStr}`;
    const currentCount = orderCounts[countKey] || 0;
    if (currentCount >= maxOrdersPerDay) continue;

    const slotStart = parseTime(slot.start);
    const slotEnd = parseTime(slot.end);

    if (offset === 0) {
      // Today: check if we can fit
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const cookStart = Math.max(currentMinutes, slotStart);
      const readyTime = cookStart + prepTimeMinutes;

      // Need at least 10 min before slot end
      if (readyTime <= slotEnd - 10 && cookStart < slotEnd) {
        const readyH = Math.floor(readyTime / 60);
        const readyM = readyTime % 60;
        const endH = Math.floor(slotEnd / 60);
        const endM = slotEnd % 60;
        return {
          text: `Сегодня ${fmtTime(readyH, readyM)}–${fmtTime(endH, endM)}`,
          isFallback: false,
        };
      }
      // Can't fit today, continue to next day
      continue;
    }

    // Future day: show full slot window
    const startH = Math.floor(slotStart / 60);
    const startM = slotStart % 60;
    const endH = Math.floor(slotEnd / 60);
    const endM = slotEnd % 60;
    const timeRange = `${fmtTime(startH, startM)}–${fmtTime(endH, endM)}`;

    if (offset === 1) {
      return { text: `Завтра ${timeRange}`, isFallback: false };
    }

    return { text: `${fmtDate(checkDate)} ${timeRange}`, isFallback: false };
  }

  return { text: "Нет доступных дат", isFallback: false };
}
