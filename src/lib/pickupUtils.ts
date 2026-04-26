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
const SEARCH_HORIZON_DAYS = 14;

// ============================================================================
// ВРЕМЯ И ФОРМАТ
// ============================================================================

/** Текущее время в Europe/Minsk (UTC+3) */
function getMinskTime(): Date {
  const now = new Date();
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcTime + 3 * 60 * 60000);
}

/** Форматировать минуты от полуночи как HH:MM */
function fmtMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/** Парсинг "HH:MM" в минуты от полуночи */
function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Форматирование даты как DD.MM */
function fmtDate(d: Date): string {
  return `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}

/** Один день в YYYY-MM-DD */
function toYmd(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

/** Проверка, что строка с датой совпадает с целевой датой по дню */
function dateMatches(dateStr: string, target: Date): boolean {
  const d = new Date(dateStr);
  return (
    d.getFullYear() === target.getFullYear() &&
    d.getMonth() === target.getMonth() &&
    d.getDate() === target.getDate()
  );
}

/** Округление вверх до ближайшего шага */
function ceilToStep(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}

/** Безопасное время приготовления: 0 — это валидное значение, fallback применяется только если undefined/null */
export function safePrepTime(value: number | null | undefined, fallback = 0): number {
  if (value === null || value === undefined || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.floor(value));
}

/** Префикс "Сегодня" / "Завтра" / "DD.MM" */
function dayPrefix(checkDate: Date, todayMinsk: Date): string {
  const sameDay =
    checkDate.getFullYear() === todayMinsk.getFullYear() &&
    checkDate.getMonth() === todayMinsk.getMonth() &&
    checkDate.getDate() === todayMinsk.getDate();
  if (sameDay) return "Сегодня";

  const tomorrow = new Date(todayMinsk);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (
    checkDate.getFullYear() === tomorrow.getFullYear() &&
    checkDate.getMonth() === tomorrow.getMonth() &&
    checkDate.getDate() === tomorrow.getDate()
  ) {
    return "Завтра";
  }
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
  earliestMinutes: number; // минуты от полуночи на дату доставки
}

export interface PickupReadyDateResult {
  readyDate: Date;
  readyTimeMinutes: number;
  dayOffset: number;
}

interface SellerSchedule {
  pickupSlots: PickupSlots | null;
  busyDates: string[] | null;
  vacationDates: string[] | null;
}

interface AdminDeliverySettings {
  cutoff_time_minutes: number;
  avg_delivery_time_minutes: number;
  delivery_start_hour: number;
  delivery_end_hour: number;
}

interface OrderCounts {
  [key: string]: number; // "farmerId:YYYY-MM-DD" -> count
}

interface CookingCarryover {
  remainingMinutes: number;
}

// ============================================================================
// ЯДРО: РАСЧЁТ ГОТОВНОСТИ ОДНОГО ПРОДАВЦА
// ============================================================================

/**
 * Проверить, активен ли день для продавца (рабочий, не выходной, не отпуск).
 */
function isSellerDayAvailable(checkDate: Date, schedule: SellerSchedule): boolean {
  const slots = schedule.pickupSlots;
  if (!slots) return false;
  const dayKey = DAY_KEYS[checkDate.getDay()];
  const slot = slots[dayKey];
  if (!slot || !slot.active) return false;
  if (schedule.busyDates?.some((d) => dateMatches(d, checkDate))) return false;
  if (schedule.vacationDates?.some((d) => dateMatches(d, checkDate))) return false;
  return true;
}

/**
 * Получить рабочее окно (start, end) продавца на дату — в минутах от полуночи.
 * Возвращает null, если день недоступен.
 */
function getSellerSlotForDate(checkDate: Date, schedule: SellerSchedule): { start: number; end: number } | null {
  if (!isSellerDayAvailable(checkDate, schedule)) return null;
  const dayKey = DAY_KEYS[checkDate.getDay()];
  const slot = schedule.pickupSlots![dayKey]!;
  return { start: parseTime(slot.start), end: parseTime(slot.end) };
}

/**
 * Распределить готовку по одному рабочему окну с учётом carryover.
 * Возвращает либо время готовности (минуты), либо новый carryover для переноса.
 */
function cookInWindow(
  remainingPrep: number,
  slotStart: number,
  slotEnd: number,
  isToday: boolean,
  nowMinutes: number,
): { readyTime: number | null; carryover: CookingCarryover | null } {
  const cookStart = isToday ? Math.max(nowMinutes, slotStart) : slotStart;
  const availableInWindow = slotEnd - cookStart;

  if (availableInWindow <= 0) {
    return { readyTime: null, carryover: { remainingMinutes: remainingPrep } };
  }

  if (remainingPrep === 0) {
    // Готовить ничего не нужно — готов прямо со старта окна
    return { readyTime: cookStart, carryover: null };
  }

  if (remainingPrep <= availableInWindow) {
    return { readyTime: cookStart + remainingPrep, carryover: null };
  }

  // Не успели — переносим остаток
  return {
    readyTime: null,
    carryover: { remainingMinutes: remainingPrep - availableInWindow },
  };
}

/**
 * Найти первую дату+минуту, когда товары продавца будут готовы для выдачи покупателю.
 * Учитывает: график работы, busy/vacation, минимальное окно выдачи (30 мин).
 *
 * @param prepTimeMinutes общее время приготовления (сумма по продавцу). 0 = "в наличии".
 * @param requireMinPickupWindow требовать минимум MIN_PICKUP_WINDOW_MINUTES между готовностью и закрытием окна.
 *   true для самовывоза (покупатель должен успеть забрать), false для расчёта готовности к доставке.
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

  // Если у продавца нет графика — считаем что готов сразу
  if (!schedule.pickupSlots) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return {
      readyDate: new Date(now),
      readyTimeMinutes: nowMinutes + prep,
      dayOffset: 0,
    };
  }

  let carryover: CookingCarryover | null = null;
  const minRequired = options.requireMinPickupWindow ? MIN_PICKUP_WINDOW_MINUTES : 0;

  for (let offset = 0; offset < SEARCH_HORIZON_DAYS; offset++) {
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() + offset);

    const window = getSellerSlotForDate(checkDate, schedule);
    if (!window) continue; // день недоступен — carryover сохраняется

    const isToday = offset === 0;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const remaining = carryover?.remainingMinutes ?? prep;

    const result = cookInWindow(remaining, window.start, window.end, isToday, nowMinutes);
    carryover = result.carryover;

    if (result.readyTime === null) continue;

    // Проверка минимального окна выдачи (для самовывоза)
    if (window.end - result.readyTime < minRequired) {
      // Окно слишком короткое после готовности — продолжаем искать следующее
      // и сбрасываем carryover (готовка уже завершена в этом окне, но забрать нельзя)
      carryover = null;
      continue;
    }

    return {
      readyDate: checkDate,
      readyTimeMinutes: result.readyTime,
      dayOffset: offset,
    };
  }

  return null;
}

// ============================================================================
// САМОВЫВОЗ
// ============================================================================

/**
 * Доступные слоты самовывоза для продавца на конкретную дату.
 * Слоты с шагом 30 мин, длиной 1 час (или меньше, чтобы не выйти за окно).
 * На дату готовности первый слот начинается с округлённого вверх времени готовности.
 */
export function getPickupTimeSlotsForDate(
  prepTimeMinutes: number,
  schedule: SellerSchedule,
  date: Date,
): string[] {
  const window = getSellerSlotForDate(date, schedule);
  if (!window) return [];

  const ready = findEarliestReady(prepTimeMinutes, schedule, { requireMinPickupWindow: true });
  if (!ready) return [];

  // Если выбранная дата раньше даты готовности — нет слотов
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const readyDateOnly = new Date(ready.readyDate.getFullYear(), ready.readyDate.getMonth(), ready.readyDate.getDate());
  if (dateOnly.getTime() < readyDateOnly.getTime()) return [];

  // Ранний край: на дату готовности — фактическое время готовности (округлённое вверх до шага),
  // на более поздние даты — начало рабочего окна.
  let earliest = window.start;
  if (dateOnly.getTime() === readyDateOnly.getTime()) {
    earliest = Math.max(window.start, ceilToStep(ready.readyTimeMinutes, SLOT_STEP_MINUTES));
  }

  const slots: string[] = [];
  for (let start = earliest; start + MIN_PICKUP_WINDOW_MINUTES <= window.end; start += SLOT_STEP_MINUTES) {
    const end = Math.min(start + DEFAULT_SLOT_LENGTH_MINUTES, window.end);
    if (end - start < MIN_PICKUP_WINDOW_MINUTES) break;
    slots.push(`${fmtMinutes(start)}\u2013${fmtMinutes(end)}`);
  }
  return slots;
}

/**
 * Проверка: доступна ли дата для самовывоза у продавца.
 */
export function isPickupDateAvailable(
  prepTimeMinutes: number,
  schedule: SellerSchedule,
  date: Date,
): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) return false;
  return getPickupTimeSlotsForDate(prepTimeMinutes, schedule, date).length > 0;
}

/**
 * Краткое описание ближайшего самовывоза: "Сегодня 10:30–17:00", "Завтра 09:00–18:00" и т.д.
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
): PickupTimeResult {
  const prep = safePrepTime(prepTimeMinutes);

  if (!pickupSlots) {
    const hours = Math.max(1, Math.ceil(prep / 60));
    return { text: prep === 0 ? "В наличии" : `Через ${hours}ч.`, isFallback: true };
  }

  const hasActiveDay = Object.values(pickupSlots).some((s) => s.active);
  if (!hasActiveDay) {
    const hours = Math.max(1, Math.ceil(prep / 60));
    return { text: prep === 0 ? "В наличии" : `Через ${hours}ч.`, isFallback: true };
  }

  const schedule: SellerSchedule = {
    pickupSlots,
    busyDates: busyDates ?? null,
    vacationDates: vacationDates ?? null,
  };

  const now = getMinskTime();
  let carryover: CookingCarryover | null = null;

  for (let offset = 0; offset < SEARCH_HORIZON_DAYS; offset++) {
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() + offset);

    const window = getSellerSlotForDate(checkDate, schedule);
    if (!window) continue;

    // Проверка лимита заказов на эту дату
    const dateStr = toYmd(checkDate);
    const currentCount = orderCounts[`${farmerId}:${dateStr}`] || 0;
    if (currentCount >= maxOrdersPerDay) continue;

    const isToday = offset === 0;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const remaining = carryover?.remainingMinutes ?? prep;

    const cooked = cookInWindow(remaining, window.start, window.end, isToday, nowMinutes);
    carryover = cooked.carryover;

    if (cooked.readyTime === null) continue;

    // Минимальное окно выдачи 30 мин
    if (window.end - cooked.readyTime < MIN_PICKUP_WINDOW_MINUTES) {
      carryover = null;
      continue;
    }

    const readyAligned = ceilToStep(cooked.readyTime, SLOT_STEP_MINUTES);
    if (window.end - readyAligned < MIN_PICKUP_WINDOW_MINUTES) {
      carryover = null;
      continue;
    }

    const text = `${dayPrefix(checkDate, now)} ${fmtMinutes(readyAligned)}\u2013${fmtMinutes(window.end)}`;
    return { text, isFallback: false };
  }

  return { text: "Нет доступных дат", isFallback: false };
}

/**
 * Альтернативный API: вернуть структурированную дату+время первой готовности.
 * Используется в Checkout для блокировки календаря.
 */
export function calculatePickupReadyDate(
  prepTimeMinutes: number,
  pickupSlots: PickupSlots | null | undefined,
  busyDates: string[] | null | undefined,
  vacationDates: string[] | null | undefined,
): PickupReadyDateResult | null {
  return findEarliestReady(
    prepTimeMinutes,
    { pickupSlots: pickupSlots ?? null, busyDates: busyDates ?? null, vacationDates: vacationDates ?? null },
    { requireMinPickupWindow: true },
  );
}

// ============================================================================
// ДОСТАВКА (КУРЬЕР / ПУНКТ ВЫДАЧИ)
// ============================================================================

/**
 * Парсинг "10:00–20:00" → конец работы в минутах.
 */
export function parseWorkingHoursEnd(workingHours: string | null | undefined): number | null {
  if (!workingHours) return null;
  const match = workingHours.match(/(\d{1,2}:\d{2})\s*[-\u2013]\s*(\d{1,2}:\d{2})/);
  if (!match) return null;
  return parseTime(match[2]);
}

/**
 * Когда заказ от ВСЕХ продавцов в корзине будет готов и доставлен покупателю.
 * Узкое место — самый поздний из готовых продавцов.
 *
 * @param sellerSettings ВСЕ продавцы в корзине, не только bottleneck
 * @param pickupPointEndMinutes ограничение по часу закрытия пункта выдачи
 */
export function calculateDeliveryTime(
  prepPerSeller: Array<{ prepTimeMinutes: number; schedule: SellerSchedule }>,
  adminSettings: AdminDeliverySettings,
  pickupPointEndMinutes?: number,
): DeliveryTimeResult {
  const { cutoff_time_minutes, avg_delivery_time_minutes, delivery_start_hour, delivery_end_hour } = adminSettings;
  const deliveryStartMin = delivery_start_hour * 60;
  const rawDeliveryEndMin = delivery_end_hour * 60;
  const deliveryEndMin = pickupPointEndMinutes
    ? Math.min(rawDeliveryEndMin, pickupPointEndMinutes)
    : rawDeliveryEndMin;

  const now = getMinskTime();

  // Если продавцов нет — fallback (не должно происходить в норме)
  if (prepPerSeller.length === 0) {
    return { text: "Нет доступных дат", isTomorrow: true, earliestMinutes: 0 };
  }

  // Считаем готовность каждого продавца независимо.
  // Для доставки требуем только что заказ ВООБЩЕ готов в окне (не нужны 30 мин на самовывоз).
  const readiness = prepPerSeller.map((s) =>
    findEarliestReady(s.prepTimeMinutes, s.schedule, { requireMinPickupWindow: false, nowMinsk: now }),
  );

  if (readiness.some((r) => r === null)) {
    return { text: "Нет доступных дат", isTomorrow: true, earliestMinutes: 0 };
  }

  // Узкое место — продавец с самой поздней готовностью (по абсолютному времени)
  const latestReady = readiness.reduce<PickupReadyDateResult>((acc, r) => {
    const accTs = acc.readyDate.getTime() - (acc.readyDate.getTime() % 86400000) + acc.readyTimeMinutes * 60000;
    const rTs = r!.readyDate.getTime() - (r!.readyDate.getTime() % 86400000) + r!.readyTimeMinutes * 60000;
    return rTs > accTs ? r! : acc;
  }, readiness[0]!);

  // На дату готовности продавца применяем cutoff и пытаемся доставить;
  // если не помещается — переходим на следующий рабочий день доставки.
  for (let offset = 0; offset < SEARCH_HORIZON_DAYS; offset++) {
    const checkDate = new Date(latestReady.readyDate);
    checkDate.setDate(checkDate.getDate() + offset);

    const isSameDayAsReady = offset === 0;
    const isToday =
      checkDate.getFullYear() === now.getFullYear() &&
      checkDate.getMonth() === now.getMonth() &&
      checkDate.getDate() === now.getDate();

    // Cutoff: применяется только на сегодня
    if (isToday) {
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      if (nowMinutes > cutoff_time_minutes) continue;
    }

    // Время готовности на этой дате
    const readyHere = isSameDayAsReady ? latestReady.readyTimeMinutes : deliveryStartMin;

    let arrival = readyHere + avg_delivery_time_minutes;
    arrival = Math.max(arrival, deliveryStartMin);
    arrival = ceilToStep(arrival, SLOT_STEP_MINUTES);

    if (arrival + MIN_PICKUP_WINDOW_MINUTES > deliveryEndMin) continue;

    const end = Math.min(arrival + DEFAULT_SLOT_LENGTH_MINUTES, deliveryEndMin);
    return {
      text: `${dayPrefix(checkDate, now)} ${fmtMinutes(arrival)}\u2013${fmtMinutes(end)}`,
      isTomorrow: !isToday,
      earliestMinutes: arrival,
    };
  }

  return { text: "Нет доступных дат", isTomorrow: true, earliestMinutes: 0 };
}

/**
 * Ближайшая доставка для одного продавца (используется в карточках "пункт выдачи" по продавцам).
 */
export function calculateDeliveryTimePerSeller(
  prepTimeMinutes: number,
  pickupSlots: PickupSlots | null,
  busyDates: string[] | null,
  vacationDates: string[] | null,
  adminSettings: AdminDeliverySettings,
  pickupPointEndMinutes?: number,
): DeliveryTimeResult {
  return calculateDeliveryTime(
    [
      {
        prepTimeMinutes,
        schedule: { pickupSlots, busyDates, vacationDates },
      },
    ],
    adminSettings,
    pickupPointEndMinutes,
  );
}

/**
 * Доступные слоты для "Доставка в указанное время" на конкретную дату.
 * Учитывает реальную готовность заказа от ВСЕХ продавцов.
 */
export function getDeliveryTimeSlotsForDate(
  prepPerSeller: Array<{ prepTimeMinutes: number; schedule: SellerSchedule }>,
  adminSettings: AdminDeliverySettings,
  date: Date,
  pickupPointEndMinutes?: number,
): string[] {
  const { avg_delivery_time_minutes, delivery_start_hour, delivery_end_hour } = adminSettings;
  const deliveryStart = delivery_start_hour * 60;
  const rawEnd = delivery_end_hour * 60;
  const deliveryEnd = pickupPointEndMinutes ? Math.min(rawEnd, pickupPointEndMinutes) : rawEnd;

  const now = getMinskTime();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  // Считаем готовность всех продавцов
  const readiness = prepPerSeller.map((s) =>
    findEarliestReady(s.prepTimeMinutes, s.schedule, { requireMinPickupWindow: false, nowMinsk: now }),
  );
  if (readiness.some((r) => r === null)) return [];

  // На выбранной дате каждый продавец должен быть готов либо РАНЬШЕ этой даты, либо в этот же день
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  let latestReadyOnDate = 0;
  for (const r of readiness) {
    const readyDay = new Date(r!.readyDate.getFullYear(), r!.readyDate.getMonth(), r!.readyDate.getDate()).getTime();
    if (readyDay > dateOnly) return []; // продавец не готов к этой дате
    if (readyDay === dateOnly) {
      latestReadyOnDate = Math.max(latestReadyOnDate, r!.readyTimeMinutes);
    }
    // Если продавец готов раньше — его готовность не ограничивает время на этой дате
  }

  // Минимальное время прибытия = max(начало доставки, готовность + время доставки, текущее время если сегодня)
  let earliestArrival = Math.max(deliveryStart, latestReadyOnDate + avg_delivery_time_minutes);
  if (isToday) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    earliestArrival = Math.max(earliestArrival, nowMinutes + avg_delivery_time_minutes);
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

/**
 * Проверка: доступна ли дата для доставки (с учётом всех продавцов и настроек).
 */
export function isDeliveryDateAvailable(
  prepPerSeller: Array<{ prepTimeMinutes: number; schedule: SellerSchedule }>,
  adminSettings: AdminDeliverySettings,
  date: Date,
  pickupPointEndMinutes?: number,
): boolean {
  return getDeliveryTimeSlotsForDate(prepPerSeller, adminSettings, date, pickupPointEndMinutes).length > 0;
}
