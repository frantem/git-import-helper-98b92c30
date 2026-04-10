

## Проблема

В календаре "Доставка в указанное время" (курьер) дата блокируется только если она в прошлом или в `allBlockedDates` (busy/vacation). Не учитывается время приготовления товара — пользователь может выбрать "сегодня", хотя товар будет готов только через 4 дня.

При этом `fastDeliveryResult` уже содержит правильно рассчитанную ближайшую дату доставки (14.04), но календарь её не использует.

## Исправление

### Файл: `src/pages/Checkout.tsx`

**1. Вычислить earliest delivery date из `fastDeliveryResult`** (строки ~107-123):
- `fastDeliveryResult.text` содержит "14.04 18:10–19:10" — значит раньше 14.04 доставка невозможна
- `fastDeliveryResult.isTomorrow` показывает что это не сегодня
- Нужно вычислить дату earliest delivery и использовать её для блокировки

**2. Обновить `disabled` в Calendar** (строки 862-872):
- Сейчас: блокирует `date < today` и `allBlockedDates`
- Нужно: блокировать даты раньше даты из `fastDeliveryResult`
- Логика: вычислить earliestDeliveryDate из `fastDeliveryResult.text` (парсим "DD.MM" или "Сегодня"/"Завтра"), блокировать все даты до неё

**3. Обновить `availableTimeSlots`** (строки 136-157):
- Для дня = earliestDeliveryDate: показывать слоты начиная с `fastDeliveryResult.earliestMinutes`
- Для дней после: показывать все слоты от `delivery_start_hour`
- Текущая логика `minSlotMinutes` уже частично это делает но только для "сегодня" — нужно расширить на earliestDate

**Конкретные изменения:**

```text
Строки 862-872 (Calendar disabled):
  Добавить: вычислить earliestDate из fastDeliveryResult
  Блокировать date < earliestDate (не date < today)

Строки 136-157 (availableTimeSlots):  
  isToday → isSameAsEarliestDate
  Применять minSlotMinutes только на earliest date, не только на "сегодня"
```

Один файл, ~20 строк изменений.

