## Анализ текущего состояния (что замедляет главную)

1. **Изображения отдаются Supabase Storage в полном размере без преобразований.** Баннеры до 1920×1080 ~300–500KB, фото категорий до 400×400, а карточки товаров — оригиналы 1200×1200. На мобильном (390px) это в разы больше необходимого. Supabase поддерживает `?width=...&quality=...` через image transformations — можно сократить вес 5–10×.
2. **Все маршруты импортируются синхронно** в `App.tsx` (Catalog, Checkout, Admin*, Seller*…). Главная грузит JS всех 25 страниц одним бандлом.
3. **Нет code splitting** в `vite.config.ts` (vendor chunks не разделены).
4. **Meta Pixel грузится синхронно в `<head>**` — блокирует парсинг.
5. `**DynamicMeta` делает 3 параллельных запроса к Supabase сразу при загрузке** — favicon/og/verification (значения почти не меняются).
6. `**useVisitorTracking` пишет в `site_visits` сразу при монтировании** (необязательно для рендера).
7. **Skeleton показывается, пока не загрузятся ВСЕ три запроса** (`isLoadingProducts || isLoadingBanners || isLoadingBlocks`). Прогрессивный рендер ускорил бы LCP.
8. `**OptimizedImage` имеет `useState` + двойной `setState` (load/error) на каждой картинке** — на главной это десятки ре-рендеров.
9. **Префетчинг товара срабатывает на `onTouchStart**` — на мобильном тач = старт сетевого запроса, что мешает скроллу.

## План изменений

### 1. Supabase Image Transformations (главный выигрыш)

В `OptimizedImage` добавить опциональный пропс `transformWidth` и автоматически переписывать ссылки `*.supabase.co/storage/...` → `/storage/v1/render/image/...?width=W&quality=Q&resize=cover`. Применить:

- **Баннеры**: `width=800, quality=55` (сейчас можно ~300KB → ~50–80KB) — это и есть «снижение качества баннеров на 30%».
- **Категории**: `width=160, quality=60` (отрисовка 68×68, retina ×2) — резко снижает объём, визуально не заметно.
- **Карточки товара**: `width=400, quality=70` (мобильная сетка 2-в-ряд).
- **Hero/первый баннер** дополнительно `fetchPriority="high"`, остальные `lazy`.

### 2. Lazy-loading маршрутов

В `App.tsx` обернуть `Catalog`, `Product`, `Cart`, `Checkout`, `Profile`, все `Admin*`, все `Seller*`, `Auth`, `Orders`, `Favorites`, `Settings`, `PrivacyPolicy`, `SellerApplication` через `React.lazy` + `<Suspense fallback={null}>`. Главная (`Index`) остаётся eager. Это уменьшит initial JS примерно в 3–5 раз.

### 3. Code-splitting вендоров в Vite

В `vite.config.ts` добавить `build.rollupOptions.output.manualChunks` — вынести `react`, `react-dom`, `react-router-dom`, `@supabase/supabase-js`, `@tanstack/react-query`, Radix UI в отдельные чанки для лучшего кэширования.

### 4. Отложить аналитику

- **Meta Pixel**: вынести инициализацию в `setTimeout(..., 2000)` либо подгружать после `load`-события — сейчас он блокирует HTML парсинг.
- **VisitorTracking**: обернуть `setTimeout(..., 1500)` или `requestIdleCallback`, чтобы не конкурировать с критичными запросами.
- **DynamicMeta**: отложить через `requestIdleCallback` (favicon/og не нужны для первого рендера).

### 5. Прогрессивный рендер главной

Убрать общий `isLoading` гейт. Показывать секции по мере готовности:

- Баннеры → как только есть `banners`
- Категории → как только `categories`
- Блоки товаров → как только `blocks` + `products`
Это улучшит LCP и FCP.

### 6. Минорные оптимизации

- В `ProductCard` убрать `onTouchStart={handlePrefetch}` (оставить только `onMouseEnter` для desktop).
- В `OptimizedImage` убрать внутренний state-skeleton (родитель уже даёт `bg-secondary`); это сократит ре-рендеры. Достаточно нативного `loading="lazy"` + transition.

### 7. Что можно удалить (предложения, без визуальных потерь)

- `**useVisitorTracking**` на главной — убрать (есть Meta Pixel + Google Analytics через GSC). 
- **Анимация `group-hover:scale-105**` в `ProductCard` — на мобильном её не видно, а лишний transform-слой создаёт композитные слои. удалить.
- `**useProductRatings` отдельным запросом** — сейчас рейтинги читаются вторым запросом после products. Можно либо вынести в materialized view/RPC, либо отложить (показывать карточки без рейтинга и подгружать после). Здесь предлагаю отложить (`enabled: products.length > 0` + `staleTime` уже есть, но запрос всё равно идёт сразу).

## Файлы, которые будут изменены

- `src/components/ui/optimized-image.tsx` — поддержка Supabase render API + упрощение
- `src/components/BannerCarousel.tsx` — `transformWidth=800`, quality 55
- `src/components/CategoryCircles.tsx` — `transformWidth=160`
- `src/components/ProductCard.tsx` — `transformWidth=400`, убрать touch-prefetch и hover-scale
- `src/App.tsx` — `React.lazy` + `Suspense` для всех роутов кроме Index
- `src/pages/Index.tsx` — прогрессивный рендер (убрать общий isLoading)
- `src/components/DynamicMeta.tsx` — `requestIdleCallback`
- `src/hooks/useVisitorTracking.ts` — отложить через `requestIdleCallback`
- `index.html` — Meta Pixel `defer` / отложенная инициализация
- `vite.config.ts` — `manualChunks`

## Ожидаемый эффект

- LCP на мобильном: 3–5× быстрее (главное — image transforms + лениво).
- Initial JS bundle: −60–70%.
- Total transferred bytes на главной: с ~2–3 МБ до ~400–700 КБ.

## Уточнение перед реализацией

Подтверди два решения по «удалить»:

1. **Hover-scale** карточек убрать?
2. `**useVisitorTracking**` оставить как есть (просто отложить) или удалить полностью?