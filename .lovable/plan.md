## План: расширенное отслеживание Meta Pixel + CAPI

### Анализ текущего состояния

**Что уже есть:**

- `index.html` — Pixel 1214375087525107, событие `PageView` (отложено на 2с после load)
- `src/pages/Checkout.tsx` — событие `Purchase` через fbq + CAPI с `eventID` (правильный паттерн дедупликации)
- Edge Function `meta-conversions-api` — поддерживает любое `event_name`, хеширует email/phone, получает IP/UA

**Что нужно добавить:**

- 7 новых событий с дублированием на CAPI
- Хелпер для DRY-вызовов (fbq + CAPI с одним `eventID`)
- Исправление warning'a `PageView` (нужно слать вместе с CAPI и user data)

---

### 1. Новый хелпер `src/lib/metaPixel.ts`

Единая функция `trackMetaEvent(eventName, params?)`:

- Генерирует `eventId = crypto.randomUUID()`
- Вызывает `window.fbq('track', eventName, params, { eventID })` (или `trackCustom` для нестандартных имён)
- Параллельно вызывает `supabase.functions.invoke('meta-conversions-api', { body: { event_name, event_id, ..., event_source_url, user_agent, user_data } })`
- Подтягивает email/phone текущего пользователя из `useAuth` (через отдельный модульный setter, либо параметром) → улучшает Match Quality (это и закроет warning у `PageView`)
- Логирует `console.log('[Meta Pixel] Event sent:', eventName, eventId)` для проверки через Pixel Helper

**Стандартные имена Meta** (используем их вместо кастомных, где возможно — лучше для оптимизации рекламы):


| Запрос пользователя              | Используемое имя                                                        | Тип                               |
| -------------------------------- | ----------------------------------------------------------------------- | --------------------------------- |
| ViewContent                      | `ViewContent`                                                           | стандарт                          |
| AddToCart (глобально)            | `AddToCart`                                                             | стандарт                          |
| ToTheRegistration (К оформлению) | `InitiateCheckout`                                                      | стандарт (правильный термин Meta) |
| logInViaGoogle                   | `Lead` + параметр `method: 'google'`                                    | стандарт                          |
| Registration                     | `CompleteRegistration`                                                  | стандарт                          |
| Home delivery                    | `AddPaymentInfo` + `delivery: 'courier'` (или кастомное `HomeDelivery`) | —                                 |
| Pickup                           | `AddPaymentInfo` + `delivery: 'self'` (или кастомное `Pickup`)          | —                                 |


**Уточнение нужно:** оставить названия как просил пользователь буквально (`logInViaGoogle`, `HomeDelivery`, `Pickup`, `ToTheRegistration` через `trackCustom`) или использовать стандартные имена Meta (`Lead`, `InitiateCheckout`, `AddPaymentInfo`)? **Решение по умолчанию** — использовать стандартные имена Meta (лучше для алгоритма оптимизации)!

---

### 2. Обновление компонентов

`**index.html**` — оставляем `PageView` как есть (он стреляет один раз при загрузке скрипта). Дополнительно из `App.tsx` будем вызывать `trackMetaEvent('PageView')` через CAPI с user data на каждой смене роута — это закроет warning «Рекомендуется обновление» (Match Quality).

`**src/App.tsx**` (или новый `<MetaPageTracker />` внутри `<BrowserRouter>`):

- Слушает изменения `useLocation()` → отправляет `PageView` через CAPI (не через fbq, чтобы не дублировать первый pixel-вызов; eventID привязан к URL+timestamp).

`**src/pages/Product.tsx**` — `useEffect` при загрузке product:

```ts
trackMetaEvent('ViewContent', {
  content_ids: [product.id],
  content_name: product.name,
  content_type: 'product',
  value: product.price / 100,
  currency: 'BYN',
});
```

`**src/contexts/CartContext.tsx**` — внутри `addToCart`:

```ts
trackMetaEvent('AddToCart', {
  content_ids: [product.id],
  content_name: product.name,
  value: (variant?.price ?? product.price) / 100,
  currency: 'BYN',
});
```

