

## Проблема

В `handleSaveProduct` есть критические баги:

1. **Нет `catch` блока** — `try/finally` без `catch`. Если `Promise.all` (варианты, кастомные поля, доп. изображения) падает с ошибкой, продукт уже создан в БД (строка 218), но пользователь не видит сообщения об ошибке и не знает что произошло.

2. **`finally` всегда сбрасывает форму** — даже при ошибке форма очищается (`resetProductForm`, `clearDraft`), пользователь не может исправить и повторить.

3. **Двойное нажатие** — `isSaving` защищает от повторного нажатия, но между кликом и React-рендером с `isSaving=true` может пройти второй клик. Продукт создаётся дважды.

## Решение

**Файл: `src/pages/seller/SellerProducts.tsx`**, функция `handleSaveProduct`

### 1. Добавить `catch` блок
Перехватывать ошибки из `Promise.all` и показывать toast с описанием.

### 2. Сбрасывать форму только при успехе
Перенести `clearDraft` и `resetProductForm` из `finally` в конец успешной ветки (после toast.success).

### 3. Защита от двойного клика через `useRef`
Использовать `useRef` вместо state для мгновенной блокировки повторных вызовов (state обновляется асинхронно).

### Итоговый код (строки 163-239):

```tsx
const savingRef = useRef(false);

const handleSaveProduct = async () => {
  if (!farmerId || savingRef.current) return;
  // ... валидация ...

  savingRef.current = true;
  setIsSaving(true);
  try {
    // ... productData, insert/update ...

    if (editingProduct) {
      // ... update logic (unchanged) ...
      toast.success("Товар обновлён");
    } else {
      const { data: newProduct, error } = await supabase.from("products").insert(productData).select().single();
      if (error) { toast.error("Ошибка при создании товара: " + error.message); return; }
      // ... Promise.all (unchanged) ...
      toast.success("Товар добавлен");
    }

    // Только при успехе:
    clearDraft("seller_product_draft");
    resetProductForm();
  } catch (e: any) {
    toast.error("Ошибка сохранения: " + (e?.message || "неизвестная ошибка"));
  } finally {
    savingRef.current = false;
    setIsSaving(false);
  }
};
```

Один файл, ~10 строк изменений.

