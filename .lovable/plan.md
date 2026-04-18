## Проблема

Image Transformations (платная Pro-фича) использовать не будем. Сейчас все картинки идут через `/storage/v1/render/image/` → 400 ошибка → fallback на placeholder. Нужно:

1. Откатить трансформации, чтобы картинки вернулись.
2. Найти другие **бесплатные** способы ускорить главную.

## План

### 1. Откатить трансформации (картинки вернутся немедленно)

В `src/components/ui/optimized-image.tsx` убрать `buildSupabaseTransform` и `transformWidth`/`quality` логику. Использовать `src` напрямую. Оставить пропсы `transformWidth`/`quality` опциональными (no-op) — чтобы не ломать вызовы в `BannerCarousel`, `CategoryCircles`, `ProductCard`.

### 2. Бесплатные способы ускорения (что остаётся)

**А. Усилить клиентское сжатие на загрузке** (`src/lib/imageUtils.ts`)
Сейчас сжатие срабатывает только для файлов > 200 KB. Снизить порог, ужесточить параметры по типу:

- **Баннеры** (загружаются в `AdminBanners`): max 1200×600, quality 0.7 → ~80–120 KB вместо 300–500 KB.
- **Категории** (`AdminBlocks`): max 200×200, quality 0.75 → ~10–20 KB.
- **Товары** (`SellerProducts`/`AdminProducts`): max 800×800, quality 0.78 → ~80–150 KB.
Добавить пресеты: `compressImage(file, { preset: 'banner' | 'category' | 'product' | 'avatar' })`.
Эффект применится к **новым** загрузкам. Для существующих — отдельный пункт ниже.

**Б. Пережать существующие изображения (одноразовый скрипт)**
В default-режиме запустить Node-скрипт через `code--exec`: скачать все картинки из бакетов `banners`, `category-images`, `product-images`, пережать через `sharp` в WebP с теми же лимитами и перезалить (с тем же путём). Это уберёт текущие тяжёлые JPG/PNG. Полностью бесплатно, делается один раз.

**В. Preconnect к Supabase Storage** (`index.html`)
Добавить:

```html
<link rel="preconnect" href="https://jxklppwhgmndlivvtxdd.supabase.co" crossorigin>
<link rel="dns-prefetch" href="https://jxklppwhgmndlivvtxdd.supabase.co">
```

Экономит 100–300 мс на первое соединение.

**Г. Native `loading="lazy"` + `decoding="async"**`
Уже стоит в `OptimizedImage`. Убедиться, что **первый баннер** имеет `fetchPriority="high"` и `loading="eager"`, а все остальные — `lazy`. Сейчас вроде так и есть, проверю.

**Д. Отложить `useProductRatings**`
Сейчас рейтинги грузятся вторым запросом сразу после `useProducts`. Перенести в `useEffect` с задержкой ~500 мс или `requestIdleCallback` — карточки отрисуются раньше без звёзд, потом подтянутся. Освобождает сеть на критическом пути LCP.

**Е. Уменьшить количество товаров на главной при первой загрузке**
В блоке "Все товары" сейчас `allBlockLimit=10` дефолт. Это 10 запросов к Storage за картинками одновременно. Снизить дефолт до 6 — пользователь почти не заметит, LCP улучшится.

### 3. Что НЕ делаем

- Image Transformations — отказ пользователя.
- WebP via Supabase render — то же самое, платно.

## Файлы

- `src/components/ui/optimized-image.tsx` — откат трансформаций.
- `src/lib/imageUtils.ts` — пресеты сжатия.
- `src/components/AdminBanners.tsx` / `AdminBlocks.tsx` / `SellerProducts.tsx` / `AdminProducts.tsx` — передавать пресет в `compressImage`.
- `index.html` — preconnect.
- `src/pages/Index.tsx` — `allBlockLimit` дефолт 6.
- `src/hooks/useProducts.ts` — отложить `useProductRatings`.
- **Одноразовый скрипт** (через `code--exec`) — пережать существующие картинки в бакетах через `sharp` → WebP, перезалить.

## Ожидаемый эффект (без Pro)

- Новые загрузки: −60–80% веса (клиентское сжатие пресетами).
- Существующие картинки после пережатия: −50–70% веса.
- LCP: −30–50% (за счёт preconnect, отложенных рейтингов, меньшего числа товаров).
- В сумме главная станет в **2–3× быстрее** без Pro-плана.

## Уточнение

Запускать ли одноразовый скрипт пережатия существующих картинок (пункт Б)? Это даст самый большой эффект, но изменит файлы в Storage (бэкап делать не буду — изначальные останутся под теми же путями, перезапишутся новыми меньшими версиями).  
  
Да делать