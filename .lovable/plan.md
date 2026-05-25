## Что меняем

На превью карточки товара (`ProductCard`) и в карточке товара (`Product.tsx`) вместо текущей метки времени приготовления (`formatPrepTime` → "В наличии" / "~6ч." / "~1дн.") показываем **ближайшую дату самовывоза**:
- "Сегодня"
- "Завтра"
- "DD.MM" (например "28.05")
- "Нет в наличии" — если ни в одном из 30 ближайших дней нет доступного слота самовывоза

Без времени (никаких "10:00–17:00").

## Как считаем дату

Используем уже существующую логику `calculatePickupTime` из `src/lib/pickupUtils.ts` — ту же, что и /checkout при выборе самовывоза. Она учитывает:
- prep_time_minutes + order_lead_time_hours товара
- pickup_slots, busy_dates, vacation_dates продавца
- max_orders_per_day и текущие подтверждённые заказы по продавцу/дате

Из её результата берём только префикс дня (Сегодня/Завтра/DD.MM), отсекая часть со временем. Если `calculatePickupTime` вернул "Нет доступных дат" — показываем "Нет в наличии".

Чтобы не дублировать логику, добавим в `pickupUtils.ts` отдельный экспорт `calculatePickupDateLabel(...)` с теми же входными параметрами, что и `calculatePickupTime`, который возвращает только метку даты ("Сегодня" / "Завтра" / "DD.MM" / "Нет в наличии"). Внутри переиспользует общий поиск ближайшего готового окна.

## Загрузка данных

Сейчас `useProducts` тянет только товары; графики продавцов и счётчики заказов не загружаются. Добавим хук `useSellerPickupData(farmerIds)`:
1. RPC `get_seller_pickup_settings(farmer_ids)` — pickup_slots / max_orders_per_day / busy_dates / vacation_dates.
2. RPC `get_orders_count_by_dates(farmer_ids, dates)` — счётчики заказов на ближайшие ~30 дней.
3. Кеш через React Query, staleTime ~5 минут.

В `Catalog`, `Index` (homepage блоки), `Favorites`, `SellerProfile` и `Product` собираем уникальные `farmer_id` отображаемых товаров и зовём этот хук один раз. Передаём готовые данные в `ProductCard` через новый необязательный проп `pickupLabel?: string` (вычисленный на родителе из `calculatePickupDateLabel`).

Если данные ещё грузятся или у продавца нет графика — показываем старую логику (`formatPrepTime`) как fallback, чтобы не было «мигания».

## Файлы

Технические детали:
- `src/lib/pickupUtils.ts` — добавить `calculatePickupDateLabel(...)`, без изменения существующих функций.
- `src/hooks/useSellerPickupData.ts` — новый хук (RPC + React Query).
- `src/components/ProductCard.tsx` — новый проп `pickupLabel?: string`; если задан — рендерим его вместо `formatPrepTime`; цвет: "Сегодня"/"Завтра" — зелёный (как сейчас "В наличии"), "DD.MM" — muted, "Нет в наличии" — красный.
- `src/pages/Catalog.tsx`, `src/pages/Index.tsx`, `src/pages/Favorites.tsx`, `src/pages/SellerProfile.tsx` — собрать farmer_ids, посчитать `pickupLabel` для каждого товара, прокинуть в `ProductCard`.
- `src/pages/Product.tsx` — то же самое в блоке prep-time на детальной странице.

## Что НЕ трогаем

- Логику /checkout (она и так корректна).
- Поля БД, миграции — не нужны, RPC уже есть.
- Бизнес-логику prep_time / lead_time — только отображение.
