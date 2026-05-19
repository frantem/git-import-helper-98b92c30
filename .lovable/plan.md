# Почему товары не в индексе Google

## Диагноз (главная причина)

Я проверил, что реально получает Googlebot при заходе на `/product/2a5f3c88-...`:

```
title: "Locus — Маркетплейс натуральных продуктов с доставкой в Витебске"
canonical: https://locusfood.by/
og:url: https://locusfood.by/
```

Это HTML **главной страницы**, а не страницы товара. Nginx правильно отправляет ботов на Edge Function `prerender`, но сам `prerender` падает на товарах и отдаёт fallback на homeMeta.

**Корень проблемы:** в `supabase/functions/prerender/index.ts` запрос к `products` выбирает несуществующие колонки:

```ts
.select("id, title, ..., seo_title, seo_description, slug")
```

Я проверил схему БД: в таблице `public.products` **нет** колонок `slug`, `seo_title`, `seo_description` (есть только у `categories` и `farmers`). Из-за ошибки запроса `product = null` → код падает на `meta = homeMeta()`.

Поэтому Google уже несколько недель видит на всех 120 URL товаров **один и тот же контент главной страницы** — это дубликаты, и поисковик их закономерно не индексирует ("URL неизвестен Google" / "Каноническая страница, выбранная Google: отсутствует").

То же самое касается sitemap-генератора (`supabase/functions/sitemap/index.ts`) — он тоже читает `slug` из `products`.

---

## Что нужно сделать

### 1. Починить prerender для товаров (главное)

В `supabase/functions/prerender/index.ts`, функция `productMeta`:

- Убрать `seo_title, seo_description, slug` из `.select(...)`.
- Убрать ветку поиска по `slug` — товары идентифицируются только по UUID.
- Убрать `product.seo_title` / `product.seo_description` фоллбэки (оставить только генерируемые из `title` и `price`).
- Заменить `product.slug || product.id` на `product.id` во всех канонических ссылках и JSON-LD.

После деплоя проверить:
```
curl -sL -A "Googlebot" https://locusfood.by/product/2a5f3c88-79d3-41e8-ab6c-bf136cd7c613 \
  | grep -E "(<title>|canonical)"
```
Должен прийти настоящий title товара (например, "Страчателла купить в Витебске …") и `canonical` на этот же URL.

### 2. Починить sitemap по той же причине

В `supabase/functions/sitemap/index.ts` убрать `slug` из select и из URL-строки (использовать только `id`). Сейчас sitemap случайно работает, но если у одного товара появится "slug" значение в каком-то поле — упадёт.

### 3. После деплоя — действия в Google Search Console

1. **Sitemaps → удалить старый → добавить заново** `https://locusfood.by/sitemap.xml`. Дождаться статуса "Успешно".
2. **Inspect URL** для 5–10 ключевых товаров (страчателла, главные категории) → **Request Indexing**. Это очередь, реакция 1–7 дней.
3. То же для разделов `/catalog?category=...` и landing-страниц `/vitebsk/...`.

### 4. Дать Google время

Даже после починки prerender индексация молодого домена занимает **2–6 недель**. Первыми зайдут страницы, на которые есть запросы (как `2a5f3c88-...`, который вы инспектировали) и страницы с внутренними ссылками с главной/каталога.

### 5. Что НЕ нужно делать сейчас

- Не добавлять колонки `slug`/`seo_title`/`seo_description` в таблицу `products` — это отдельная фича, не нужна для индексации. Уберём упоминания slug в Edge Functions, и всё заработает на UUID.
- Не трогать nginx — он маршрутизирует ботов правильно.

---

## Технические детали для проверки

- БД проверил: `information_schema.columns` для `products` не содержит `slug`, `seo_title`, `seo_description`.
- Nginx-роутинг работает: title в ответе для Googlebot — `"… с доставкой в Витебске"` (это шаблон из `prerender/homeMeta`), а не статичный `index.html` (`"Маркетплейс локальных продуктов"`).
- Sitemap отдаёт 120 product URL, включая `2a5f3c88-...`, XML валидный.
- robots.txt в порядке, есть директива `Sitemap:`.

После approve — внесу правки в обе Edge Functions и задеплою.
