

## Проблема

В `handleSave` в `SellerSettings.tsx` нет защиты от двойного клика и нет `try/catch`. При быстром повторном нажатии отправляются параллельные запросы, которые конфликтуют. Также `busyDates` и `vacationDates` из компонента Calendar могут содержать `Invalid Date`, что вызывает ошибку при записи в БД.

## Решение

**Файл: `src/pages/seller/SellerSettings.tsx`**

### 1. Добавить `useRef` для блокировки повторных нажатий
```tsx
const savingRef = useRef(false);
```

### 2. Обернуть `handleSave` в try/catch с защитой

```tsx
const handleSave = async () => {
  if (!farmerId || savingRef.current) return;
  savingRef.current = true;

  try {
    // ... валидация slug (без изменений) ...

    const { error } = await supabase.from("farmers").update({...}).eq("id", farmerId);
    if (error) { toast.error("Ошибка при сохранении: " + error.message); return; }

    // Фильтруем невалидные даты
    const validBusy = busyDates.filter(d => !isNaN(d.getTime()));
    const validVacation = vacationDates.filter(d => !isNaN(d.getTime()));

    const { error: profileError } = await supabase.from("profiles").update({
      pickup_slots: pickupSlots,
      max_orders_per_day: maxOrdersPerDay,
      busy_dates: validBusy.map(formatDate),
      vacation_dates: validVacation.map(formatDate),
    }).eq("user_id", user!.id);

    if (profileError) { toast.error("Ошибка сохранения настроек выдачи: " + profileError.message); return; }

    clearDraft("seller_settings_draft");
    toast.success("Настройки сохранены");
  } catch (e: any) {
    toast.error("Ошибка сохранения: " + (e?.message || "неизвестная ошибка"));
  } finally {
    savingRef.current = false;
  }
};
```

### 3. Добавить `disabled` на кнопку "Сохранить"
Добавить state `isSaving` для визуальной блокировки кнопки во время сохранения.

Один файл, ~15 строк изменений.

