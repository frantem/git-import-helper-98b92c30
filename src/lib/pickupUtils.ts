import type { PickupSlots } from "@/components/PickupSettingsSection";

// ============================================================================
// КОНСТАНТЫ
// ============================================================================

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/** Минимальная длина окна самовывоза в минутах */
export const MIN_PICKUP_WINDOW_MINUTES = 30;

/** Шаг сетки слотов в минутах */
export const SLOT_STEP_MINUTES = 30;

/** Длина одного предлагаемого слота доставки/самовывоза в минутах */
export const DEFAULT_SLOT_LENGTH_MINUTES = 60;

/** Сколько дней вперёд просматриваем при поиске доступных дат */
const SEARCH_HORIZON_DAYS = 30;

// ============================================================================
// ВРЕМЯ И ФОРМАТ
// ============================================================================

/**
 * Текущее время в Europe/Minsk (UTC+3) как «локальный» Date,
 * у которого getHours/getDate соответствуют минскому календарю.
 */
export function getMinskTime(): Date {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + 3 * 60 * 60000);
}

/** YYYY-MM-DD дата без учёта времени */
function toYmd(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

/** Минуты от полуночи в HH:MM. Корректно обрабатывает 24:00 как 24:00 (используется только для конца окна). */
function fmtMinutes(totalMinutes: number): string {
  const safe = Math.max(0, Math.min(24 * 60, Math.round(totalMinutes)));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/** Парсинг "HH:MM" в минуты. Невалидное → null. */
function parseTime(t: string | null | undefined): number | null {
  if (!t) return null;
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (isNaN(h) || isNaN(mm) || h < 0 || h > 24 || mm < 0 || mm > 59) return null;
  return h * 60 + mm;
}

function fmtDate(d: Date): string {
  return `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}

/** Дата (только Y/M/D) из строки YYYY-MM-DD без сдвигов часового пояса. */
function ymdToDate(s: string): Date | null {
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return null;
  return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Округление вверх до ближайшего шага */
function ceilToStep(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}

/** Безопасное время приготовления: 0 — валидно. */
export function safePrepTime(value: number | null | undefined, fallback = 0): number {
  if (value === null || value === undefined || Number.isNaN(value)) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

/**
 * Форматирует общее время ожидания (минуты) в краткую человекочитаемую строку:
 *   < 60 мин → ~Nмин.
 *   < 24 ч  → ~Nч.
 *   ≥ 24 ч  → ~Nдн.
 */
export function formatRelativeTime(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  if (m < 60) return `~${m}мин.`;
  const hours = Math.round(m / 60);
  if (hours < 24) return `~${hours}ч.`;
  const days = Math.round(hours / 24);
  return `~${days}дн.`;
}

function dayPrefix(checkDate: Date, todayMinsk: Date): string {
  if (sameDay(checkDate, todayMinsk)) return "Сегодня";
  const tomorrow = new Date(todayMinsk);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (sameDay(checkDate, tomorrow)) return "Завтра";
  return fmtDate(checkDate);
}

// ============================================================================
// ТИПЫ
// ============================================================================

export interface PickupTimeResult {
  text: string;
  isFallback: boolean;
}

export interface DeliveryTimeResult {
  text: string;
  isTomorrow: boolean;
  earliestMinutes: number;
}

export interface PickupReadyDateResult {
  /** Дата, в которую заказ полностью готов (Y/M/D Минск) */
  readyDate: Date;
  /** Минута дня, в которую заказ становится готов */
  readyTimeMinutes: number;
  /** Сколько дней вперёд от сегодня (для UI) */
  dayOffset: number;
}

interface SellerSchedule {
  pickupSlots: PickupSlots | null;
  busyDates: string[] | null;
  vacationDates: string[] | null;
  /** Минимальный срок приёма заказа до начала окна выдачи (часы). По умолчанию 0. */
  orderLeadTimeHours?: number;
}

interface AdminDeliverySettings {
  cutoff_time_minutes: number;
  avg_delivery_time_minutes: number;
  delivery_start_hour: number;
  delivery_end_hour: number;
}

interface OrderCounts {
  [key: string]: number;
}

// ============================================================================
// ПРОВЕРКА ДОСТУПНОСТИ ДНЯ ПРОДАВЦА
// ============================================================================

function dateInList(list: string[] | null, target: Date): boolean {
  if (!list || list.length === 0) return false;
  const targetYmd = toYmd(target);
  for (const s of list) {
    const m = String(s).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!m) continue;
    const norm = `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    if (norm === targetYmd) return true;
  }
  return false;
}

function isSellerDayAvailable(checkDate: Date, schedule: SellerSchedule): boolean {
  const slots = schedule.pickupSlots;
  if (!slots) return false;
  const dayKey = DAY_KEYS[checkDate.getDay()];
  const slot = slots[dayKey];
  if (!slot || !slot.active) return false;
  if (dateInList(schedule.busyDates, checkDate)) return false;
  if (dateInList(schedule.vacationDates, checkDate)) return false;
  return true;
}

function getSellerSlotForDate(
  checkDate: Date,
  schedule: SellerSchedule,
  nowMinsk?: Date,
): { start: number; end: number } | null {
  if (!isSellerDayAvailable(checkDate, schedule)) return null;
  const dayKey = DAY_KEYS[checkDate.getDay()];
  const slot = schedule.pickupSlots![dayKey]!;
  const start = parseTime(slot.start);
  const end = parseTime(slot.end);
  if (start === null || end === null || end <= start) return null;

  // Минимальный срок приёма заказа до начала окна выдачи
  const leadHours = schedule.orderLeadTimeHours ?? 0;
  if (leadHours > 0) {
    const now = nowMinsk ?? getMinskTime();
    const windowStart = new Date(
      checkDate.getFullYear(),
      checkDate.getMonth(),
      checkDate.getDate(),
      0, 0, 0, 0,
    );
    windowStart.setMinutes(windowStart.getMinutes() + start);
    const diffMinutes = (windowStart.getTime() - now.getTime()) / 60000;
    if (diffMinutes < leadHours * 60) return null;
  }

  return { start, end };
}

// ============================================================================
// ЯДРО: РАСЧЁТ ГОТОВНОСТИ ОДНОГО ПРОДАВЦА
// ============================================================================

/**
 * Найти первую дату+минуту, когда заказ продавца будет ПОЛНОСТЬЮ готов.
 * Готовка распределяется по последовательным рабочим окнам без буферов и без сброса прогресса.
 *
 * @param requireMinPickupWindow если true — требуется минимум MIN_PICKUP_WINDOW_MINUTES
 *   между готовностью и закрытием окна выдачи (для самовывоза). Если в день готовности этого
 *   запаса нет — переходим к следующему рабочему окну (готовка уже завершена, ищем где выдать).
 */
export function findEarliestReady(
  prepTimeMinutes: number,
  schedule: SellerSchedule,
  options: {
    requireMinPickupWindow: boolean;
    nowMinsk?: Date;
  },
): PickupReadyDateResult | null {
  const prep = safePrepTime(prepTimeMinutes);
  const now = options.nowMinsk ?? getMinskTime();
  const minRequired = options.requireMinPickupWindow ? MIN_PICKUP_WINDOW_MINUTES : 0;

  // Если у продавца нет графика — fallback: готов сразу через prep минут
  if (!schedule.pickupSlots) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return {
      readyDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      readyTimeMinutes: Math.min(24 * 60, nowMinutes + prep),
      dayOffset: 0,
    };
  }

  let remaining = prep;
  /** Дата и время фактической готовности (когда она наступит) */
  let cookedReadyDate: Date | null = null;
  let cookedReadyMinutes: number | null = null;

  for (let offset = 0; offset < SEARCH_HORIZON_DAYS; offset++) {
    const checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    checkDate.setDate(checkDate.getDate() + offset);

    const window = getSellerSlotForDate(checkDate, schedule, now);
    if (!window) continue;

    const isToday = offset === 0;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    // Если готовка ещё не завершена — продолжаем готовить в этом окне
    if (cookedReadyDate === null) {
      const cookStart = isToday ? Math.max(nowMinutes, window.start) : window.start;
      const available = window.end - cookStart;
      if (available <= 0) continue;

      if (remaining <= available) {
        // Готовка завершена в этом окне
        const ready = cookStart + remaining;
        cookedReadyDate = checkDate;
        cookedReadyMinutes = ready;
        remaining = 0;

        // Проверка минимального окна выдачи в этот же день
        if (window.end - ready >= minRequired) {
          return {
            readyDate: checkDate,
            readyTimeMinutes: ready,
            dayOffset: offset,
          };
        }
        // Иначе ищем следующее доступное окно для выдачи
        continue;
      } else {
        remaining -= available;
        continue;
      }
    }

    // Готовка уже завершена — ищем первое окно с минимальным запасом
    if (window.end - window.start >= minRequired) {
      // Можем выдать со старта этого окна
      const giveOutStart = isToday ? Math.max(nowMinutes, window.start) : window.start;
      if (window.end - giveOutStart >= minRequired) {
        return {
          readyDate: checkDate,
          readyTimeMinutes: giveOutStart,
          dayOffset: offset,
        };
      }
    }
  }

  return null;
}

