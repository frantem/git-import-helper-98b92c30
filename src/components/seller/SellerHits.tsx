import { memo } from "react";
import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import type { Product } from "@/data/products";
import { useCart } from "@/contexts/CartContext";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { BynSymbol } from "@/components/ui/byn-symbol";
import { formatPrice } from "@/lib/priceUtils";

interface SellerHitsProps {
  products: Product[];
  /** Товары с обязательными полями — их нужно открыть на странице товара. */
  requiredFieldIds?: Set<string>;
}

/** Блок «Хиты»: 3–4 товара с покупкой в один тап. */
export const SellerHits = memo(function SellerHits({ products, requiredFieldIds }: SellerHitsProps) {
  const { addToCart } = useCart();
  if (products.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-3 font-serif text-lg font-bold text-foreground md:text-2xl">
        Хиты продаж
      </h2>

      <div className="-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-1 scrollbar-hide md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
        {products.map((product) => {
          const price = formatPrice(product.price);
          const needsPage = requiredFieldIds?.has(product.id);
          return (
            <div
              key={product.id}
              className="flex w-[45%] max-w-[190px] flex-shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-card shadow-sm md:w-auto md:max-w-none"
            >
              <Link to={`/product/${product.slug || product.id}`} className="block">
                <div className="aspect-square overflow-hidden bg-secondary">
                  <OptimizedImage
                    src={product.image}
                    alt={product.name}
                    preset="card"
                    loading="lazy"
                    className="h-full w-full"
                  />
                </div>
              </Link>

              <div className="flex flex-1 flex-col p-2">
                <Link
                  to={`/product/${product.slug || product.id}`}
                  className="line-clamp-2 text-[13px] font-medium leading-tight text-foreground"
                >
                  {product.name}
                </Link>

                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-[15px] font-bold text-foreground">
                    {price.formatted}
                    <BynSymbol />
                  </span>
                  {product.unit && (
                    <span className="text-[11px] text-muted-foreground">/{product.unit}</span>
                  )}
                </div>

                {needsPage ? (
                  <Link
                    to={`/product/${product.slug || product.id}?fill_required=true`}
                    className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-[hsl(var(--seller-deep))] py-2 text-[13px] font-medium text-primary-foreground"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    В корзину
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      product.defaultVariant
                        ? addToCart(product, product.defaultVariant)
                        : addToCart(product)
                    }
                    className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-[hsl(var(--seller-deep))] py-2 text-[13px] font-medium text-primary-foreground transition-transform active:scale-95"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    В корзину
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
});