Это **глобально** покрывает любые кнопки добавления (ProductCard, ProductPage, любые будущие места) без хрупкого `document.addEventListener('click', ...)`. Глобальный click-listener по тексту кнопки — антипаттерн (ломается при i18n, переименованиях, ARIA-кнопках). **Источник истины — функция `addToCart`.**

`**src/pages/Cart.tsx**` — внутри `handleCheckout` перед navigate:

```ts
trackMetaEvent('InitiateCheckout', { value: selectedTotal/100, currency: 'BYN', num_items: selectedCount });
```

`**src/pages/Auth.tsx**`:

- Перед `signInWithOAuth({provider:'google'})` (обе ветки isCustomDomain):
  ```ts
  trackMetaEvent('Lead', { method: 'google', mode });  // mode = 'login' | 'register'
  ```
- В `handleSubmit` после успешной регистрации (`mode === 'register'`, нет error):
  ```ts
  trackMetaEvent('CompleteRegistration', { method: 'email' });
  ```

`**src/pages/Checkout.tsx**` — в `onClick` блоков «Доставка на дом» и «Самовывоз» (строки 757, 771):

```ts
onClick={() => { setDeliveryType("courier"); trackMetaEvent('AddPaymentInfo', { delivery_type: 'home_delivery' }); }}
onClick={() => { setDeliveryType("self"); trackMetaEvent('AddPaymentInfo', { delivery_type: 'pickup' }); }}
```

Существующее `Purchase` рефакторим на использование общего хелпера (та же логика, меньше кода).

---

### 3. Edge Function `meta-conversions-api` — мелкие улучшения

- Уже принимает любое `event_name` ✓
- Добавить поддержку `custom_data` как объекта произвольной формы (сейчас принимает только `value`/`currency`) — чтобы передавать `content_ids`, `content_name`, `delivery_type` и т.п. в Events Manager.
- Это **закроет warning «Рекомендуется обновление»** на `PageView`: причина warning — отсутствие user_data (email, phone) и слабая Match Quality. После прохода `PageView` через CAPI с хешированным email авторизованного пользователя качество вырастет до «Хорошо/Отлично».

---

### 4. Проверка после деплоя

В консоли браузера на каждое действие будет:

```
[Meta Pixel] Event sent: ViewContent <uuid>
[Meta Pixel] CAPI response: {events_received: 1, ...}
```

В Pixel Helper и Events Manager → Тест событий — события появляются в реальном времени, дублируются (browser + server) с одинаковым `event_id` → Meta автоматически дедуплицирует.

---

### Файлы

- **Новый:** `src/lib/metaPixel.ts` — хелпер `trackMetaEvent()`
- **Новый:** `src/components/MetaPageTracker.tsx` — отслеживание PageView на смене роута
- **Изменить:** `src/App.tsx` — подключить `<MetaPageTracker />`
- **Изменить:** `src/pages/Product.tsx` — ViewContent в useEffect
- **Изменить:** `src/contexts/CartContext.tsx` — AddToCart внутри `addToCart`
- **Изменить:** `src/pages/Cart.tsx` — InitiateCheckout
- **Изменить:** `src/pages/Auth.tsx` — Lead (Google) + CompleteRegistration
- **Изменить:** `src/pages/Checkout.tsx` — AddPaymentInfo для двух типов доставки + рефакторинг Purchase на хелпер
- **Изменить:** `supabase/functions/meta-conversions-api/index.ts` — поддержка произвольного `custom_data` объекта

### Уточнение перед началом

**Вопрос:** использовать стандартные имена Meta (`Lead`, `InitiateCheckout`, `CompleteRegistration`, `AddPaymentInfo`) — рекомендуется для оптимизации рекламы; **или** буквально как в ТЗ (`logInViaGoogle`, `ToTheRegistration`, `Registration`, `HomeDelivery`, `Pickup`) через `trackCustom` — менее эффективно для алгоритма Meta, но точно как просил.

По умолчанию иду по варианту со стандартными именами + параметрами-метками. Если хочешь буквально как в ТЗ — напиши «использовать кастомные имена», и я переделаю.  
  
Используй стандартные имена Meta! Мои не используй имена!