

## Problem

The delete check in `AdminCategories` counts ALL products linked to the category (including inactive/hidden ones). The catalog only shows `is_active = true` products. So a deactivated product still blocks category deletion, but doesn't appear in the catalog -- confusing the admin.

For the "К 23 февраля" category, there's likely 1 inactive product (or a `product_categories` junction record for a deleted/inactive product) still referencing it.

## Fix

Change `handleDelete` in `AdminCategories.tsx` to:

1. Instead of blocking deletion when products exist, give the admin the option to **force-delete** by unlinking products first
2. When confirmed, remove `product_categories` references and nullify `products.category_id` for that category, then delete the category

### Implementation

**File: `src/pages/admin/AdminCategories.tsx`** -- Update `handleDelete`:

- Keep the product count check
- If products exist, show a confirm dialog: "В этой категории {N} товар(ов). Открепить товары и удалить категорию?"
- If confirmed:
  - `DELETE FROM product_categories WHERE category_id = X`
  - `UPDATE products SET category_id = NULL WHERE category_id = X`
  - `DELETE FROM categories WHERE id = X`
- This safely removes the category without deleting any products

