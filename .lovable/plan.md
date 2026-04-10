

## Проблема

В `getSellerReadyMinutesWithCarryover` буфер 30 минут вычитается из **каждого** рабочего окна (`availableInSlot = slotEnd - BUFFER - cookStart`). Это приводит к тому, что из каждого 3-часового окна "съедается" только 150 минут вместо 180, и товар "готовится" на день-два дольше, чем нужно.

По вашей логике: буфера нет вообще, доступное время окна = `slotEnd - start` целиком.

### Пример (ваш расчёт, верный):
```text
prep = 360 мин, заказ 10.04 15:00

Пт 10.04: 15:00–16:30 = 90 мин, remaining = 360-90 = 270
Сб 11.04: inactive → skip
Вс 12.04: inactive → skip  
Пн 13.04: 11:00–16:30 = 330 мин, 270 < 330 → ready = 11:00+270 = 15:30

Итог: "13.04 15:30–16:30"
```

Текущий код с буфером 30 мин из каждого окна:
```text
Пт: available = 90-30 = 60, remaining = 360-60 = 300
Пн: available = 330-30 = 300, remaining = 300-300 = 0, ready = 11:00+300 = 16:00
→ "13.04 16:00–16:30" (или ещё хуже из-за артефактов)
```

## Исправление

### Файл: `src/lib/pickupUtils.ts`

Убрать `BUFFER_MINUTES = 30` из `getSellerReadyMinutesWithCarryover`. Доступное время = полное окно без вычетов.

**Строки 84, 100, 127** — три места где буфер используется:

1. Строка 84: удалить `const BUFFER_MINUTES = 30;`
2. Строка 100: `slotEnd - BUFFER_MINUTES - cookStart` → `slotEnd - cookStart`
3. Строка 127: `slotEnd - slotStart - BUFFER_MINUTES` → `slotEnd - slotStart`

Это автоматически исправит и `calculatePickupTime`, и `calculatePickupReadyDate`, и `calculateDeliveryTime` — все они используют одну и ту же функцию `getSellerReadyMinutesWithCarryover`.

Один файл, 3 строки изменений.

