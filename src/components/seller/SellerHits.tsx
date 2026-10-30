import { memo } from "react";
import { cn } from "@/lib/utils";
import { SellerProductCard } from "@/components/seller/SellerProductCard";
import type { Product } from "@/data/products";

interface SellerHitsProps {
  products: Product[];
  /** Товары с обязательными полями — их нужно открыть на странице товара. */
  requiredFieldIds?: Set<string>;
  /** Открыть быстрый просмотр товара, не уходя с витрины. */
  onOpenProduct?: (product: Product) => void;
  /** Ближайший день выдачи по товару: id → «Сегодня» / «Завтра» / дата. */
  pickupLabels?: Map<string, string>;
}

/**
 * Блок «Хиты продаж» — те же карточки, что и в каталоге.
 *
 * На телефоне это горизонтальная лента с прилипанием: покупка в один тап
 * и счётчик количества работают одинаково в обоих блоках.
 */
export const SellerHits = memo(function SellerHits({ products, requiredFieldIds, onOpenProduct, pickupLabels }: SellerHitsProps) {
  if (products.length === 0) return null;

  return (
    <section className="mb-5">
      <h2 className="mb-2 font-sans text-[18px] font-bold tracking-tight text-foreground md:text-2xl">
        Хиты продаж
      </h2>

      <div
        className={cn(
          "-mx-3 grid auto-cols-[45%] grid-flow-col items-stretch gap-2 overflow-x-auto px-3 pb-1 scrollbar-hide md:mx-0 md:auto-cols-auto md:grid-flow-row md:gap-3 md:overflow-visible md:px-0",
          products.length >= 4 ? "md:grid-cols-4" : "md:grid-cols-3",
        )}
      >
        {products.map((product, index) => (
          <SellerProductCard
            key={product.id}
            product={product}
            hasRequiredFields={requiredFieldIds?.has(product.id)}
            pickupLabel={pickupLabels?.get(product.id)}
            priority={index < 2}
            onOpen={onOpenProduct ? () => onOpenProduct(product) : undefined}
            className="snap-start"
          />
        ))}
      </div>
    </section>
  );
});
