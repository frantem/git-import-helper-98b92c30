## План

### 1. Страница `/delivery` — Правила доставки и возврата
Создать `src/pages/Delivery.tsx` по образцу `PrivacyPolicy.tsx` (Header + PageHeader + карточка `max-w-3xl` с разделами `text-sm leading-relaxed`). Содержимое — дословно из `LOCUS_Правила_доставки_и_возврата.docx` (9 разделов, контакты, реквизиты). SEO: title «Правила доставки и возврата | Locus», canonical `https://locusfood.by/delivery`.

Зарегистрировать lazy-роут `/delivery` в `src/App.tsx`.

### 2. Страница `/cookies` — Политика cookies
Создать `src/pages/CookiesPolicy.tsx` в том же стиле. Содержимое — дословно из `LOCUS_Политика_cookies.docx` (6 разделов). SEO: title «Политика cookies | Locus», canonical `https://locusfood.by/cookies`. Нужна отдельная страница, так как баннер ссылается на «Политику cookies» — этого документа сейчас на сайте нет.

Зарегистрировать lazy-роут `/cookies` в `src/App.tsx`.

### 3. Футер — добавить две ссылки
В `src/components/Footer.tsx` добавить в общую цепочку (рядом с «Политика конфиденциальности», «Публичная оферта», «Условия для продавцов») ещё две: «Доставка и возврат» → `/delivery` и «Cookies» → `/cookies`. Стиль и разделители `·` сохраняются.

### 4. Cookie-баннер
Создать `src/components/CookieBanner.tsx`:
- Тонкая фиксированная полоса внизу экрана (`fixed bottom-0 inset-x-0 z-50`).
- Тёмный фон (`bg-foreground text-background` — даёт тёмное на светлой теме и наоборот, в рамках design tokens), мелкий текст, минималистично.
- Текст: «Мы используем cookies и аналитику для улучшения сервиса. Подробнее — в <Link to="/cookies">Политике cookies</Link>».
- Кнопка «Понятно» (shadcn Button, `size="sm"`).
- При клике пишем `localStorage.setItem('locus-cookies-ack', '1')` и скрываем.
- При монтировании проверяем флаг; если стоит — не рендерим. Чтобы не моргало при SSR/первом рендере и не сдвигало layout, используем `useEffect` для установки `visible`.
- На мобильных учесть нижнюю навигацию: добавить класс `pb-[env(safe-area-inset-bottom)]` и поднять `BottomNavigation` не требуется — баннер исчезает после клика; пока виден, он лежит над `BottomNavigation` (одноразовое неудобство при первом визите, как у крупных сайтов).

Подключить `<CookieBanner />` один раз в `src/App.tsx` внутри `BrowserRouter` рядом с `MetaPageTracker`.

### Что не меняем
- Существующие страницы `/privacy-policy`, `/oferta`, `/seller-terms` не трогаем.
- Никаких новых зависимостей.
- Бизнес-логику, auth, аналитику не меняем.

### Технические детали
- Lazy-импорты новых страниц по образцу остальных в `App.tsx`.
- Все тексты — на русском, дословно из .docx; разметка — `<h2 className="text-base font-bold">`, `<ul className="list-disc pl-5">`, абзацы `<p>`, ссылки через `text-primary hover:underline`.
- Email-ссылки `mailto:support@locusfood.by`.
- localStorage-ключ: `locus-cookies-ack`.
