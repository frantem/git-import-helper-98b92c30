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

// Новая структура для отслеживания остатка готовки
interface CookingCarryover {
  remainingMinutes: number;
  startDate: Date;
}

/**
 * Распределить время готовки через несколько окон если нужно
 * Учитывает буфер 30 минут перед концом окна
 */
function getSellerReadyMinutesWithCarryover(
  prepTimeMinutes: number,
  pickupSlots: PickupSlots | null | undefined,
  busyDates: string[] | null | undefined,
  vacationDates: string[] | null | undefined,
  checkDate: Date,
  isToday: boolean,
  nowMinutes: number,
  carryover?: CookingCarryover | null,
): { readyTime: number | null; carryover: CookingCarryover | null } {
  if (!pickupSlots) {
    // Если нет расписания - готовим сразу
    if (isToday) {
      return {
        readyTime: Math.max(nowMinutes, 0) + prepTimeMinutes,
        carryover: null,
      };
    }
    return { readyTime: prepTimeMinutes, carryover: null };
  }

  // No buffer — full window is available for cooking
  let remainingTime = carryover?.remainingMinutes ?? prepTimeMinutes;

  const dayKey = DAY_KEYS[checkDate.getDay()];
  const slot = pickupSlots[dayKey];
  if (!slot || !slot.active) return { readyTime: null, carryover: { remainingMinutes: remainingTime, startDate: checkDate } };

  // Проверка busy/vacation
  if (busyDates?.some((d) => dateMatches(d, checkDate))) return { readyTime: null, carryover: { remainingMinutes: remainingTime, startDate: checkDate } };
  if (vacationDates?.some((d) => dateMatches(d, checkDate))) return { readyTime: null, carryover: { remainingMinutes: remainingTime, startDate: checkDate } };

  const slotStart = parseTime(slot.start);
  const slotEnd = parseTime(slot.end);

  if (isToday) {
    const cookStart = Math.max(nowMinutes, slotStart);
    const availableInSlot = slotEnd - cookStart;

    if (availableInSlot <= 0) {
      // Не влезает вообще в это окно
      return {
        readyTime: null,
        carryover: { remainingMinutes: remainingTime, startDate: checkDate },
      };
    }

    const timeUsedInWindow = Math.min(remainingTime, availableInSlot);
    remainingTime -= timeUsedInWindow;
    const readyTime = cookStart + timeUsedInWindow;

    if (remainingTime > 0) {
      // Готовка не завершена, несем остаток на следующий день
      return {
        readyTime: null,
        carryover: { remainingMinutes: remainingTime, startDate: checkDate },
      };
    }

    // Готовка завершена в этом окне
    return { readyTime, carryover: null };
  }

  // Будущий день
  const availableInSlot = slotEnd - slotStart;
  
  if (availableInSlot <= 0) {
    return {
      readyTime: null,
      carryover: { remainingMinutes: remainingTime, startDate: checkDate },
    };
  }

  const timeUsedInWindow = Math.min(remainingTime, availableInSlot);
  remainingTime -= timeUsedInWindow;
  const readyTime = slotStart + timeUsedInWindow;

  if (remainingTime > 0) {
    return {
      readyTime: null,
      carryover: { remainingMinutes: remainingTime, startDate: checkDate },
    };
  }

  return { readyTime, carryover: null };
}

/**
 * Calculate delivery time for "Nearest Delivery" and "Pickup Point".
 *
 * @param maxPrepTimeMinutes - Max prep time among cart items
 * @param sellerSettings - Array of seller pickup configurations
 * @param adminSettings - Admin delivery configuration
 */
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

  // Для каждого продавца отслеживаем остаток готовки
  const sellerCarryovers: (CookingCarryover | null)[] = sellerSettings.map(() => null);

  for (let offset = 0; offset < 7; offset++) {
    const now = getMinskTime();
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() + offset);

    const isToday = offset === 0;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    // Cutoff check
    if (isToday && nowMinutes > cutoff_time_minutes) continue;

    let latestReady = -1;
    let allSellersAvailable = true;

    if (sellerSettings.length === 0) {
      latestReady = isToday
        ? nowMinutes + maxPrepTimeMinutes
        : maxPrepTimeMinutes;
    } else {
      for (let i = 0; i < sellerSettings.length; i++) {
        const seller = sellerSettings[i];
        const { readyTime, carryover } = getSellerReadyMinutesWithCarryover(
          maxPrepTimeMinutes,
          seller.pickupSlots,
          seller.busyDates,
          seller.vacationDates,
          checkDate,
          isToday,
          nowMinutes,
          sellerCarryovers[i],
        );

        // Обновляем carryover для этого продавца
        sellerCarryovers[i] = carryover;

        if (readyTime === null) {
          allSellersAvailable = false;
          break;
        }
        latestReady = Math.max(latestReady, readyTime);
      }
    }

    if (!allSellersAvailable || latestReady < 0) continue;

    // Добавляем время доставки
    let arrivalMin = latestReady + avg_delivery_time_minutes;

    if (arrivalMin < deliveryStartMin) {
      arrivalMin = deliveryStartMin + avg_delivery_time_minutes;
    }
    if (arrivalMin >= deliveryEndMin) continue;

    arrivalMin = Math.ceil(arrivalMin / 10) * 10;

    const endMin = Math.min(arrivalMin + 60, deliveryEndMin);
    const arrH = Math.floor(arrivalMin / 60);
    const arrM = arrivalMin % 60;
    const endH = Math.floor(endMin / 60);
    const endM = endMin % 60;

    const prefix = isToday ? "Сегодня" : offset === 1 ? "Завтра" : fmtDate(checkDate);

    return {
      text: `${prefix} ${fmtTime(arrH, arrM)}\u2013${fmtTime(endH, endM)}`,
      isTomorrow: offset > 0,
      earliestMinutes: arrivalMin,
    };
  }

  return { text: "Нет доступных дат", isTomorrow: true, earliestMinutes: 0 };
}

