## Проблема

Google Search Console сканирует HTML, отданный **bot-prerender** (`supabase/functions/prerender/index.ts`) — именно туда nginx направляет googlebot. На клиентской странице (`src/pages/Product.tsx`) поля уже есть, но в prerender их нет, плюс `seoHelpers.ts` тоже неполный. Поэтому Google видит ошибки.

## Что меняем

### 1. `supabase/functions/prerender/index.ts` — основной фикс (это видит Google)

В `productLd.offers` добавить:

- `shippingDetails` (OfferShippingDetails)
  - `shippingRate`: MonetaryAmount, `value: "6.90"`, `currency: "BYN"` (соответствует фактической цене курьерской доставки на /checkout)
  - `shippingDestination`: DefinedRegion, `addressCountry: "BY"`, `addressRegion: "Витебская область"`
  - `deliveryTime`: handlingTime 0–1 day, transitTime 0–1 day
- `hasMerchantReturnPolicy` (MerchantReturnPolicy)
  - `applicableCountry: "BY"`
  - `returnPolicyCategory: "https://schema.org/MerchantReturnFiniteWindow"`
  - `merchantReturnDays: 14`
  - `returnMethod: "https://schema.org/ReturnByMail"`
  - `returnFees: "https://schema.org/FreeReturn"`
  - `merchantReturnLink: "https://locusfood.by/delivery"`

Гарантировать **brand** (глобальный идентификатор): уже задаётся `SITE_NAME` и перезаписывается `sellerName`. Дополнительно добавить `mpn: product.id` и оставить `sku` для подстраховки.

### 2. `src/lib/seoHelpers.ts` (`productJsonLd`)

Те же поля `shippingDetails` и `hasMerchantReturnPolicy` в `offers`, brand всегда присутствует (fallback на `SITE_NAME` если `sellerName` пуст), добавить `mpn`.

### 3. `src/pages/Product.tsx`

- Заменить `MerchantReturnNotPermitted` на `MerchantReturnFiniteWindow` (14 дней, бесплатно, ссылка `/delivery`) — соответствует реальной политике из страницы «Доставка и возврат».
- Поменять `shippingRate.value` с `"0"` на `"6.90"` (реальная цена курьерской доставки).
- Гарантировать brand fallback на «Locus», если `product.seller` пуст.

## После деплоя

Edge-функцию `prerender` нужно задеплоить (она на стороне Supabase). После этого попросить пересканировать страницу в Search Console — ошибки исчезнут.

## Не трогаем

- Бизнес-логику корзины/чекаута.
- Структуру БД.
- UI страниц.
