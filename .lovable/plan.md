

## План: Исправление проблем Google Search Console для JSON-LD Product

### Проблемы и решения

Google требует дополнительные поля в структурированных данных Product:

1. **brand** — добавить название продавца/фермера как бренд
2. **shippingDetails** — добавить в offers информацию о доставке
3. **hasMerchantReturnPolicy** — добавить политику возврата в offers
4. **review** — добавить до 5 последних отзывов в JSON-LD
5. **aggregateRating** — уже реализовано, но показывается только при наличии отзывов (это ок)

### Изменения

**Файл:** `src/pages/Product.tsx` (только блок `productJsonLd`, строки 456-474)

Расширить JSON-LD объект:

```js
const productJsonLd = product ? {
  "@type": "Product",
  name: product.name,
  description: product.description || undefined,
  image: product.image !== "/placeholder.svg" ? product.image : undefined,
  brand: {
    "@type": "Brand",
    name: product.seller,
  },
  offers: {
    "@type": "Offer",
    price: (displayPrice / 100).toFixed(2),
    priceCurrency: "BYN",
    availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    url: `https://locusfood.by/product/${product.id}`,
    shippingDetails: {
      "@type": "OfferShippingDetails",
      shippingDestination: {
        "@type": "DefinedRegion",
        addressCountry: "BY",
      },
      deliveryTime: {
        "@type": "ShippingDeliveryTime",
        handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "d" },
        transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 3, unitCode: "d" },
      },
    },
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: "BY",
      returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
    },
  },
  ...(displayRating && displayReviewCount > 0 ? {
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: displayRating.toFixed(1),
      reviewCount: displayReviewCount,
    },
  } : {}),
  ...(reviews.length > 0 ? {
    review: reviews.slice(0, 5).map(r => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.userName },
      datePublished: r.createdAt?.split("T")[0],
      reviewRating: {
        "@type": "Rating",
        ratingValue: r.rating,
        bestRating: 5,
      },
      ...(r.text ? { reviewBody: r.text } : {}),
    })),
  } : {}),
} : undefined;
```

### Результат
- `brand` — имя фермера/продавца
- `shippingDetails` — доставка по Беларуси, 1-3 дня
- `hasMerchantReturnPolicy` — возврат не предусмотрен (натуральные продукты)
- `review` — до 5 последних отзывов
- `aggregateRating` — уже есть, без изменений

1 файл, ~30 строк изменено.

