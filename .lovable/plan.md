## Диагноз

Продукт `e03dac05…` — «Квашеная капуста», `prep_time=0`, `order_lead_time_hours=1`.
Фермер «не Артём» (`user_id 50a6eb43…`), Вс: **10:00–22:30**.
Сейчас Вс 19:00. По здравому смыслу: с lead 1ч → самовывоз доступен с 20:00 до 22:30 сегодня.

В `src/lib/pickupUtils.ts` функция `getSellerSlotForDate` (стр. 192–205) делает следующее:

```ts
const windowStart = <дата дня> + slot.start;   // = сегодня 10:00
const diffMinutes = (windowStart - now) / 60000; // = (10:00 − 19:00) = −540
if (diffMinutes < leadHours * 60) return null;   // −540 < 60 → ОТКЛОНЯЕТ ВЕСЬ ДЕНЬ
```

То есть lead-time трактуется как «между **началом окна** и сейчас», а не как «между **сейчас** и моментом выдачи». Для уже открытого окна это всегда даёт отрицательное число и день целиком выкидывается. Поэтому ближайший самовывоз уезжает на завтра (Пн 17:00–22:30).

Та же логика подтягивается во все расчёты доставки/самовывоза, которые используют `getSellerSlotForDate`.

## Решение

Lead time — это «минимум сколько времени должно пройти от заказа до выдачи», а не «до начала окна». Правильная логика:

1. В `getSellerSlotForDate`:
   - Убрать отклонение окна по `windowStart - now < lead`.
   - Отклонять окно только если оно уже фактически непригодно: `window.end <= now + lead` (для сегодня) или `window.end <= 0` (для будущих дней — невозможно, оставляем как есть).
2. В местах расчёта `cookStart` (внутри `findEarliestReady` стр. 261 и `calculatePickupTime` стр. 425) для сегодняшнего дня учитывать lead:
   ```ts
   const earliestActionable = nowMinutes + leadMinutes;
   const cookStart = isToday
     ? Math.max(earliestActionable, window.start)
     : window.start;
   ```
   Где `leadMinutes = (schedule.orderLeadTimeHours ?? 0) * 60`.
3. Для `findEarliestReady` ветка «готовка уже завершена» (стр. 291) — аналогично применить `earliestActionable` для `giveOutStart`, иначе lead обойдётся в выдаче на следующий день.

## Ожидаемый результат

Для текущего кейса (Вс 19:00, prep=0, lead=1ч, окно 10:00–22:30):
- earliestActionable = 19:00 + 1ч = 20:00
- cookStart = max(20:00, 10:00) = 20:00, prep=0 → ready 20:00
- Слот выдачи: **Сегодня 20:00–22:30** (с учётом шага 30 мин).

Самовывоз и доставка перестанут необоснованно «прыгать» на завтра у продавцов, чьё окно уже открыто.

## Затронутые файлы

- `src/lib/pickupUtils.ts` — `getSellerSlotForDate`, `findEarliestReady`, `calculatePickupTime` (и любые сопутствующие места, использующие тот же паттерн `cookStart`/`giveOutStart` — проверю строки 530+ для доставки).

Никакая UI-логика, БД-схема и edge-функции не меняются.
