

## Упрощение мобильного интерфейса /admin и /seller

### Проблемы сейчас
- Форма товара открывается в модальном окне (Dialog) -- на телефоне скролл прыгает, кнопка закрытия крошечная (16x16px), курсор скачет
- Кнопки удаления/закрытия слишком маленькие (12-16px) -- пальцем не попасть
- Длинная форма товара (КБЖУ, добавки, кастомные поля, варианты) -- бесконечная прокрутка в модалке
- Кнопки действий в заказах ("Подтвердить", "Удалить", "Доставлен") маленькие

### Что будет сделано

**1. Полноэкранная форма товара вместо модалки**

Заменить Dialog на полноэкранный оверлей (fixed inset-0) на мобильных. Форма будет открываться на весь экран как отдельная "страница" внутри компонента:
- Кнопка "Назад" вверху (крупная, 44px+) вместо маленького X
- Нормальная прокрутка без конфликтов с модалкой
- Кнопка "Сохранить" внизу, закрепленная (sticky)

**2. Увеличение всех мелких touch-целей до минимум 44x44px**

Конкретные элементы:
- Кнопки удаления фото товара (X): с `p-0.5` / `h-3 w-3` до `p-2` / `h-5 w-5`
- Кнопки удаления вариантов, добавок, кастомных полей: с `p-1.5` до `min-h-[44px] min-w-[44px] p-2`
- Кнопки удаления опций кастомных полей: с `p-0.5` до `p-2`
- Switch и Pencil/Trash кнопки в списке товаров: уже `size="icon"` (40px) -- оставить
- Кнопки в заказах продавца ("Собран"): оставить как есть (уже нормальные)

**3. Убрать визуальные излишества**

- Убрать `transition-colors`, `hover:bg-secondary` анимации с карточек админ-панели
- Убрать `hover:bg-destructive/10` с кнопок удаления -- оставить простые цвета
- Упростить стили -- без лишних визуальных эффектов

**4. Улучшение кнопок в AdminOrders**

- Кнопки "Подтвердить", "Удалить", "Доставлен": с `size="sm"` (h-9) до обычного `size="default"` (h-10) для удобного нажатия
- Кнопка "Назад" (стрелка): с `size="icon"` до более крупной зоны нажатия

**5. PickupSettingsSection -- увеличение элементов**

- SelectTrigger для времени: с `w-24 h-8 text-xs` до `w-28 h-10 text-sm`
- Checkbox зона нажатия: увеличить label padding

### Файлы которые будут изменены

1. **src/pages/SellerDashboard.tsx** -- основные изменения:
   - Заменить Dialog на полноэкранный оверлей для формы товара
   - Увеличить все мелкие кнопки удаления (X)
   - Убрать hover-анимации

2. **src/pages/Admin.tsx** -- убрать hover-анимации с карточек, упростить стили

3. **src/pages/admin/AdminOrders.tsx** -- увеличить кнопки действий, кнопку "Назад"

4. **src/components/PickupSettingsSection.tsx** -- увеличить селекторы времени и зоны нажатия

### Что НЕ будет затронуто
- Кнопка "Сохранить" внизу форм -- она уже крупная (`w-full`, h-10)
- Кнопка "Добавить" товар -- уже нормального размера
- Табы (Товары/Заказы/Настройки) -- уже удобные
- Логика работы и данные -- только визуальные изменения
- Другие страницы (Checkout, каталог и т.д.)

### Технические детали

**Полноэкранная форма товара (SellerDashboard.tsx)**

Вместо:
```tsx
<Dialog open={showProductForm} onOpenChange={setShowProductForm}>
  <DialogContent className="max-h-[90vh] overflow-y-auto">
    ...form...
  </DialogContent>
</Dialog>
```

Будет:
```tsx
{showProductForm && (
  <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
    <div className="sticky top-0 z-10 bg-background border-b p-3 flex items-center gap-3">
      <button onClick={resetProductForm} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
        <ArrowLeft className="h-6 w-6" />
      </button>
      <h2 className="text-lg font-bold">{editingProduct ? "Редактировать" : "Новый товар"}</h2>
    </div>
    <div className="p-4 pb-24 space-y-4">
      ...form fields...
    </div>
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
      <Button onClick={handleSaveProduct} className="w-full" disabled={isSaving}>
        ...
      </Button>
    </div>
  </div>
)}
```

**Увеличение кнопок удаления**

Все кнопки с иконкой X получат:
```tsx
className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-destructive"
```
Иконки X с `h-3 w-3` станут `h-5 w-5`.