/** Parse working_hours string like "10:00–20:00" and return closing time in minutes */
export function parseWorkingHoursEnd(workingHours: string | null | undefined): number | null {
  if (!workingHours) return null;
  const match = workingHours.match(/(\d{1,2}:\d{2})\s*[-\u2013]\s*(\d{1,2}:\d{2})/);
  if (!match) return null;
  return parseTime(match[2]);
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
  let carryover: CookingCarryover | null = null;

  // Try today + up to 14 days ahead with carryover
  for (let offset = 0; offset < 14; offset++) {
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() + offset);

    const isToday = offset === 0;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    // Skip busy/vacation/inactive days but DON'T reset carryover — just skip
    const dayKey = DAY_KEYS[checkDate.getDay()];
    const slot = pickupSlots[dayKey];
    if (!slot || !slot.active) continue;

    if (busyDates?.some((d) => dateMatches(d, checkDate))) continue;
    if (vacationDates?.some((d) => dateMatches(d, checkDate))) continue;

    // Check max orders per day
    const dateStr = `${checkDate.getFullYear()}-${(checkDate.getMonth() + 1).toString().padStart(2, "0")}-${checkDate.getDate().toString().padStart(2, "0")}`;
    const countKey = `${farmerId}:${dateStr}`;
    const currentCount = orderCounts[countKey] || 0;
    if (currentCount >= maxOrdersPerDay) continue;

    const result = getSellerReadyMinutesWithCarryover(
      prepTimeMinutes,
      pickupSlots,
      busyDates,
      vacationDates,
      checkDate,
      isToday,
      nowMinutes,
      carryover,
    );

    carryover = result.carryover;

    if (result.readyTime === null) continue;

    // Ready! Show readyTime\u2013slotEnd
    const slotEnd = parseTime(slot.end);
    const readyH = Math.floor(result.readyTime / 60);
    const readyM = result.readyTime % 60;
    const endH = Math.floor(slotEnd / 60);
    const endM = slotEnd % 60;
    const timeRange = `${fmtTime(readyH, readyM)}\u2013${fmtTime(endH, endM)}`;

    if (isToday) {
      return { text: `Сегодня ${timeRange}`, isFallback: false };
    }
    if (offset === 1) {
      return { text: `Завтра ${timeRange}`, isFallback: false };
    }
    return { text: `${fmtDate(checkDate)} ${timeRange}`, isFallback: false };
  }

  return { text: "Нет доступных дат", isFallback: false };
}

/**
 * Calculate the earliest date+readyTime when a seller's items will be ready for pickup.
 * Used by Checkout to determine which calendar dates to enable and which time slots to show.
 */
export interface PickupReadyDateResult {
  readyDate: Date;
  readyTimeMinutes: number; // minutes since midnight on readyDate
  dayOffset: number;
}

export function calculatePickupReadyDate(
  prepTimeMinutes: number,
  pickupSlots: PickupSlots | null | undefined,
  busyDates: string[] | null | undefined,
  vacationDates: string[] | null | undefined,
): PickupReadyDateResult | null {
  if (!pickupSlots) return null;

  const now = getMinskTime();
  let carryover: CookingCarryover | null = null;

  for (let offset = 0; offset < 14; offset++) {
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() + offset);

    const isToday = offset === 0;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const dayKey = DAY_KEYS[checkDate.getDay()];
    const slot = pickupSlots[dayKey];
    if (!slot || !slot.active) continue;
    if (busyDates?.some((d) => dateMatches(d, checkDate))) continue;
    if (vacationDates?.some((d) => dateMatches(d, checkDate))) continue;

    const result = getSellerReadyMinutesWithCarryover(
      prepTimeMinutes,
      pickupSlots,
      busyDates,
      vacationDates,
      checkDate,
      isToday,
      nowMinutes,
      carryover,
    );

    carryover = result.carryover;

    if (result.readyTime !== null) {
      return {
        readyDate: checkDate,
        readyTimeMinutes: result.readyTime,
        dayOffset: offset,
      };
    }
  }

  return null;
}