// ============================================================================
// САМОВЫВОЗ
// ============================================================================

export function getPickupTimeSlotsForDate(
  prepTimeMinutes: number,
  schedule: SellerSchedule,
  date: Date,
  nowMinsk?: Date,
): string[] {
  const now = nowMinsk ?? getMinskTime();
  const window = getSellerSlotForDate(date, schedule, now);
  if (!window) return [];

  const ready = findEarliestReady(prepTimeMinutes, schedule, {
    requireMinPickupWindow: true,
    nowMinsk: now,
  });
  if (!ready) return [];

  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const readyDateOnly = new Date(
    ready.readyDate.getFullYear(),
    ready.readyDate.getMonth(),
    ready.readyDate.getDate(),
  ).getTime();
  if (dateOnly < readyDateOnly) return [];

  // Минимальный старт слота
  let earliest = window.start;
  if (dateOnly === readyDateOnly) {
    earliest = Math.max(window.start, ceilToStep(ready.readyTimeMinutes, SLOT_STEP_MINUTES));
  }

  // Если выбранная дата = сегодня, не предлагать прошедшее время
  if (sameDay(date, now)) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    earliest = Math.max(earliest, ceilToStep(nowMinutes, SLOT_STEP_MINUTES));
  }

  const slots: string[] = [];
  for (let start = earliest; start + MIN_PICKUP_WINDOW_MINUTES <= window.end; start += SLOT_STEP_MINUTES) {
    const end = Math.min(start + DEFAULT_SLOT_LENGTH_MINUTES, window.end);
    if (end - start < MIN_PICKUP_WINDOW_MINUTES) break;
    slots.push(`${fmtMinutes(start)}\u2013${fmtMinutes(end)}`);
  }
  return slots;
}

