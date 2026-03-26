

## Problem
Product `b3e3aa48-...` cannot be deleted because it has order_items referencing it (foreign key constraint). This is expected — you shouldn't delete products with order history.

## Solution
Instead of hard-deleting, use soft delete: set `is_active = false` when a product has orders. Only hard-delete if no orders reference it.

### Change in `src/pages/seller/SellerProducts.tsx`

Update `handleDeleteProduct` (line 236-244):

1. First, try to delete the product normally
2. If the error is a foreign key violation (`23503`), fall back to deactivating (`is_active = false`) and show a message: "Товар имеет заказы и не может быть удалён. Он был скрыт."
3. Also delete related records (images, variants, categories, addons, custom fields) before attempting product deletion — these don't have order references

```typescript
const handleDeleteProduct = async () => {
  if (!deleteConfirmId || isDeleting) return;
  setIsDeleting(true);
  
  // Clean up related records first
  await Promise.all([
    supabase.from("product_images").delete().eq("product_id", deleteConfirmId),
    supabase.from("product_variants").delete().eq("product_id", deleteConfirmId),
    supabase.from("product_categories").delete().eq("product_id", deleteConfirmId),
    supabase.from("product_addons").delete().eq("product_id", deleteConfirmId),
    (supabase as any).from("product_custom_fields").delete().eq("product_id", deleteConfirmId),
  ]);
  
  const { error } = await supabase.from("products").delete().eq("id", deleteConfirmId);
  
  if (error?.code === "23503") {
    // FK violation — product has orders, soft-delete instead
    await supabase.from("products").update({ is_active: false }).eq("id", deleteConfirmId);
    toast.success("Товар имеет заказы и не может быть полностью удалён. Он был скрыт.");
  } else if (error) {
    toast.error("Ошибка при удалении товара: " + error.message);
  } else {
    toast.success("Товар удалён");
  }
  
  setIsDeleting(false);
  setDeleteConfirmId(null);
  fetchData();
};
```

One function change, one file.

