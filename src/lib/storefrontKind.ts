import type { Product } from "@/data/products";

/**
 * Пищевой товар или вещь/крафт — по заполненным пищевым полям.
 * Для одежды и непищевых товаров этих полей нет, поэтому блоки КБЖУ,
 * состава и срока хранения просто не показываем.
 */
export function isFoodProduct(product?: Partial<Product> | null): boolean {
  if (!product) return true;
  return Boolean(
    product.composition ||
      product.shelfLife ||
      product.prep_time_minutes ||
      product.order_lead_time_hours ||
      (product as { calories?: number | null }).calories ||
      (product as { protein?: number | null }).protein ||
      (product as { fat?: number | null }).fat ||
      (product as { carbs?: number | null }).carbs,
  );
}

/** Витрина в основном из вещей: большинство товаров без пищевых полей. */
export function isApparelStore(products: Array<Partial<Product>>): boolean {
  if (!products.length) return false;
  const goodsCount = products.filter((product) => !isFoodProduct(product)).length;
  return goodsCount > products.length / 2;
}