export function isPickupDateAvailable(
  prepTimeMinutes: number,
  schedule: SellerSchedule,
  date: Date,
  nowMinsk?: Date,
): boolean {
  const now = nowMinsk ?? getMinskTime();
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const targetOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  if (targetOnly < todayOnly) return false;
  return getPickupTimeSlotsForDate(prepTimeMinutes, schedule, date, now).length > 0;
}

/**
 * Краткое описание ближайшего самовывоза: "Сегодня 10:30–17:00" и т.д.
 * Учитывает максимум заказов в день.
 */
export function calculatePickupTime(
  prepTimeMinutes: number,
  pickupSlots: PickupSlots | null | undefined,
  maxOrdersPerDay: number,
  busyDates: string[] | null | undefined,
  vacationDates: string[] | null | undefined,
  orderCounts: OrderCounts,
  farmerId: string,
  orderLeadTimeHours?: number,
): PickupTimeResult {
  const prep = safePrepTime(prepTimeMinutes);
  const lead = Math.max(0, Math.floor(orderLeadTimeHours ?? 0));

  if (!pickupSlots) {
    const totalMin = prep + lead * 60;
    return { text: totalMin === 0 ? "В наличии" : formatRelativeTime(totalMin), isFallback: true };
  }

  const hasActiveDay = Object.values(pickupSlots).some((s) => s.active);
  if (!hasActiveDay) {
    const totalMin = prep + lead * 60;
    return { text: totalMin === 0 ? "В наличии" : formatRelativeTime(totalMin), isFallback: true };
  }

  const schedule: SellerSchedule = {
    pickupSlots,
    busyDates: busyDates ?? null,
    vacationDates: vacationDates ?? null,
    orderLeadTimeHours: lead,
  };

  const now = getMinskTime();
  let remaining = prep;
  let cooked = false;

  for (let offset = 0; offset < SEARCH_HORIZON_DAYS; offset++) {
    const checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    checkDate.setDate(checkDate.getDate() + offset);

    const window = getSellerSlotForDate(checkDate, schedule, now);
    if (!window) continue;

    // Проверка лимита заказов на дату
    const dateStr = toYmd(checkDate);
    const currentCount = orderCounts[`${farmerId}:${dateStr}`] || 0;
    if (currentCount >= maxOrdersPerDay) {
      // Этот день забит — не можем готовить и не можем выдавать в этот день
      continue;
    }

    const isToday = offset === 0;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    if (!cooked) {
      const cookStart = isToday ? Math.max(nowMinutes, window.start) : window.start;
      const available = window.end - cookStart;
      if (available <= 0) continue;

      if (remaining <= available) {
        const ready = cookStart + remaining;
        cooked = true;
        remaining = 0;
        const readyAligned = Math.max(ready, ceilToStep(ready, SLOT_STEP_MINUTES));
        if (window.end - readyAligned >= MIN_PICKUP_WINDOW_MINUTES) {
          const text = `${dayPrefix(checkDate, now)} ${fmtMinutes(readyAligned)}\u2013${fmtMinutes(window.end)}`;
          return { text, isFallback: false };
        }
        continue;
      } else {
        remaining -= available;
        continue;
      }
    }

    // Готовка завершена — ищем окно для выдачи
    const giveOutStart = isToday ? Math.max(nowMinutes, window.start) : window.start;
    const aligned = ceilToStep(giveOutStart, SLOT_STEP_MINUTES);
    if (window.end - aligned >= MIN_PICKUP_WINDOW_MINUTES) {
      const text = `${dayPrefix(checkDate, now)} ${fmtMinutes(aligned)}\u2013${fmtMinutes(window.end)}`;
      return { text, isFallback: false };
    }
  }

  return { text: "Нет доступных дат", isFallback: false };
}

