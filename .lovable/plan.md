## Проблема

На странице `/checkout` при выборе «Доставка на дом» → «Доставка в указанное время» кнопка «Заказать» остаётся активной, даже если пользователь ещё не выбрал дату и время. Это позволяет оформить заказ без указания желаемого времени доставки.

## Решение

В `src/pages/Checkout.tsx`, строка 1240, расширить условие `disabled` у кнопки «Заказать»:

**Сейчас:**
```tsx
<Button
  className="w-full"
  size="lg"
  onClick={handleOrder}
  disabled={
    isLoading ||
    !deliveryType ||
    (deliveryType === "pickup" && (!selectedPoint || pickupPoints.length === 0))
  }
>
  {isLoading ? "Оформление..." : "Заказать"}
</Button>
```

**Станет:**
```tsx
<Button
  className="w-full"
  size="lg"
  onClick={handleOrder}
  disabled={
    isLoading ||
    !deliveryType ||
    (deliveryType === "pickup" && (!selectedPoint || pickupPoints.length === 0)) ||
    (deliveryType === "courier" && courierDeliveryMode === "scheduled" && (!selectedDate || !selectedTime))
  }
>
  {isLoading ? "Оформление..." : "Заказать"}
</Button>
```

### Поведение

- При выборе «Доставка на дом» + «Ближайшая доставка» — кнопка активна (как было).
- При выборе «Доставка на дом» + «Доставка в указанное время» — кнопка заблокирована, пока не выбраны и дата (`selectedDate`), и время (`selectedTime`).
- Как только пользователь выбирает дату и время в поповере — кнопка снова становится доступной.
- Самовывоз и пункт выдачи — без изменений.

## Файлы

- `src/pages/Checkout.tsx` — строка 1240, расширить условие `disabled` у нижней кнопки «Заказать».
