
Понял. Сейчас логика в `src/pages/Checkout.tsx` всё ещё неверная: она выбирает “узкое место” по `prep_time_minutes`, а вам нужно выбирать по **реальному самому позднему моменту готовности для покупателя**.

## Что именно нужно изменить

### 1. Перестать выбирать bottleneck по `prep_time_minutes`
Сейчас в `fastDeliveryResult`:
- ищется товар с максимальным `prep_time_minutes`
- берётся только его продавец
- по нему считается доставка

Это надо заменить.

### 2. Для каждого продавца сначала посчитать его реальную готовность
В `/checkout` уже есть правильная логика самовывоза:
- для каждого продавца берётся `max prep_time_minutes` среди его товаров
- затем через `calculatePickupReadyDate(...)` считается **реальная дата и время**, когда продавец сможет отдать заказ покупателю с учётом:
  - текущего времени
  - рабочих окон `pickup_slots`
  - переносов на следующие рабочие дни
  - `busy_dates`
  - `vacation_dates`

Именно этот результат и должен стать основой для курьерской доставки.

### 3. Найти самого позднего продавца по `readyDate + readyTimeMinutes`
Нужно:
- сгруппировать товары по `farmer_id`
- для каждого продавца вычислить его `readyResult`
- сравнить продавцов не по `prep_time_minutes`, а по фактическому timestamp готовности
- выбрать того, у кого дата/время готовности самые поздние

То есть логика будет такой:

```text
seller A -> готов 13.04 15:30
seller B -> готов 14.04 11:30
seller C -> готов 14.04 09:00

Берём seller B, потому что он самый поздний по фактической готовности.
```

### 4. Уже потом считать `fastDeliveryResult` только по этому продавцу
После выбора самого позднего продавца:
- взять его `maxPrep`
- взять его `pickup_slots / busy_dates / vacation_dates`
- передать только этого продавца в `calculateDeliveryTime(...)`

Это сохранит текущую архитектуру и даст правильный результат:
- “Ближайшая доставка”
- ограничение дат в “Доставка в указанное время”
- ограничение первых доступных часов в этот день

## Где менять

### Файл: `src/pages/Checkout.tsx`

#### Блок `fastDeliveryResult` (строки около 106–133)
Заменить текущую логику:
```text
найти один товар с максимальным prep_time_minutes
```

на:
```text
1. собрать уникальных продавцов из корзины
2. для каждого продавца:
   - найти maxPrep среди его товаров
   - взять sellerPickupSettings
   - вызвать calculatePickupReadyDate(maxPrep, ...)
3. сравнить readyDate + readyTimeMinutes
4. выбрать продавца с самым поздним ready timestamp
5. вызвать calculateDeliveryTime(maxPrep, [этот seller], ...)
```

## Почему это правильно
Потому что “самый долгий” для доставки — это не обязательно товар с самым большим `prep_time_minutes`.  
У одного продавца `prep_time_minutes` может быть меньше, но его ближайшее рабочее окно сильно позже, поэтому **для покупателя он станет реальным bottleneck**.

## Технические детали

```text
Текущее неверное правило:
  bottleneck = max(prep_time_minutes)

Нужное правило:
  bottleneck = max(actual_ready_datetime_for_customer)

Где:
  actual_ready_datetime_for_customer =
    результат calculatePickupReadyDate(...) для продавца,
    рассчитанный по max prep среди товаров этого продавца
```

### Практически это будет выглядеть так
Для каждого `farmer_id`:
```text
farmerItems = items.filter(i => i.product.farmer_id === fid)
maxPrep = max(farmerItems.prep_time_minutes)
settings = sellerPickupSettings.get(fid)
ready = calculatePickupReadyDate(maxPrep, settings.pickup_slots, settings.busy_dates, settings.vacation_dates)
readyTimestamp = ready.readyDate at ready.readyTimeMinutes
```

Потом:
```text
latestReadySeller = seller with max(readyTimestamp)
fastDeliveryResult = calculateDeliveryTime(
  latestReadySeller.maxPrep,
  [latestReadySeller.settings],
  adminSettings,
  ppEndMinutes
)
```

## Ожидаемый эффект
Исправятся оба сценария курьерской доставки:
- “Ближайшая доставка”
- “Доставка в указанное время”

И они будут ориентироваться на того продавца, чей заказ **позже всех станет доступен покупателю**, а не просто на самый большой `prep_time_minutes`.

Один файл, примерно 25–40 строк изменений.
