

## План: Обработка ошибки "Load failed" при входе

### Проблема
На мобильном Safari запрос `signInWithPassword` к Supabase иногда обрывается с ошибкой "Load failed" (сетевая ошибка fetch). Это не ошибка аутентификации — данные верные, но запрос не дошёл.

### Решение

**Файл:** `src/pages/Auth.tsx`

В `handleSubmit` для режима `login`:
1. Обернуть `signIn` в retry-логику: при ошибке "Load failed" или "Failed to fetch" — автоматически повторить запрос 1 раз с задержкой 1.5 секунды
2. Если повтор тоже не удался — показать понятное сообщение: "Ошибка сети. Проверьте подключение к интернету и попробуйте ещё раз."
3. Аналогично для регистрации

```tsx
// В handleSubmit, режим login:
const isNetworkError = (msg: string) =>
  msg.includes("Load failed") || msg.includes("Failed to fetch") || msg.includes("NetworkError");

if (mode === "login") {
  let { error } = await signIn(email, password);
  
  // Auto-retry once on network errors
  if (error && isNetworkError(error.message)) {
    await new Promise(r => setTimeout(r, 1500));
    const retry = await signIn(email, password);
    error = retry.error;
  }
  
  if (error) {
    if (isNetworkError(error.message)) {
      toast.error("Ошибка сети. Проверьте интернет и попробуйте ещё раз.");
    } else if (error.message.includes("Invalid login credentials")) {
      toast.error("Неверный email или пароль");
    } else {
      toast.error("Ошибка входа: " + error.message);
    }
  } else {
    // success...
  }
}
```

Аналогичная обработка для `register`.

1 файл, ~15 строк изменено.

