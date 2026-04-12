

## Plan: Advanced SEO Infrastructure for Marketplace

### 1. Database Migration

Add columns to `categories` and settings to `app_settings`:

```sql
ALTER TABLE categories ADD COLUMN seo_title text;
ALTER TABLE categories ADD COLUMN seo_description text;
ALTER TABLE categories ADD COLUMN seo_keywords text;

INSERT INTO app_settings (key, value) VALUES
  ('product_title_template', '{name} купить в Витебске — Locus'),
  ('category_title_template', '{name} — натуральные продукты с доставкой в Витебске')
ON CONFLICT DO NOTHING;
```

### 2. SEO.tsx -- JSON-LD + improvements

Extend `SEO` component with a `jsonLd` prop (accepts any object). The component will inject a `<script type="application/ld+json">` tag into `<head>`. Canonical tag logic already exists -- no changes needed there.

### 3. JSON-LD on key pages

**Product.tsx** -- Add `Product` schema:
```json
{ "@type": "Product", "name": "...", "image": "...", "offers": { "price": ... }, "aggregateRating": {...} }
```

**Index.tsx** -- Add `WebSite` + `Organization` schema.

**Catalog.tsx** (category view) -- Add `ItemList` schema with products in the filtered list. Use `seo_title`/`seo_description` from `categories` table if present, otherwise auto-generate.

### 4. Category SEO data flow

- **useCategories.ts**: Add `seo_title`, `seo_description`, `seo_keywords` to the select query.
- **Catalog.tsx**: When a category is selected, use its `seo_title`/`seo_description` for the `<SEO>` component. Fallback: `"{name} — натуральные продукты с доставкой в Витебске"`.
- Set `<h1>` to match `seo_title` when available.

### 5. Admin: Category SEO fields

**AdminCategories.tsx**: Add `seo_title`, `seo_description` fields to the category form dialog. Include them in the save/update logic.

### 6. Admin: SEO Templates tab

**AdminSettings.tsx**: Add a new section "SEO-шаблоны" with inputs for `product_title_template` and `category_title_template`. Fetch/save from `app_settings`.

### 7. Product page template usage

**Product.tsx**: Fetch `product_title_template` from `app_settings` (can use React Query), replace `{name}` placeholder to build the title dynamically instead of hardcoding `"... купить в Витебске — Locus"`.

### 8. Sitemap verification

The existing edge function already queries `products` (by `id`, `updated_at`, `is_active`) and `farmers` (by `id`, `created_at`). Add category pages: query `categories` for active slugs and include `/catalog?category={slug}` URLs. Also add static `/catalog` page if missing.

### 9. robots.txt

Already correct with Sitemap URL pointing to `https://locusfood.by/sitemap.xml`. No changes needed.

### Files changed

| File | Change |
|------|--------|
| Migration SQL | Add 3 columns to `categories`, 2 rows to `app_settings` |
| `src/components/SEO.tsx` | Add `jsonLd` prop, inject LD+JSON script tag |
| `src/pages/Product.tsx` | Build Product JSON-LD, use template from settings |
| `src/pages/Index.tsx` | Add WebSite + Organization JSON-LD |
| `src/pages/Catalog.tsx` | Add ItemList JSON-LD, use category SEO fields, update h1 |
| `src/hooks/useCategories.ts` | Add `seo_title`, `seo_description`, `seo_keywords` to query |
| `src/pages/admin/AdminCategories.tsx` | Add SEO fields to form |
| `src/pages/admin/AdminSettings.tsx` | Add SEO templates section |
| `supabase/functions/sitemap/index.ts` | Add category URLs |

