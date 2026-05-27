## Цель
Добавить продавцу возможность отказаться от продавца, оставив аккаунт покупателя. Кнопка — внизу `/settings`, мелким серым текстом-ссылкой. После клика — AlertDialog с подтверждением.

## Что делает удаление (полное удаление продавца)
1. Удаляются все `products` продавца (через `farmer_id`). Сопутствующие данные (`product_images`, `product_variants`, `product_addons`, `product_custom_fields`, `product_custom_field_options`, `product_categories`, `favorites`, `homepage_block_products`, `reviews`) удаляются по `product_id`.
2. Удаляется запись `farmers` пользователя.
3. Удаляется роль `seller` из `user_roles` (роль `buyer` остаётся; если её нет — добавляется).
4. Удаляются `seller_applications` пользователя.
5. История заказов (`orders`, `order_items`) **остаётся нетронутой** — там уже есть `farmer_id`/`product_id` без FK, поэтому удаление товаров не сломает заказы (только превратит ссылки в "висячие", что приемлемо для архива).

## Реализация

### 1. Edge Function `delete-seller-account`
Новая функция `supabase/functions/delete-seller-account/index.ts`:
- Принимает JWT покупателя, проверяет через `auth.getUser`.
- Использует `SERVICE_ROLE_KEY` чтобы:
  - Найти `farmer` по `user_id`.
  - Получить список `product_id` для этого фермера.
  - Удалить связанные строки в порядке: `review_images`→`reviews`, `favorites`, `homepage_block_products`, `product_images`, `product_variants`, `product_addons`, `product_custom_field_options`→`product_custom_fields`, `product_categories`, затем `products`.
  - Удалить `farmers`.
  - Удалить `seller_applications` пользователя.
  - В `user_roles`: удалить роль `seller` для этого `user_id`. Если у пользователя не осталось ни одной роли — добавить `buyer`.
- Возвращает `{ success: true }`.
- Обычные CORS-заголовки.

### 2. UI в `src/pages/Settings.tsx`
Под существующим блоком "Удалить аккаунт" добавить (только если `role === 'seller'`):
```tsx
<div className="pt-4 pb-2 text-center">
  <button
    onClick={() => setRemoveSellerOpen(true)}
    className="text-[11px] text-muted-foreground/70 underline underline-offset-2 hover:text-muted-foreground"
  >
    Перестать быть продавцом
  </button>
</div>
```
Плюс отдельный `<AlertDialog open={removeSellerOpen} onOpenChange={...}>` с текстом-предупреждением: «Будут удалены ваш профиль продавца и все товары. История заказов сохранится. Аккаунт покупателя останется активным. Это действие нельзя отменить.» Кнопка подтверждения — destructive, "Да, удалить".

Хэндлер вызывает `supabase.functions.invoke("delete-seller-account", { headers: { Authorization: Bearer <token> }})`, при успехе:
- `toast.success("Профиль продавца удалён")`
- `window.location.href = "/"` (форс-релоад, чтобы `AuthContext` перечитал роли и UI обновился).

Импорт `useAuth` уже есть — берём `role` оттуда.

### 3. Прочее
- Без миграций БД.
- Без изменений RLS — функция работает под service role.
- `supabase/config.toml` править не нужно (по умолчанию verify_jwt=false, валидация делается в коде через `getUser`).
