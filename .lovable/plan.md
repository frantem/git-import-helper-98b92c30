

## План: Улучшить сообщение об ошибке при смене email

### Проблема
Supabase Auth возвращает 422 "A user with this email address has already been registered", но код показывает только общее "Ошибка изменения email" без пояснения причины.

### Решение
**Файл:** `src/pages/Settings.tsx` — в `handleUpdateEmail` показывать конкретное сообщение об ошибке:

```tsx
const handleUpdateEmail = async () => {
  if (!email) { toast.error("Введите email"); return; }
  if (email.trim().toLowerCase() === user?.email?.toLowerCase()) {
    toast.info("Этот email уже используется"); return;
  }

  const { error } = await supabase.auth.updateUser({ email });

  if (error) {
    if (error.message?.includes("already been registered")) {
      toast.error("Этот email уже зарегистрирован в системе");
    } else {
      toast.error("Ошибка изменения email");
    }
  } else {
    toast.success(`Письмо для подтверждения отправлено на ${email}. Проверьте папку «Спам».`);
  }
};
```

1 файл, ~3 строки изменено.

