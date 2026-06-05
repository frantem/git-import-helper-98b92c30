## Цель

Любой пользователь, подающий «Заявку на продавца», обязан иметь реальный Email. Если он зашёл по телефону и у него временный `*@phone.locusfood.by`, форма требует ввести настоящий Email и подтвердить его кодом из письма. После подтверждения Email обновляется **одновременно** в `auth.users` и в `profiles.email` — то есть и как «покупатель», и как «продавец» пользователь будет иметь один и тот же реальный Email.

## Что уже готово (переиспользуем)

Edge-функции уже существуют и делают именно то, что нужно:

- `send-email-change-code` — принимает новый email, проверяет что текущий заканчивается на `@phone.locusfood.by`, шлёт 6-значный код через Resend, сохраняет хэш в `email_change_codes` (rate-limit 60с / 5 в час).
- `verify-email-change-code` — принимает email + код, при успехе:
  - `admin.auth.admin.updateUserById(userId, { email, email_confirm: true })` → реальный email в `auth.users`
  - `admin.from("profiles").update({ email }).eq("user_id", userId)` → синхронизация в `profiles`

Ничего в БД/edge-функциях менять не нужно.

## Изменения в `src/components/SellerApplicationForm.tsx`

1. Добавить новое состояние:
   ```
   emailStep: "input" | "code" | "verified"
   emailFromAuth: boolean         // у юзера уже реальный email
   emailCode: string[4-or-6]       // 6 цифр, как в edge-функции
   isSendingEmailCode, isVerifyingEmailCode, emailResendCountdown
   ```

2. На загрузке (там же где грузится профиль) определить статус Email:
   - Если `!user` → ничего нового (старая ветка регистрации остаётся).
   - Если `user.email` **не** заканчивается на `@phone.locusfood.by` → `emailFromAuth = true`, `emailStep = "verified"`, поле readOnly, бейдж «Используется Email из вашего аккаунта».
   - Иначе → `emailStep = "input"`, показываем обязательное поле «Email *» + кнопку «Получить код».

3. UI блока Email (для залогиненного phone-only):
   - Поле `<Input type="email">` для нового адреса.
   - Кнопка «Получить код» → `supabase.functions.invoke("send-email-change-code", { body: { new_email } })`. На успех → `emailStep = "code"`, запускаем таймер 60с.
   - Экран ввода 6-значного кода (по образцу phone OTP, но 6 ячеек). На полном вводе → `supabase.functions.invoke("verify-email-change-code", { body: { new_email, code } })`. На успех → `emailStep = "verified"`, бейдж «Email подтверждён», поле readOnly.
   - Ссылка «Изменить Email» возвращает на шаг `input`.
   - «Отправить код повторно» через countdown.

4. Блокировка отправки заявки (`submitDisabled` и `handleSubmit`):
   - Добавить условие: для залогиненного пользователя `emailStep !== "verified"` блокирует submit + тост «Подтвердите Email».
   - Гостевая ветка (`!user`) — без изменений.

5. После успешной отправки заявки никакой доп. синхронизации не нужно: `verify-email-change-code` уже обновил и `auth.users`, и `profiles.email`.

## Пограничные случаи

- Email-плейсхолдер у залогиненного: показываем блок ввода даже если `user.email` пустой (на всякий случай).
- Если пользователь вводит email, который уже занят другим аккаунтом — edge-функция вернёт `Этот Email уже используется другим аккаунтом`, показываем как тост.
- Drafts: новый Email не сохраняем в localStorage-черновике (чтобы не утёк), сохраняем только статус ввода.
- После успешного `verify` локально обновляем отображаемый email в форме; при следующем входе `useAuth` подтянет новый `user.email` сам.

## Файлы

- `src/components/SellerApplicationForm.tsx` — единственный изменяемый файл.

Backend, миграции, политики RLS — не трогаем.
