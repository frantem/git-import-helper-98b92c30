

## Plan

### 1. Fix category deletion — force-unlink products before deleting

In `handleDeleteCategory` (lines 210-237), instead of blocking deletion when products exist, change the flow to:
- Show a confirmation dialog: "В этой категории есть N товаров. Открепить их и удалить категорию?"
- If confirmed: clear `product_categories` rows and set `products.category_id = null` for that category, then delete the category.

This matches the pattern already documented in the memory for category management.

### 2. Remove product editing from the "Товары" tab

Remove the edit functionality (Pencil button + Dialog + `handleEditProduct` / `handleSaveProduct`) from the Products tab (lines 957-1010). Keep only the read-only product list with the delete button. Also remove the unused product edit state and handlers (`editingProduct`, `productForm`, `handleEditProduct`, `handleSaveProduct`).

The "Товары" tab will become a read-only reference list showing product info and ID (useful for copying IDs into blocks), with only a delete option.

### Files to modify
- `src/pages/admin/AdminBlocks.tsx` — both changes in a single file