export function calculatePickupReadyDate(
  prepTimeMinutes: number,
  pickupSlots: PickupSlots | null | undefined,
  busyDates: string[] | null | undefined,
  vacationDates: string[] | null | undefined,
  orderLeadTimeHours?: number,
): PickupReadyDateResult | null {
  return findEarliestReady(
    prepTimeMinutes,
    {
      pickupSlots: pickupSlots ?? null,
      busyDates: busyDates ?? null,
      vacationDates: vacationDates ?? null,
      orderLeadTimeHours: Math.max(0, Math.floor(orderLeadTimeHours ?? 0)),
    },
    { requireMinPickupWindow: true },
  );
}

// ============================================================================
// ДОСТАВКА (КУРЬЕР / ПУНКТ ВЫДАЧИ)
// ============================================================================

export function parseWorkingHoursEnd(workingHours: string | null | undefined): number | null {
  if (!workingHours) return null;
  const match = workingHours.match(/(\d{1,2}:\d{2})\s*[-\u2013]\s*(\d{1,2}:\d{2})/);
  if (!match) return null;
  return parseTime(match[2]);
}

/** Нормализация настроек админа с защитой от мусора */
function normalizeAdminSettings(s: AdminDeliverySettings): {
  cutoffMin: number;
  avgDelivery: number;
  deliveryStart: number;
  deliveryEnd: number;
} {
  const cutoffMin = Math.max(0, Math.min(24 * 60, Math.floor(s.cutoff_time_minutes ?? 1050)));
  const avgDelivery = Math.max(0, Math.floor(s.avg_delivery_time_minutes ?? 70));
  const startH = Math.max(0, Math.min(24, Math.floor(s.delivery_start_hour ?? 6)));
  const endH = Math.max(0, Math.min(24, Math.floor(s.delivery_end_hour ?? 24)));
  const deliveryStart = startH * 60;
  let deliveryEnd = endH === 0 ? 24 * 60 : endH * 60;
  if (deliveryEnd <= deliveryStart) {
    // Битые настройки — fallback
    deliveryEnd = 24 * 60;
  }
  return { cutoffMin, avgDelivery, deliveryStart, deliveryEnd };
}

