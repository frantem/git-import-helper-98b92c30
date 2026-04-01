

## Проблема

Хук `useDraftState` на строке 88 сохраняет `productForm` в localStorage и восстанавливает его при каждом открытии формы (`showProductForm = true`). Это вызывает три бага:

1. **Данные не отображаются при редактировании** — `handleEditProduct` загружает данные из БД и записывает их в state, но `useDraftState` тут же перезаписывает их старым черновиком из localStorage
2. **Создаётся копия вместо обновления** — черновик может не содержать `editingProduct`, и при сохранении срабатывает ветка создания нового товара
3. **Данные из прошлой карточки попадают в новую** — черновик от предыдущего редактирования восстанавливается при открытии другой карточки

Корень: `useDraftState` не различает "новый товар" и "редактирование существующего".

## Решение

**Файл: `src/pages/seller/SellerProducts.tsx`**

1. **Включать `useDraftState` только при создании нового товара** (строка 88):
```tsx
// Было:
useDraftState("seller_product_draft", productForm, setProductForm, showProductForm);

// Станет:
useDraftState("seller_product_draft", productForm, setProductForm, showProductForm && !editingProduct);
```

2. **Очищать черновик при открытии редактирования** — в `handleEditProduct` (строка 278) добавить `clearDraft("seller_product_draft")` в начало функции, чтобы старый черновик не мог вмешаться.

3. **Очищать черновик при открытии формы нового товара** — в обработчике кнопки "Добавить товар" вызывать `resetProductForm()` перед `setShowProductForm(true)`, чтобы гарантировать чистое начальное состояние.

Итого: 1 файл, ~3 строки изменений.

