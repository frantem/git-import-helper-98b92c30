

## SEO-оптимизация для locusfood.by

### 1. Новые файлы

**`src/components/SEO.tsx`** — переиспользуемый компонент, который через `document.title` и DOM-манипуляции с `<meta>` тегами устанавливает title, description, og:title, og:description, og:image, og:type, canonical, и google-site-verification. Без внешних зависимостей (react-helmet не нужен — проект SPA, достаточно useEffect). Загружает дефолтные значения из `app_settings` (seo_default_title, seo_default_description, google_verification) через Supabase и использует их как fallback.

**`supabase/functions/sitemap/index.ts`** — Edge Function, которая генерирует динамический `sitemap.xml`. Запрашивает из БД все активные продукты и фермеров, формирует XML с URL-ами: главная, каталог, `/product/:id`, `/seller/:id`. Исключает /admin, /checkout, /auth, /cart.

### 2. База данных (миграция)

Добавить 3 записи в `app_settings`:
```sql
INSERT INTO app_settings (key, value) VALUES
  ('seo_default_title', 'Locus — Маркетплейс натуральных продуктов с единой доставкой в Беларуси'),
  ('seo_default_description', 'Свежие фермерские продукты с доставкой в Витебске. Овощи, фрукты, мёд, молочные продукты напрямую от производителей.'),
  ('google_verification', '')
ON CONFLICT (key) DO NOTHING;
```

### 3. Изменения в существующих файлах

**`src/pages/Product.tsx`** — добавить `<SEO>` в начало return с title=`{product.name} купить в Витебске — Locus`, description=`{product.description}`, image=`{product.image}`. Название уже в `<h1>` (строка 450). Проверить alt у изображений — уже используется `product.name` (строки 420, 427).

**`src/pages/SellerProfile.tsx`** — добавить `<SEO>` с title=`Фермерское хозяйство {farmer.name} на Locus`.

**`src/pages/Index.tsx`** — добавить `<SEO>` с title=`Locus — Маркетплейс натуральных продуктов с единой доставкой в Беларуси`.

**`src/pages/Catalog.tsx`** — добавить `<SEO>` с title, включающим название текущей категории если есть фильтр.

**`src/components/DynamicMeta.tsx`** — расширить: загружать также `google_verification` и вставлять мета-тег верификации.

**`public/robots.txt`** — обновить: Disallow /admin, /checkout, /auth, /cart. Добавить ссылку на Sitemap.

**`src/pages/admin/AdminSettings.tsx`** — добавить секцию «Global SEO» с 3 полями: Default Meta Title, Default Meta Description, Google Verification Code. Сохранение через те же `app_settings`.

### 4. Semantic HTML

- Product.tsx: `<h1>` уже на месте (строка 450), alt у изображений уже корректный
- Catalog.tsx: проверить заголовки категорий — при необходимости обернуть в `<h2>`

### Итого файлов
- Новые: `src/components/SEO.tsx`, `supabase/functions/sitemap/index.ts`
- Изменённые: `Product.tsx`, `SellerProfile.tsx`, `Index.tsx`, `Catalog.tsx`, `DynamicMeta.tsx`, `AdminSettings.tsx`, `public/robots.txt`
- Миграция: 1 SQL (3 записи в app_settings)

