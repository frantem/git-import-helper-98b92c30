

## План: Кнопка «Удалить аккаунт» в /settings

### Подход

Удаление пользователя из `auth.users` требует `service_role` ключ — это нельзя делать на клиенте. Нужна Edge Function.

### Изменения

**1. Edge Function `supabase/functions/delete-account/index.ts`**

- Принимает запрос с JWT токеном пользователя
- Верифицирует пользователя через `supabase.auth.getUser(token)`
- Через service_role клиент вызывает `auth.admin.deleteUser(userId)` — это каскадно удалит профиль и связанные данные (ON DELETE CASCADE)
- CORS для `locusfood.by`

**2. `src/pages/Settings.tsx`**

- Внизу страницы добавить красную секцию «Удалить аккаунт»
- Диалог подтверждения (AlertDialog): «Вы уверены? Все данные будут удалены безвозвратно.»
- При подтверждении: вызов Edge Function, затем очистка сессии и редирект на `/`

### Детали

Edge Function:
```ts
// Извлекает user из JWT, удаляет через admin API
const { data: { user } } = await supabase.auth.getUser(token);
await adminClient.auth.admin.deleteUser(user.id);
```

UI — красная кнопка с AlertDialog внизу Settings:
```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive" className="w-full">Удалить аккаунт</Button>
  </AlertDialogTrigger>
  {/* Подтверждение с предупреждением */}
</AlertDialog>
```

3 файла: 1 Edge Function + Settings.tsx (UI) + Settings.tsx (логика).

