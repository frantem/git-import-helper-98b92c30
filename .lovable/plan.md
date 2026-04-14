
## План: Разрешить выбор фото из галереи (не только камера)

### Проблема
Сейчас у input есть атрибут `capture="environment"` (строка 174), который на мобильных устройствах сразу открывает камеру, не давая выбрать фото из галереи.

### Решение
Убрать атрибут `capture="environment"` из `<input type="file">`. Без этого атрибута мобильный браузер покажет стандартный диалог выбора: камера или галерея.

### Изменение
**Файл:** `src/components/ProductReviews.tsx`

```diff
<input
  ref={fileInputRef}
  type="file"
  accept="image/*"
  multiple
- capture="environment"
  className="hidden"
  onChange={handleFileChange}
/>
```

Одна строка удалена — пользователи смогут выбирать между камерой и галереей.
