## Проблема

Превышен лимит Cached Egress в Supabase (6.87 GB из 5 GB). Причина — на сайт отдаётся одна и та же полноразмерная картинка (≈300–800 KB после нашего сжатия) и в карточку 180×180 px, и на страницу товара, и в Open Graph для соцсетей. Каждый просмотр сетки из 20 карточек = 6–15 MB трафика. При 500 заходах в день = ~5 GB.

Просто «добавить `?width=...&quality=80`» к URL Supabase **не сработает**: image transformations в Supabase Storage — платная функция (от Pro-плана). На текущем free-плане сервер просто игнорирует эти параметры и отдаёт оригинал.

## Решение: бесплатный image-CDN прокси + усиление клиентского сжатия

Подход в два слоя — без потери качества и без оплаты Supabase Pro.

### Слой 1. Прокси-CDN с ресайзом и WebP «на лету» (главный эффект)

Использую **wsrv.nl** (бывший images.weserv.nl) — бесплатный, неограниченный публичный image-resizing CDN от Cloudflare, давно стандарт у небольших проектов. Поддерживает WebP/AVIF, ресайз, кеширование на edge.

Формат URL:
```
https://wsrv.nl/?url=<url-encoded-supabase-url>&w=400&h=400&fit=cover&output=webp&q=78
```

Что даёт:
- Картинка 600 KB JPEG → ~25–40 KB WebP для карточки 400×400.
- Cached Egress из Supabase падает в **10–20 раз**, т.к. wsrv тянет оригинал у Supabase ровно один раз и потом отдаёт со своего CDN.
- Браузер получает WebP/AVIF автоматически, fallback на JPEG для старых.
- При сбое wsrv мы откатываемся на оригинальный Supabase URL (через `onError`).

### Слой 2. Жёстче клиентское сжатие при загрузке (страховка)

В `src/lib/imageUtils.ts` пресет `product` сейчас 800×800 / q=0.78. Снижаю до 1000×1000 / q=0.8 (оригинал чуть крупнее для зума, но ужесточаю порог `skipBelow` до 50 KB), пресет `banner` до q=0.72. Это уменьшает размер «исходника», который wsrv будет тянуть один раз.

## Технические детали

### 1. Новая утилита `src/lib/imageCdn.ts`

```ts
type ImgPreset = "card" | "thumb" | "detail" | "banner" | "category" | "avatar" | "og";

const PRESETS: Record<ImgPreset, { w: number; h?: number; q: number; fit: string }> = {
  thumb:    { w: 120, h: 120, q: 75, fit: "cover" },
  card:     { w: 400, h: 400, q: 78, fit: "cover" },   // ProductCard
  detail:   { w: 900,           q: 82, fit: "inside" }, // Product page main
  banner:   { w: 1200, h: 600,  q: 75, fit: "cover" },
  category: { w: 200, h: 200,  q: 75, fit: "cover" },
  avatar:   { w: 160, h: 160,  q: 78, fit: "cover" },
  og:       { w: 1200, h: 630, q: 80, fit: "cover" },
};

export function cdnImage(src: string | null | undefined, preset: ImgPreset, dpr = 1): string {
  if (!src) return "/placeholder.svg";
  // Не трогаем локальные пути и data:/blob:
  if (src.startsWith("/") || src.startsWith("data:") || src.startsWith("blob:")) return src;
  const cfg = PRESETS[preset];
  const params = new URLSearchParams({
    url: src,
    w: String(Math.round(cfg.w * dpr)),
    q: String(cfg.q),
    fit: cfg.fit,
    output: "webp",
    we: "",        // без увеличения, если оригинал меньше
  });
  if (cfg.h) params.set("h", String(Math.round(cfg.h * dpr)));
  return `https://wsrv.nl/?${params.toString()}`;
}
```

### 2. Доработка `OptimizedImage`

Добавляю реально работающий `preset` и srcset для retina, с graceful fallback на оригинал при ошибке wsrv:

```tsx
<img
  src={cdnImage(src, preset, 1)}
  srcSet={`${cdnImage(src, preset, 1)} 1x, ${cdnImage(src, preset, 2)} 2x`}
  onError={(e) => { e.currentTarget.src = src; }} // fallback на Supabase оригинал
  ...
/>
```

API совместим — старый `transformWidth` остаётся no-op, добавляется `preset?: ImgPreset`.

### 3. Точечная замена в горячих местах (по убыванию трафика)

| Файл | Где | Пресет |
|---|---|---|
| `src/components/ProductCard.tsx` | картинка карточки | `card` |
| `src/pages/Product.tsx` (line 582, 589) | основное фото и галерея | `detail` |
| `src/components/BannerCarousel.tsx` | баннер главной | `banner` |
| `src/components/CategoryCircles.tsx` | круглые категории | `category` |
| `src/pages/Catalog.tsx` (line 203) | категории каталога | `category` |
| `src/pages/SellerProfile.tsx` (line 421) | фото продавца | `thumb` |
| `src/components/DynamicMeta.tsx` / `SEO.tsx` | OG-изображения | `og` |
| `src/pages/Favorites.tsx`, `seller/SellerProducts.tsx`, `admin/AdminProducts.tsx` | списки | `thumb` |

Админские страницы (где фото нужны крупно при редактировании) оставляю как есть — трафик там минимальный.

### 4. Усиление `src/lib/imageUtils.ts`

- `product`: maxWidth 800→700, quality 0.78→0.76 (оригинал в Storage компактнее → меньше платим даже за первый прогрев wsrv).
- `banner`: quality 0.7→0.7, без изменений.
- Avatar/category уже агрессивны — оставляю.

### 5. Что НЕ ломаем

- `OptimizedImage` API остаётся обратно-совместимым: компоненты без `preset` работают как раньше (но без CDN-оптимизации).
- При недоступности wsrv.nl `onError` переключает на исходный Supabase URL — сайт продолжит работать.
- Локальные ассеты (`/placeholder.svg`, `/lovable-uploads/...`) и data-URI не трогаются.
- Существующие картинки в БД не мигрируем — URL остаётся прежним, только рендер меняется.

## Ожидаемый эффект

- Cached Egress Supabase: **−85…−92%** (wsrv забирает оригинал один раз и кеширует на своём CDN).
- Размер карточки в карточной сетке: 300–600 KB → 25–45 KB.
- LCP на главной/каталоге заметно быстрее (особенно на мобильном 4G).
- Никаких изменений в БД, секретах, edge-функциях. Только фронтенд.

## Файлы

Создаю:
- `src/lib/imageCdn.ts`

Меняю:
- `src/components/ui/optimized-image.tsx` (добавляю `preset`, srcset, fallback)
- `src/components/ProductCard.tsx`
- `src/pages/Product.tsx`
- `src/components/BannerCarousel.tsx`
- `src/components/CategoryCircles.tsx`
- `src/pages/Catalog.tsx`
- `src/pages/SellerProfile.tsx`
- `src/pages/Favorites.tsx`
- `src/pages/seller/SellerProducts.tsx`
- `src/pages/admin/AdminProducts.tsx` (только списки)
- `src/components/DynamicMeta.tsx` (og-image)
- `src/lib/imageUtils.ts` (чуть жёстче пресеты)

## Что от вас нужно

Подтвердите план — внедрю. Если не хотите внешний прокси (wsrv.nl) — могу сделать вариант **только со слоем 2** (более жёсткое клиентское сжатие + явные `width/height` атрибуты для браузера), но эффект будет в разы скромнее (~−25%, не −90%).