/**
 * Когда заказ ВСЕХ продавцов в корзине будет готов и доставлен покупателю.
 */
export function calculateDeliveryTime(
  prepPerSeller: Array<{ prepTimeMinutes: number; schedule: SellerSchedule }>,
  adminSettings: AdminDeliverySettings,
  pickupPointEndMinutes?: number,
): DeliveryTimeResult {
  if (prepPerSeller.length === 0) {
    return { text: "Нет доступных дат", isTomorrow: true, earliestMinutes: 0 };
  }

  const { cutoffMin, avgDelivery, deliveryStart, deliveryEnd: rawEnd } = normalizeAdminSettings(adminSettings);
  const deliveryEnd = pickupPointEndMinutes ? Math.min(rawEnd, pickupPointEndMinutes) : rawEnd;
  if (deliveryEnd <= deliveryStart) {
    return { text: "Нет доступных дат", isTomorrow: true, earliestMinutes: 0 };
  }

  const now = getMinskTime();
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Готовность каждого продавца
  const readiness = prepPerSeller.map((s) =>
    findEarliestReady(s.prepTimeMinutes, s.schedule, { requireMinPickupWindow: false, nowMinsk: now }),
  );
  if (readiness.some((r) => r === null)) {
    return { text: "Нет доступных дат", isTomorrow: true, earliestMinutes: 0 };
  }

  // Самая поздняя готовность (по абсолютному времени)
  const latestReady = readiness.reduce<PickupReadyDateResult>((acc, r) => {
    const accDay = new Date(acc.readyDate.getFullYear(), acc.readyDate.getMonth(), acc.readyDate.getDate()).getTime();
    const rDay = new Date(r!.readyDate.getFullYear(), r!.readyDate.getMonth(), r!.readyDate.getDate()).getTime();
    if (rDay !== accDay) return rDay > accDay ? r! : acc;
    return r!.readyTimeMinutes > acc.readyTimeMinutes ? r! : acc;
  }, readiness[0]!);

  // Перебираем дни, начиная с дня готовности
  for (let offset = 0; offset < SEARCH_HORIZON_DAYS; offset++) {
    const checkDate = new Date(latestReady.readyDate);
    checkDate.setDate(checkDate.getDate() + offset);

    const isToday = sameDay(checkDate, todayOnly);
    const isReadyDay = offset === 0;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    // Cutoff: на сегодня — если уже поздно, доставка не сегодня
    if (isToday && nowMinutes > cutoffMin) continue;

    // Самое раннее время прибытия на этой дате
    const readyHere = isReadyDay ? latestReady.readyTimeMinutes : 0;
    let arrival = Math.max(deliveryStart, readyHere + avgDelivery);
    if (isToday) {
      arrival = Math.max(arrival, nowMinutes + avgDelivery);
    }
    arrival = ceilToStep(arrival, SLOT_STEP_MINUTES);

    if (arrival + MIN_PICKUP_WINDOW_MINUTES > deliveryEnd) continue;

    const end = Math.min(arrival + DEFAULT_SLOT_LENGTH_MINUTES, deliveryEnd);
    return {
      text: `${dayPrefix(checkDate, now)} ${fmtMinutes(arrival)}\u2013${fmtMinutes(end)}`,
      isTomorrow: !isToday,
      earliestMinutes: arrival,
    };
  }

  return { text: "Нет доступных дат", isTomorrow: true, earliestMinutes: 0 };
}

