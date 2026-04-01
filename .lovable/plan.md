

## Задача

Убрать поле "Подсказка" для типа "Выбор из вариантов" — оно не нужно. Оставить только для текстового поля.

## Изменение

**Файл: `src/pages/seller/SellerProducts.tsx`**, строки 671-672

Обернуть Input с placeholder в условие `field.field_type === "text"`:

```tsx
{field.field_type === "text" && (
  <Input value={field.placeholder || ""} onChange={(e) => { const u = [...customFields]; u[fIndex] = { ...u[fIndex], placeholder: e.target.value }; setCustomFields(u); }}
    placeholder="Подсказка (напр. Напишите до 5 слов)" className="h-9" />
)}
```

Один файл, одна правка.

