

## Что показывает Search Console

Это **не ошибка индексации**, а предупреждение типа «Missing field» (рекомендуемые, но не обязательные поля) в разделе **Описания товара (Product snippets)**. Страница индексируется нормально, но без `aggregateRating` и `review` Google не показывает звёздочки в выдаче.

Проверка БД:
- Товар «Сулугуни» (`b375cc9c…`) — **0 отзывов** → schema корректно их не содержит → Google ругается.
- Всего 110 активных товаров, отзывы есть только у **25**. У остальных 85 будет та же запись в Search Console.

## Варианты решения

**A. Игнорировать (рекомендуемый по канону Google).** Это warning, не error. Поля `aggregateRating` и `review` обязательны только если они реально есть. Подделывать рейтинг (например, ставить «5.0 / 1 отзыв» по умолчанию) — нарушение [Google Review snippet guidelines](https://developers.google.com/search/docs/appearance/structured-data/review-snippet), за это можно получить ручное действие и потерять расширенные сниппеты вообще для всего сайта.

**B. Переключить тип schema на минимальный, без warning'ов.** Для товаров без отзывов отдавать упрощённую schema: оставить `Product` + `offers`, но также добавить альтернативные обязательные поля, которых сейчас нет (например, `sku`, `gtin`/`mpn` или `productID`). Это не уберёт warning про `review`/`aggregateRating`, но улучшит качество карточки в целом.

**C. Гибридный — то, что я рекомендую сделать сейчас:**
1. Оставить текущую логику (rating/reviews только при их наличии — она корректна).
2. **Добавить `sku` = product.id** — обязательное поле, его сейчас нет.
3. **Добавить `category`** из `categories.name` — улучшает классификацию.
4. На карточке товара уже есть UI «Будь первым, кто оставит отзыв» — убедиться что он работает и стимулирует писать отзывы (это единственный честный способ убрать warning'и).
5. В **Search Console** в отчёте «Описания товара» нажать кнопку «Подтвердить исправление» — после этого Google перестанет регулярно слать уведомления по уже проверенным товарам, оставив только редкие напоминания.

## Реализация (вариант C)

### Файл `src/pages/Product.tsx`

В `productJsonLd` добавить поля:

```ts
const productJsonLd = product ? {
  "@type": "Product",
  name: product.name,
  sku: product.id,                                  // NEW
  productID: product.id,                            // NEW
  category: categoryName || undefined,              // NEW (из categories.name)
  description: product.description || undefined,
  image: ...,
  brand: { "@type": "Brand", name: product.seller },
  offers: { ... },                                  // как есть
  ...(displayRating && displayReviewCount > 0 ? { aggregateRating: ... } : {}),
  ...(reviews.length > 0 ? { review: ... } : {}),
} : undefined;
```

Где взять `categoryName`: из существующего hook `useProduct` (`product.categories.name`) — поле уже фетчится.

### Что НЕ делаем

- Не добавляем фейковый рейтинг «5.0 / 1» по умолчанию — нарушение политик Google, рискуем потерять rich snippets совсем.
- Не убираем условие `displayReviewCount > 0` — пустой `aggregateRating` тоже вызовет warning.
- Не трогаем `sitemap` / `SEO.tsx` / другие страницы.

## Что сделать в Search Console после деплоя

1. Перейти в отчёт «Описания товара» → «Отсутствует поле aggregateRating» → нажать **«Проверить исправление»**. Google перепроверит — для товаров без отзывов warning останется, но будет уже «информационным», не блокирующим. Для товаров с отзывами (25 шт) исчезнет полностью.
2. Долгосрочно — единственный честный способ убрать warning у оставшихся 85 товаров — собрать на них реальные отзывы (письмо после доставки уже работает).

## Файлы

- `src/pages/Product.tsx` — добавить `sku`, `productID`, `category` в `productJsonLd`.