export function calculateDeliveryTimePerSeller(
  prepTimeMinutes: number,
  pickupSlots: PickupSlots | null,
  busyDates: string[] | null,
  vacationDates: string[] | null,
  adminSettings: AdminDeliverySettings,
  pickupPointEndMinutes?: number,
): DeliveryTimeResult {
  return calculateDeliveryTime(
    [{ prepTimeMinutes, schedule: { pickupSlots, busyDates, vacationDates } }],
    adminSettings,
    pickupPointEndMinutes,
  );
}

/**
 * Слоты для "Доставка в указанное время" на конкретную дату.
 */
export function getDeliveryTimeSlotsForDate(
  prepPerSeller: Array<{ prepTimeMinutes: number; schedule: SellerSchedule }>,
  adminSettings: AdminDeliverySettings,
  date: Date,
  pickupPointEndMinutes?: number,
): string[] {
  const { cutoffMin, avgDelivery, deliveryStart, deliveryEnd: rawEnd } = normalizeAdminSettings(adminSettings);
  const deliveryEnd = pickupPointEndMinutes ? Math.min(rawEnd, pickupPointEndMinutes) : rawEnd;
  if (deliveryEnd <= deliveryStart) return [];

  const now = getMinskTime();
  const isToday = sameDay(date, now);
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (dateOnly < todayOnly) return [];

  if (isToday) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    if (nowMinutes > cutoffMin) return [];
  }

  const readiness = prepPerSeller.map((s) =>
    findEarliestReady(s.prepTimeMinutes, s.schedule, { requireMinPickupWindow: false, nowMinsk: now }),
  );
  if (readiness.some((r) => r === null)) return [];

  // На выбранной дате каждый продавец должен быть готов раньше или в этот же день
  let latestReadyOnDate = 0;
  for (const r of readiness) {
    const readyDay = new Date(r!.readyDate.getFullYear(), r!.readyDate.getMonth(), r!.readyDate.getDate()).getTime();
    if (readyDay > dateOnly) return [];
    if (readyDay === dateOnly) {
      latestReadyOnDate = Math.max(latestReadyOnDate, r!.readyTimeMinutes);
    }
  }

  let earliestArrival = Math.max(deliveryStart, latestReadyOnDate + avgDelivery);
  if (isToday) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    earliestArrival = Math.max(earliestArrival, nowMinutes + avgDelivery);
  }
  earliestArrival = ceilToStep(earliestArrival, SLOT_STEP_MINUTES);

  const slots: string[] = [];
  for (let start = earliestArrival; start + MIN_PICKUP_WINDOW_MINUTES <= deliveryEnd; start += SLOT_STEP_MINUTES) {
    const end = Math.min(start + DEFAULT_SLOT_LENGTH_MINUTES, deliveryEnd);
    if (end - start < MIN_PICKUP_WINDOW_MINUTES) break;
    slots.push(`${fmtMinutes(start)}\u2013${fmtMinutes(end)}`);
  }
  return slots;
}

export function isDeliveryDateAvailable(
  prepPerSeller: Array<{ prepTimeMinutes: number; schedule: SellerSchedule }>,
  adminSettings: AdminDeliverySettings,
  date: Date,
  pickupPointEndMinutes?: number,
): boolean {
  return getDeliveryTimeSlotsForDate(prepPerSeller, adminSettings, date, pickupPointEndMinutes).length > 0;
}
