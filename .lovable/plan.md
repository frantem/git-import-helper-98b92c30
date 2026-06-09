## Цель

Поднять Performance Score (сейчас 0.69) и устранить главные проблемы из Lighthouse: LCP 7.1s, render-blocking шрифт, перегруз картинок товаров, отложить третьесторонние скрипты, мелкие a11y баги.

## Главные находки отчёта

| Метрика | Значение | Цель |
|---|---|---|
| LCP | 7.1s (0.05) | <2.5s |
| TTI | 11.2s (0.20) | <5s |
| FCP | 2.4s | <1.8s |
| TBT | 220ms | <200ms |
| CLS | 0.004 ✅ | — |

Главные виновники: огромные картинки товаров (`w=800` на мобиле, до 245KB wasted на штуку), render-blocking `@import` Google Fonts (894ms), GTM/GA/FB pixel грузятся синхронно при первом рендере, у первой карточки нет `fetchpriority="high"`.

## Изменения

### 1. Картинки товаров (LCP + image-delivery)
`src/lib/imageCdn.ts`
- Снизить preset `card` с `w:400` до `w:240` (реальный размер карточки на мобиле ~180-200px). На 2x всё равно будет 480px вместо текущих 800px.
- Снизить `q` до 72.
- `banner` — `w:1080` вместо 1200, `q:72`.
- `category` — `w:140 h:140` (на экране ~70px).

`src/components/ProductCard.tsx`
- Принимать prop `priority?: boolean`. Если true → `loading="eager"` + `fetchpriority="high"` + `decoding="async"`. Иначе — текущее `loading="lazy"`.

Места использования (Index/блоки) — пометить первые 2 карточки `priority`.

### 2. Шрифт Inter (render-blocking 894ms)
`src/index.css` — убрать `@import url(... fonts.googleapis.com ...)`.

`index.html` — добавить в `<head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" media="print" onload="this.media='all'" />
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" /></noscript>
```
Так шрифт грузится неблокирующе с `display=swap`, без удара по FCP.

### 3. Отложить GTM и Google Analytics (TBT/unused-JS ~250KB)
`index.html`
- Убрать инлайн-загрузку GTM и `gtag.js` из `<head>`.
- Загружать их в едином `setTimeout(..., 2000)` после `load`, по аналогии с уже сделанным Meta Pixel блоком. Сохранить `dataLayer.push({'gtm.start': ...})` снаппинг — он останется в очереди, GTM подтянет события при инициализации.
- `<noscript>` iframe GTM оставить в `<body>`.

### 4. A11y — кнопки баннер-карусели
`src/components/BannerCarousel.tsx`
- На dot-кнопках добавить `aria-label={`Слайд ${i+1}`}` и `aria-current`.
- Увеличить hit-area до 44×44px: добавить wrapper-padding или `min-w-[44px] min-h-[44px] flex items-center justify-center`, оставив видимый dot прежним.

### 5. Контраст текста на карточке товара
`src/components/ProductCard.tsx`
- Цена-блок (`span.block` под `mt-auto`) использует `text-secondary-foreground` поверх белого — fail. Поменять на `text-foreground` (либо явный `text-zinc-900`) для самой цены; вспомогательные строки оставить `text-muted-foreground` (он проходит контраст на белом).

### 6. Чистка (по мелочи)
- В `imageCdn.ts` для preset `card`/`category` `dpr=2` ограничить максимумом 1.5x, чтобы не запрашивать `w=480` на ретина-моб, где экранный размер 180px — этого достаточно. (Опционально, через `Math.min(dpr,1.75)`.)

## Что НЕ трогаем
- `cumulative-layout-shift` 0.004 — уже отлично.
- Серверные кэш-заголовки nginx — уже стоят на 1y immutable.
- Meta Pixel — он уже отложен правильно.
- `unminified-javascript` — это сторонние GTM/FB, не наш бандл.
- `third-party-cookies` — фундаментально решается только удалением аналитики; оставляем как есть.

## Ожидаемый эффект
- LCP: −3-4s (меньшая картинка + fetchpriority + неблокирующий шрифт).
- TBT: −100-150ms (отложенные GTM/GA).
- Performance Score: 0.69 → ~0.90.
