

## Что показывает Search Console

Это **рекомендуемые поля** для Merchant Listings (расширенные сниппеты товаров с ценами/доставкой/возвратом). Это **warnings, не errors**, страницы индексируются нормально.

### Текущее состояние JSON-LD (`src/pages/Product.tsx`, строки 477–538)

Поля `shippingDetails`, `shippingRate`, `hasMerchantReturnPolicy`, `brand`, `sku`, `productID` **уже присутствуют**. Скорее всего Google ругается по двум причинам:

1. **Старый снимок** — Search Console показывает данные с предыдущего сканирования (до того как мы добавили эти поля в прошлой итерации). Решается через **«Проверить исправление»** в GSC.
2. **Слабые значения** — `MerchantReturnNotPermitted` и нулевая стоимость доставки без явного флага «бесплатная» Google трактует как недостаточные данные.

### Про GTIN

У фермерских/ремесленных продуктов (сулугуни ручной работы, домашний мёд) **физически нет штрихкода GTIN/EAN/UPC** — это нормально. Google рекомендует в этом случае указывать `brand` + `sku/mpn`, что у нас уже сделано. Warning «Не указан GTIN или бренд» останется навсегда для таких товаров — это допустимо, не блокирует индексацию.

## Реализация — улучшаем JSON-LD

### Файл `src/pages/Product.tsx`

**1. `shippingDetails` — явно отметить бесплатную доставку и добавить регион Витебск:**

```ts
shippingDetails: {
  "@type": "OfferShippingDetails",
  shippingRate: {
    "@type": "MonetaryAmount",
    value: "0",
    currency: "BYN",
  },
  shippingDestination: {
    "@type": "DefinedRegion",
    addressCountry: "BY",
    addressRegion: "Витебск",
  },
  deliveryTime: {
    "@type": "ShippingDeliveryTime",
    handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
    transitTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 2, unitCode: "DAY" },
  },
},
```
(`unitCode: "DAY"` вместо `"d"` — корректное UN/CEFACT значение, которое Google валидирует строже.)

**2. `hasMerchantReturnPolicy` — заменить `MerchantReturnNotPermitted` на корректную политику с явными полями (Google требует `merchantReturnDays` либо явный «не принимаем»):**

Для продуктов питания по ст.28 Закона РБ «О защите прав потребителей» возврат надлежащего качества не предусмотрен. Корректный вариант:

```ts
hasMerchantReturnPolicy: {
  "@type": "MerchantReturnPolicy",
  applicableCountry: "BY",
  returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
  merchantReturnLink: "https://locusfood.by/privacy-policy",
},
```

Поле `merchantReturnLink` помогает Google «закрыть» требование к политике.

**3. `brand` — добавить fallback на «Locus», если фермер без имени, и сохранить `@id` для уникальности:**

Оставляем как есть (`brand.name = product.seller`), но добавляем **дополнительный** идентификатор `mpn` = `product.id` (некоторые валидаторы Google принимают `mpn` вместо GTIN):

```ts
"@type": "Product",
name: product.name,
sku: product.id,
mpn: product.id,           // NEW — Manufacturer Part Number, заменяет GTIN
productID: product.id,
category: product.category || undefined,
brand: { "@type": "Brand", name: product.seller },
```

**4. `offers.priceValidUntil`** — Google рекомендует это поле, добавим (год вперёд):

```ts
offers: {
  ...,
  priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  ...
}
```

### Что НЕ меняем

- `SEO.tsx` — корректно оборачивает в `@context: schema.org`.
- Sitemap, canonical — без изменений.
- Не выдумываем фейковый GTIN — это нарушение политик Google и риск санкций.
- Не добавляем поле `gtin` в БД сейчас (большинству фермеров его взять неоткуда). Если в будущем появятся товары с штрихкодом — добавим колонку `products.gtin` и опциональное поле в JSON-LD.

## Что сделать в Search Console после деплоя

1. Открыть отчёт «Данные о товарах продавца».
2. Для каждого warning нажать **«Проверить исправление»**.
3. Через 1–7 дней Google перепроверит:
   - `hasMerchantReturnPolicy` ✓ исчезнет
   - `shippingDetails` / `shippingRate` ✓ исчезнут
   - GTIN/brand — останется как «информационный» warning для товаров без бренда производителя; это нормально для ремесленных товаров.

## Файлы

- `src/pages/Product.tsx` — обновить блок `productJsonLd` (строки 477–538): `mpn`, `priceValidUntil`, `addressRegion`, `unitCode: "DAY"`, `merchantReturnLink`.

