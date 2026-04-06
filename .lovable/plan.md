

## Задача

Отображать статус наличия / время приготовления товара в двух местах:
1. **Превью-карточка** (ProductCard) — справа от цены, в правом нижнем углу
2. **Страница товара** (Product) — под названием товара

### Логика отображения
- `prep_time_minutes === 0` или `undefined/null` → "Есть в наличии"
- `prep_time_minutes > 0` → "Время приготовления: Xч." (минуты конвертируются в часы)

### Изменения

**1. `src/hooks/useProducts.ts`** — добавить `prep_time_minutes` в запрос и трансформацию

- В SQL-запросе (строка 57): добавить `prep_time_minutes` в select
- В интерфейсе `DBProduct`: добавить `prep_time_minutes: number`
- В `transformProduct` (строка 144): передать реальное значение вместо `undefined`

**2. `src/data/products.ts`** — уже содержит `prep_time_minutes` в интерфейсе Product, ничего менять не надо

**3. `src/components/ProductCard.tsx`** — добавить отображение в нижней части карточки

- Создать хелпер `formatPrepTime(minutes)` для конвертации
- Между ценой и правым краем (строки 125-142), добавить текст справа от блока цены в одну строку:
  - `flex items-center justify-between` на обёртку
  - Справа: маленький текст `text-[10px]` с "Есть в наличии" (зелёный) или "~Xч." (серый)
  - Карточка НЕ увеличивается — текст компактный, в одну строку с ценой

**4. `src/pages/Product.tsx`** — добавить под `<h1>` (строка 457)

- Блок с текстом "Есть в наличии" или "Время приготовления: Xч."
- Стиль: `text-sm text-muted-foreground mt-1`

### Формат конвертации
```
function formatPrepTime(minutes: number): string {
  if (minutes < 60) return `${minutes}мин.`;
  const hours = Math.round(minutes / 60);
  return `${hours}ч.`;
}
```

### Файлы
| Файл | Изменение |
|---|---|
| `src/hooks/useProducts.ts` | Добавить `prep_time_minutes` в select и transformProduct |
| `src/components/ProductCard.tsx` | Показать статус наличия/время рядом с ценой |
| `src/pages/Product.tsx` | Показать статус под названием товара |

