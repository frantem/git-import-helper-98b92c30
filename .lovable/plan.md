## Что показал Lighthouse

Главные числа (мобильный отчёт по `https://locusfood.by/`):

| Метрика | Значение | Статус |
|---|---|---|
| Performance | 76 | средне |
| LCP | **4.8 s** | плохо (цель < 2.5 s) |
| FCP | 2.5 s | средне |
| TTI | **8.2 s** | плохо |
| TBT | 180 ms | ок |
| CLS | 0.004 | отлично |
| Unused JS | **379 KiB** | проблема |

Что конкретно тормозит (по данным аудита):

1. **Сторонние скрипты** — GTM, gtag и Meta Pixel вместе грузят ~430 KB, из них ~290 KB не используется на главной. Сейчас они откладываются на `load + 2 s`, но всё равно успевают занять main thread и попадают в окно LCP. Один из long task (150 ms) — это `connect.facebook.net/signals/config`.
2. **Шрифт Inter** грузится с `fonts.googleapis.com` — две лишние TLS-сессии и блокирующий CSS-запрос на ранней стадии.
3. **LCP-картинка баннера**. Preload работает только для повторных визитов (URL берётся из localStorage). На первом визите баннер ждёт ответа Supabase → CDN wsrv.nl → отрисовки React.
4. **Chunks `supabase` и `radix`** — грузятся всегда, хотя на главной нужны частично (~65 KB неиспользуемого кода).

## План оптимизации

### 1. Отложить аналитику до первого взаимодействия (самый большой выигрыш)
В `index.html` заменить таймер `setTimeout(loadAnalytics, 2000)` на запуск по первому из событий: `pointerdown`, `keydown`, `scroll`, `visibilitychange`, либо `requestIdleCallback` с фолбэком на 5 s. Это убирает GTM/gtag/FB Pixel из окна LCP/TTI полностью для пользователей, которые ещё не успели тапнуть.

`fbq('track', 'PageView')` уже дублируется через CAPI на сервере (видно в логах), так что задержка пикселя не ломает атрибуцию.

### 2. Self-host Inter
Убрать `<link>` на `fonts.googleapis.com` и `fonts.gstatic.com`. Подключить Inter через `@fontsource/inter` (weights 400/500/600/700) в `src/main.tsx`, добавить `font-display: swap`. Это:
- убирает 2 preconnect + 1 блокирующий CSS на старте,
- шрифт обслуживается с того же домена под immutable-кешем (уже настроено в nginx).

### 3. Преload LCP-баннера на первом визите
Сейчас preload работает только если URL уже лежит в localStorage. Добавить fallback: в nginx-конфиг **(вне зоны Lovable, оставлю как заметку)** либо проще — в Edge Function `prerender` уже отдаётся полный HTML; для обычных пользователей сделать «оптимистичный» preload первого баннера по детерминированному пути.

Минимально-инвазивный вариант, который можно сделать в репозитории: в `BannerCarousel` дополнительно сохранять `image` баннера сразу при первом ответе React Query (а не только в `useEffect`), и в `useBanners` использовать `placeholderData` из localStorage, чтобы Banner Carousel рендерился без ожидания сети.

### 4. Добавить `fetchpriority="high"` к первой картинке + явные размеры
Уже стоит `fetchPriority="high"` и `width/height` — оставляем. Дополнительно добавить `<img>` (а не div-обёртку) в LCP-слот, чтобы браузер раньше засёк её приоритет; `OptimizedImage` обёрнут `<div>` — это не мешает LCP, но уберём лишний враппер для первого баннера.

### 5. Урезать `supabase` и `radix` чанки
- В `vite.config.ts` разнести `@supabase/supabase-js` отдельно от вспомогательных модулей — на главной нужен только `auth` + `from`, остальное лениво.
- Для `radix`: вынести `@radix-ui/react-dialog`, `dropdown-menu`, `popover`, `select`, `tabs` в отдельные чанки и грузить только там, где открываются (через `React.lazy` обёртки в местах использования: Header dropdown, лайтбокс, чекаут).

### 6. Мелочи
- Убрать `connect.facebook.net` `<noscript><img>` из `<body>` тоже отложить (он легковесный, но триггерит подключение).
- Удалить уже неиспользуемый `media="print"` фолбэк, т.к. шрифт уйдёт self-host.

## Ожидаемый эффект
- LCP: 4.8 s → ~2.2–2.6 s (preload + отложенная аналитика).
- TTI: 8.2 s → ~3–3.5 s (нет 3rd-party до взаимодействия).
- Unused JS: −250…300 KiB на первой загрузке.

## Файлы, которые поменяем
- `index.html` — отложить аналитику до interaction/idle, убрать Google Fonts.
- `src/main.tsx` — импорт `@fontsource/inter`.
- `package.json` — добавить `@fontsource/inter`.
- `src/components/BannerCarousel.tsx` — placeholder/preload первого баннера.
- `src/hooks/useBanners.ts` — `placeholderData` из localStorage.
- `vite.config.ts` — пересборка `manualChunks`.
- (опционально) `src/components/Header.tsx`, `Checkout.tsx`, `ProductImageLightbox.tsx` — `React.lazy` для тяжёлых Radix-компонентов.

## Чего не трогаю
- Nginx, серверную доставку, дизайн, бизнес-логику.
- Поведение скролл-восстановления.
- Картинки уже идут через wsrv.nl WebP — оставляем.

Скажи, делать всё пакетом или начнём с пунктов 1–2 (это самый быстрый прирост и почти нулевой риск).