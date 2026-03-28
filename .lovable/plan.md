

## Сохранение черновиков форм при сворачивании браузера

### Проблема
На мобильном телефоне при переключении между приложениями (например Chrome → Instagram → Chrome) браузер может выгрузить вкладку из памяти. React-state теряется, и все несохранённые данные в формах `/seller/settings` и `/seller/products` стираются.

### Решение
Создать хук `useDraftState`, который автоматически сохраняет состояние формы в `localStorage` при каждом изменении и при сворачивании браузера. При возврате на страницу — восстанавливает данные из `localStorage`. После успешного сохранения — черновик удаляется.

### Изменения

**1. Новый файл `src/hooks/useDraftState.ts`**

Хук принимает ключ localStorage, текущее состояние и setState. При монтировании восстанавливает сохранённый черновик. При изменении state — записывает в localStorage. Также слушает `pagehide` и `visibilitychange` для гарантированного сохранения при сворачивании.

**2. `src/pages/seller/SellerSettings.tsx`**

- Подключить `useDraftState("seller_settings_draft", settingsForm, setSettingsForm)` после загрузки данных из БД
- После успешного `handleSave` — вызвать `localStorage.removeItem("seller_settings_draft")`

**3. `src/pages/seller/SellerProducts.tsx`**

- Подключить `useDraftState("seller_product_draft", productForm, setProductForm)` когда форма открыта (`showProductForm === true`)
- После успешного сохранения товара — вызвать `localStorage.removeItem("seller_product_draft")`

### Технические детали

```typescript
// src/hooks/useDraftState.ts
export function useDraftState<T extends object>(
  key: string, state: T, setState: React.Dispatch<React.SetStateAction<T>>
) {
  // Restore on mount (only once)
  useEffect(() => {
    const saved = localStorage.getItem(key);
    if (saved) setState(s => ({ ...s, ...JSON.parse(saved) }));
  }, [key]);

  // Save on every change + pagehide/visibilitychange
  useEffect(() => {
    const save = () => localStorage.setItem(key, JSON.stringify(state));
    const onVisChange = () => {
      if (document.visibilityState === "hidden") save();
    };
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", onVisChange);
    save(); // save on every state change
    return () => {
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", onVisChange);
    };
  }, [key, state]);
}
```

Итого: 1 новый файл, 2 изменённых файла, ~30 строк.

