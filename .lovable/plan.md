

## Проблемы

1. **"Ошибка при изменении статуса"** — `handleToggleActive` (строка 267) пытается записать `archived_at`, которого нет в таблице `products`. Supabase отклоняет запрос.

2. **Удалённые товары видны в списке** — после soft-delete (`is_active: false`) продукт остаётся в списке продавца, т.к. `fetchData` загружает все товары без фильтра. Пользователь хочет: нажал "удалить" → товар пропал из списка.

## Решение

### 1. Исправить `handleToggleActive` в `SellerProducts.tsx` (строка 266-267)

Убрать `archived_at` из update — оставить только `{ is_active: !currentState }`.

### 2. Скрывать удалённые товары из списка

В `fetchData` (строка 104-106): после soft-delete товар имеет `is_active: false`. Но продавцу нужно видеть скрытые товары (чтобы включить обратно через Switch). Поэтому оставим загрузку всех товаров — Switch уже работает для скрытия/показа.

Однако если пользователь нажал именно **"Удалить"** (а не Switch) — товар должен полностью исчезнуть. Для этого можно добавить колонку `is_deleted` или просто убирать товар из локального state после soft-delete.

**Простое решение**: после soft-delete в `handleDeleteProduct` — удалить товар из локального `products` state, не дожидаясь `fetchData`. А `fetchData` продолжит загружать `is_active: false` товары (для тех, кто скрыл через Switch).

Нет — лучше разделить: Switch скрывает (`is_active=false`), а "Удалить" помечает как удалённый. Но добавлять колонку сложно. 

**Самое простое**: после soft-delete в `handleDeleteProduct` — просто фильтровать этот товар из state:

```typescript
setProducts(prev => prev.filter(p => p.id !== deleteConfirmId));
```

И убрать вызов `fetchData()` в handleDeleteProduct (потому что fetchData вернёт товар обратно). Но при перезагрузке страницы товар снова появится с `is_active: false` и пометкой "Скрыт" — это нормальное поведение для Switch-скрытых товаров.

**Лучшее решение**: не показывать товары с `is_active: false` если их скрыл именно "Удалить". Нужен маркер. Самый чистый вариант — добавить булевую колонку `is_deleted` в `products`.

### Итоговый план

**Миграция SQL**: добавить `is_deleted boolean default false` в `products`.

**`SellerProducts.tsx`**:
- `handleToggleActive`: убрать `archived_at`, оставить только `{ is_active: !currentState }`
- `handleDeleteProduct`: при soft-delete ставить `{ is_active: false, is_deleted: true }` вместо просто `{ is_active: false }`
- `fetchData`: добавить `.eq("is_deleted", false)` к запросу продуктов — удалённые не загружаются
- `useProducts.ts`: добавить `.eq("is_deleted", false)` к публичному запросу (чтобы удалённые не показывались покупателям тоже)

### Файлы
| Файл | Изменение |
|---|---|
| Миграция SQL | `ALTER TABLE products ADD COLUMN is_deleted boolean NOT NULL DEFAULT false` |
| `src/pages/seller/SellerProducts.tsx` | Убрать `archived_at`, добавить `is_deleted` при soft-delete, фильтр в fetchData |
| `src/hooks/useProducts.ts` | Добавить `.eq("is_deleted", false)` |

