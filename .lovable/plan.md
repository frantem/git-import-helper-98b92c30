

## Проблема

`calculateDeliveryTime` использует `delivery_end_hour` из admin settings (по умолчанию 24) для ограничения времени доставки. Но при доставке в пункт выдачи (ПВЗ) нужно учитывать **рабочие часы самого ПВЗ** (например, до 20:00). Сейчас этого не происходит — функция показывает "Сегодня 21:40–22:40", хотя ПВЗ закрыт после 20:00.

## Решение

Передать рабочие часы выбранного ПВЗ в расчёт и ограничить время доставки временем закрытия ПВЗ.

### Изменения

**1. `src/lib/pickupUtils.ts`** — добавить опциональный параметр `pickupPointClosingMinutes` в `calculateDeliveryTime`. Если передан, использовать `Math.min(deliveryEndMin, pickupPointClosingMinutes)` вместо просто `deliveryEndMin` при проверке "слишком поздно". Также ограничить окно `endMin` (конец интервала) этим значением.

**2. `src/pages/Checkout.tsx`** — в двух местах, где вызывается `calculateDeliveryTime` / `calculateDeliveryTimePerSeller` для типа "pickup":

- **`fastDeliveryResult` (строка ~102)**: если `deliveryType === "pickup"` и выбран ПВЗ, парсить `working_hours` выбранного ПВЗ (формат "10:00–20:00") и передавать closing time в `calculateDeliveryTime`.
- **Рендер per-seller (строка ~587)**: аналогично передавать closing time ПВЗ в `calculateDeliveryTimePerSeller`.

### Парсинг working_hours

Формат строки: `"10:00-20:00"` или `"10:00–20:00"`. Вспомогательная функция извлекает конечное время и конвертирует в минуты от полуночи. Если не удалось распарсить — не ограничиваем (fallback к `delivery_end_hour`).

### Технические детали

В `calculateDeliveryTime`:
```
// Новый опциональный параметр:
pickupPointEndMinutes?: number

// В цикле вместо:
if (arrivalMin >= deliveryEndMin) continue;
// Будет:
const effectiveEnd = pickupPointEndMinutes 
  ? Math.min(deliveryEndMin, pickupPointEndMinutes) 
  : deliveryEndMin;
if (arrivalMin >= effectiveEnd) continue;

// Также ограничить endMin окна:
const endMin = Math.min(arrivalMin + 60, effectiveEnd);
```

Итого: 2 файла, ~15 строк изменений.

