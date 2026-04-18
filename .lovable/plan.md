
Изменения в `src/lib/priceUtils.ts` и `src/components/ProductCard.tsx`:

**1. Формат цены — всегда два знака после запятой**

В `formatPrice()` (priceUtils.ts) сейчас копейки показываются только если `kopecks > 0`. Нужно всегда показывать с двумя знаками: `8` → `8,00`, `16,34` остаётся `16,34`.

```ts
// src/lib/priceUtils.ts
export function formatPrice(priceInKopecks: number): PriceDisplay {
  const rubles = Math.floor(priceInKopecks / 100);
  const kopecks = priceInKopecks % 100;
  const formatted = `${rubles},${kopecks.toString().padStart(2, '0')}`;
  return { rubles, kopecks, formatted };
}
```

Также в `kopecksToRublesString()` оставлю текущую логику (она используется для input-значений в формах редактирования — там два знака не нужны).

**2. Цвет «низкой цены» в карточке товара**

В `src/components/ProductCard.tsx` (строка ~133) заменить класс `text-[#ff0044]` на `text-[#ab5a3f]`:

```tsx
<span className={cn("text-base font-bold", isLowestPrice ? "text-[#ab5a3f]" : "text-foreground")}>
```

## Затрагиваемые файлы
- `src/lib/priceUtils.ts` — изменение `formatPrice`
- `src/components/ProductCard.tsx` — цвет цены при `isLowestPrice`

## Влияние
Формат `8,00` будет применён везде, где используется `formatPrice`/`formatPriceString`: карточки товара, корзина, чекаут, страница товара, заказы, email-уведомления (через тот же util). Это согласуется с правилом проекта о форматировании BYN с запятой.
