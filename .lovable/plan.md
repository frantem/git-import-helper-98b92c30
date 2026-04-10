

## Проблема

`calculateDeliveryTime` применяет `maxPrepTimeMinutes` (360 мин) к расписанию **каждого** продавца отдельно и ждёт пока **все** продавцы будут готовы в один день. При двух продавцах с разными расписаниями это сдвигает дату дальше.

Правильная логика: находим товар с самым долгим `prep_time_minutes`, берём расписание **только этого продавца**, считаем доставку по нему. Остальные продавцы будут готовы раньше — они не влияют на дату.

## Исправление

### Файл: `src/pages/Checkout.tsx` (строки 107-123)

Изменить `fastDeliveryResult`:

1. Найти товар с максимальным `prep_time_minutes`
2. Взять `farmer_id` этого товара
3. Передать в `calculateDeliveryTime` только **одного** продавца (того, чей товар самый долгий) вместо массива всех продавцов

```text
Было:
  maxPrep = max(all items prep)
  sellers = [все уникальные farmer_id]
  calculateDeliveryTime(maxPrep, allSellers, ...)

Станет:
  slowestItem = item с max prep_time_minutes
  maxPrep = slowestItem.prep_time_minutes
  slowestSeller = [только farmer_id этого товара]
  calculateDeliveryTime(maxPrep, [slowestSeller], ...)
```

Один файл, ~10 строк изменений. Функция `calculateDeliveryTime` не меняется.

