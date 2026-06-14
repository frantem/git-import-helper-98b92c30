## Цель

Сделать вход и регистрацию более простыми и логичными:

1. На `/auth` — одна форма входа: поле «Email или телефон» + Пароль + Google + «Забыли пароль» + «Нет аккаунта? Зарегистрируйтесь».
2. Регистрация — один экран ввода номера телефона + SMS-код (без пароля сейчас).
3. Восстановление доступа по телефону — SMS-код → автологин → редирект в `/settings`, где **обязательно** задать новый пароль.
4. Перед оформлением заказа (`/settings?from=cart`) теперь требуем **4 поля**: Имя, Телефон, Email (с кодом подтверждения), Пароль. После сохранения — возврат в `/cart`.

---

## Что меняем

### A) `src/pages/Auth.tsx` — упрощённая форма входа

- Убрать вкладки «Телефон / Email» в режиме `login`. Оставить **одно** поле «Email или телефон» + Пароль.
- Автоопределение: если ввод начинается с `+` или цифры — обращаемся с ним как с телефоном (нормализуем через `formatBYPhone`/`isValidBYPhone`); иначе — email.
- Под полем мелкая подсказка: «Email или номер телефона в формате +375…».
- Кнопка «Войти»:
  - email → `supabase.auth.signInWithPassword({ email, password })` (как сейчас);
  - phone → вызов новой edge-функции `phone-password-login` (см. ниже), которая возвращает `{ access_token, refresh_token }`, далее `supabase.auth.setSession(...)`.
  - Ошибка «пароль не задан» → toast «У этого номера нет пароля. Восстановите доступ» + кнопка «Восстановить».
- Внизу: «Забыли пароль?», «Нет аккаунта? Зарегистрируйтесь», «Войти через Google» (как сейчас).
- В режиме `register` показываем **только** `PhoneAuthForm` (один экран: ввод номера → SMS-код). Сначала вызываем `check-account-exists`:
  - если номер уже занят → показать алерт «Аккаунт с этим номером уже есть. Восстановить доступ?» → «Да» переключает state в режим «recovery» — отправляет OTP на тот же номер, после успешного `verify-otp` (автологин) делает `navigate("/settings?reset=password")`.
  - если свободен → текущий flow `send-otp` → `verify-otp` → автологин → `navigate(returnTo || "/profile")`.
- Режим `forgot` оставляем для email; для телефона восстановление идёт через сценарий выше.

### B) Новая Edge-функция `supabase/functions/phone-password-login/index.ts`

Зачем: вход по телефону+паролю без раскрытия фронту виртуального email.

Логика:
1. Принимает `{ phone, password }`, нормализует BY-номер (как в `check-account-exists`).
2. Service-role клиент: ищет `profiles.user_id` по нормализованному телефону (последние 9 цифр).
3. `admin.auth.admin.getUserById(user_id)` → берёт `user.email`.
4. Создаёт обычный клиент с `SUPABASE_ANON_KEY`, вызывает `signInWithPassword({ email, password })`.
5. Возвращает `{ success, access_token, refresh_token }` или `{ error: "Неверный пароль" | "Пароль не задан" | "Аккаунт не найден" }`.
6. CORS + 4xx/5xx коды.

Различение «пароль не задан» vs «неверный пароль»:
- Перед `signInWithPassword` проверяем `profiles.has_password` (новое поле, см. ниже). Если false → `{ error: "no_password" }`.

### C) Миграция БД

- `ALTER TABLE public.profiles ADD COLUMN has_password boolean NOT NULL DEFAULT false;`
- Бэкфилл: `UPDATE profiles SET has_password = true WHERE user_id IN (SELECT id FROM auth.users WHERE encrypted_password IS NOT NULL AND length(encrypted_password) > 0);` — выполняется через service-role SQL внутри миграции.
- RLS на колонку не нужна отдельно (наследует существующие политики `profiles`).

### D) `src/pages/Settings.tsx` — обязательные поля при `?from=cart`

- При `fromCart === true`:
  - Поле Email становится обязательным. Если `user.email` похож на виртуальный (`*@phone.locus` или текущий email не подтверждён) — требуем ввести реальный и подтвердить кодом (используем готовые `send-email-change-code` / `verify-email-change-code`, как в `EmailChangePrompt`).
  - Добавляем поле **«Пароль»** (минимум 6 символов) + повтор. Если `profiles.has_password === false` — поле обязательное. Сохраняется через `supabase.auth.updateUser({ password })`; после успеха `update profiles set has_password=true`.
  - Кнопка «Сохранить» неактивна, пока не заполнены: имя, телефон (верифицирован), email (верифицирован), пароль (если нужен).
  - После успешного сохранения всех 4 полей → `navigate("/cart")`.
- Параметр `?reset=password` (из сценария восстановления по телефону): показываем поверх формы баннер «Задайте новый пароль для входа» и автоматически фокусируем поле пароля; после сохранения — `navigate("/profile")` (или `returnTo` из localStorage).

### E) Мелочи

- `src/components/PhoneAuthForm.tsx`: добавить опциональный пропс `mode: "login" | "register" | "recovery"` для разных текстов кнопок/тостов; в режиме `register` перед `sendCode` вызывать `check-account-exists` и показывать диалог «номер занят → восстановить».
- `src/pages/Cart.tsx`: проверка профиля расширяется — кроме `full_name` и `phone` дополнительно проверяем `has_password` и наличие подтверждённого email; если чего-то нет → `navigate("/settings?from=cart")` (как сейчас).
- `EmailChangePrompt` на странице успеха заказа оставляем как fallback (не критично).

---

## Технические детали

```text
Auth flow (новый):

[/auth login]
  ├─ input: "email или телефон" + пароль
  ├─ detect: phone? → phone-password-login EF → setSession
  │           email? → signInWithPassword
  └─ links: Forgot · Register · Google

[/auth register]
  └─ PhoneAuthForm(register)
       ├─ check-account-exists(phone)
       │    ├─ exists  → confirm dialog "Восстановить?" → PhoneAuthForm(recovery)
       │    └─ free    → send-otp → verify-otp → autologin → /profile
       └─ recovery → send-otp → verify-otp → autologin → /settings?reset=password

[/cart → Оформить заказ]
  └─ if !user → /auth (+ returnTo)
     elif профиль неполный → /settings?from=cart
                                 (имя + телефон + email-OTP + пароль)
     else → /checkout
```

Edge-функции:
- **новая** `phone-password-login` (verify_jwt=false).
- существующие `check-account-exists`, `send-otp`, `verify-otp`, `send-email-change-code`, `verify-email-change-code` — без правок.

БД:
- `profiles.has_password boolean default false` + бэкфилл.

UI:
- Auth.tsx — переписать `login`-секцию и `register`-секцию.
- PhoneAuthForm.tsx — добавить `mode` + проверку занятости.
- Settings.tsx — добавить блок пароля и обязательность Email при `from=cart`; обработка `?reset=password`.

---

## Что НЕ трогаем

- Логику виртуальных email в `verify-otp` (она уже корректна).
- Существующие edge-функции, кроме добавления одной новой.
- Дизайн/токены, footer, банеры, RLS других таблиц.
- Email-восстановление (`forgot`) для email-аккаунтов — остаётся как сейчас.

После твоего «ок» начну с миграции (`has_password`), затем edge-функция, затем правки `Auth.tsx` / `PhoneAuthForm.tsx` / `Settings.tsx` / `Cart.tsx`.