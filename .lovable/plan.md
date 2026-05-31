## Часть 2: ЧПУ-слаги для товаров (SEO)

### Зачем
Сейчас ссылки вида `/product/8f3a-uuid-...` плохо индексируются Google/Яндексом: в URL нет ключевых слов, поэтому страница теряет до 30-40% потенциального ранжирования. Цель — `/product/syr-kachotta-domashniy`, при этом **старые UUID-ссылки продолжают работать** (важно, чтобы не потерять уже проиндексированные страницы и ссылки в письмах/чатах).

### Архитектура (надёжно, с запасом)

```text
БД:    products.slug TEXT (nullable, UNIQUE) + триггер автогенерации
       ↓
Frontend: <Link to={`/product/${product.slug || product.id}`}>
       ↓
Роут:  /product/:idOrSlug  → useProduct сначала по slug, потом по id
       ↓
Canonical: ВСЕГДА указывает на slug-URL (даже если зашли по UUID)
       ↓
Prerender + Sitemap: всегда отдают /product/{slug}
```

### Шаги (каждый — отдельный коммит, можно откатить)

**1. Миграция БД** (`supabase--migration`)
- `ALTER TABLE products ADD COLUMN slug TEXT`
- Функция `generate_product_slug(title)` — транслитерация (сыр → syr), `lower`, замена пробелов на `-`, удаление спецсимволов
- Функция `ensure_unique_slug(base)` — если занят, добавляет `-2`, `-3`...
- Триггер `BEFORE INSERT OR UPDATE OF title` — генерирует slug автоматически при создании или смене названия (только если slug пустой или title менялся)
- Backfill: `UPDATE products SET slug = ensure_unique_slug(generate_product_slug(title)) WHERE slug IS NULL`
- `CREATE UNIQUE INDEX ON products(slug) WHERE slug IS NOT NULL`

**2. Хук `useProduct`** (`src/hooks/useProduct.ts`)
- Принимает `idOrSlug: string`
- UUID-regex → запрос по `id`, иначе по `slug` (с fallback на `id` если не найдено — для устойчивости)

**3. Роутинг и ссылки**
- `App.tsx`: маршрут `/product/:idOrSlug` (переименовать параметр)
- `ProductCard.tsx`, все места с `<Link to={`/product/${id}`}>` → `${product.slug || product.id}`
- `Product.tsx`: если зашли по UUID, а у товара есть slug — `<canonical>` и `og:url` указывают на slug-версию (опционально 301-редирект через `<Navigate replace>`)

**4. Prerender Edge Function** (`supabase/functions/prerender/index.ts`)
- В `productMeta` — принимать и slug, и UUID (как уже работает `sellerMeta`): UUID-regex → `eq('id', ...)`, иначе → `eq('slug', ...)`
- Canonical всегда строится по `slug` (если есть)

**5. Sitemap Edge Function** (`supabase/functions/sitemap/index.ts` + `prerender` generateSitemap)
- Уже частично готово: `prod.slug || prod.id`. Проверить, что в обоих местах одинаково

**6. SEO-мета на странице товара** (`src/pages/Product.tsx` / `SEO.tsx`)
- `<title>`: `{product.title} купить в Витебске — Locus` (уже есть)
- `<link rel="canonical">` → `/product/{slug}`
- При заходе по UUID — `<Navigate to={'/product/' + slug} replace />` для редиректа (это даёт правильный сигнал поисковику)

### Что НЕ ломается
- Все старые UUID-ссылки → отдают тот же товар (хук пробует оба варианта)
- Email-уведомления со старыми ссылками — работают
- Существующие заказы — не трогаем (`order_items.product_id` остаётся UUID)
- Если slug по какой-то причине пустой — fallback на UUID

### Технические детали (для разработчика)
- Транслитерация по ГОСТ 7.79-2000 (упрощённая): а→a, б→b, в→v, ё→yo, ж→zh, ч→ch, ш→sh, щ→sch, ъ→'', ы→y, ь→'', э→e, ю→yu, я→ya
- Лимит длины slug: 80 символов
- Триггер обновляет slug **только если title изменился И пользователь не задал slug вручную** (на будущее: возможность редактировать slug из админки)
- Откат: `DROP TRIGGER` + `ALTER TABLE products DROP COLUMN slug` — фронт продолжит работать на UUID

### После реализации
- Через 1-2 недели Google переиндексирует sitemap → новые URL появятся в выдаче
- В Google Search Console старые UUID-страницы сами уйдут (canonical укажет на slug)
- Опционально позже: добавить slug админке для ручного редактирования

Подтвердите — начну с миграции БД.
