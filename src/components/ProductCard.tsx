import { memo, useState } from "react";
import { Minus, Plus, ShoppingCart, Heart } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Product } from "@/data/products";
import { useCart } from "@/contexts/CartContext";
import { cn } from "@/lib/utils";
import { formatPrice, calculateOldPrice } from "@/lib/priceUtils";
import { BynSymbol } from "@/components/ui/byn-symbol";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { usePrefetchProduct } from "@/hooks/useProduct";

interface ProductCardProps {
  product: Product;
  className?: string;
  isFavorite?: boolean;
  onToggleFavorite?: (productId: string) => void;
  hasRequiredFields?: boolean;
  isLowestPrice?: boolean;
  pickupLabel?: string;
  /** Mark above-the-fold cards for eager loading + high fetch priority (LCP). */
  priority?: boolean;
}

/**
 * Карточка товара под импульсивную покупку с телефона.
 *
 * Действие — крупная кнопка во всю ширину карточки (палец попадает без
 * прицеливания). После первого добавления кнопка превращается в счётчик
 * «− 1 +», поэтому количество меняется прямо в каталоге.
 */
export const ProductCard = memo(function ProductCard({
  product,
  className,
  isFavorite = false,
  onToggleFavorite,
  hasRequiredFields = false,
  isLowestPrice = false,
  pickupLabel,
  priority = false,
}: ProductCardProps) {
  const { items, addToCart, updateQuantity, removeFromCart, getItemKey } = useCart();
  const navigate = useNavigate();
  const prefetchProduct = usePrefetchProduct();
  const [justAdded, setJustAdded] = useState(false);

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(product.id);

  const cartItem = items.find((item) => item.product.id === product.id);
  const quantity = cartItem?.quantity ?? 0;
  const itemKey = cartItem ? getItemKey(cartItem) : null;

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite?.(product.id);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (hasRequiredFields) {
      saveAnchor();
      navigate(`/product/${product.slug || product.id}?fill_required=true`);
      return;
    }

    if (product.defaultVariant) {
      addToCart(product, product.defaultVariant);
    } else {
      addToCart(product);
    }
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 320);
  };

  const handleDecrease = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!itemKey) return;
    if (quantity <= 1) removeFromCart(itemKey);
    else updateQuantity(itemKey, quantity - 1);
  };

  const handleIncrease = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!itemKey) return;
    updateQuantity(itemKey, quantity + 1);
  };

  const calculatedOld = product.discount ? calculateOldPrice(product.price, product.discount) : null;
  // Данные продавца иногда дают old_price ниже текущей — такую «скидку» не показываем
  const oldPrice = calculatedOld && calculatedOld > product.price ? calculatedOld : null;
  const priceFormatted = formatPrice(product.price);
  const oldPriceFormatted = oldPrice ? formatPrice(oldPrice) : null;

  const showRating =
    product.rating !== null && product.rating !== undefined && product.rating > 0 && product.reviews > 0;

  const unitLabel = product.unit?.replace(/[,\s]+$/, "").trim();
  // Единственный текст статуса, который остаётся: товара нет в наличии
  const isOutOfStock = pickupLabel === "Нет в наличии";

  const saveAnchor = (e?: React.MouseEvent | React.TouchEvent) => {
    try {
      const listUrl = window.location.pathname + window.location.search;
      const el = (e?.currentTarget as HTMLElement) ?? document.querySelector(`[data-product-id="${product.id}"]`);
      const rect = el?.getBoundingClientRect();
      const anchor = {
        productId: product.id,
        scrollY: window.scrollY,
        viewportOffset: rect ? rect.top : 0,
        ts: Date.now(),
      };
      const raw = sessionStorage.getItem("locus:scroll:anchor");
      const all = raw ? JSON.parse(raw) : {};
      all[listUrl] = anchor;
      sessionStorage.setItem("locus:scroll:anchor", JSON.stringify(all));
    } catch {
      /* ignore */
    }
  };

  return (
    <Link
      to={`/product/${product.slug || product.id}`}
      data-product-id={product.id}
      onMouseEnter={() => prefetchProduct(product.id)}
      onClick={saveAnchor}
      onTouchStart={saveAnchor}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl bg-card shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
    >
      <div className="relative">
        <div className="aspect-square overflow-hidden rounded-t-xl bg-secondary">
          <OptimizedImage
            src={product.image}
            alt={product.name}
            preset="card"
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            className="h-full w-full"
          />

          {isOutOfStock && (
            <div className="absolute inset-x-0 bottom-0 bg-foreground/75 py-1 text-center text-[10px] font-semibold text-background">
              Нет в наличии
            </div>
          )}

          {product.isNew && !product.discount && !isOutOfStock && (
            <div className="absolute left-2 top-2 rounded-lg bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
              NEW
            </div>
          )}

          {isUUID && onToggleFavorite && (
            <button
              onClick={toggleFavorite}
              className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/15 backdrop-blur-sm transition-colors"
              aria-label={isFavorite ? "Удалить из избранного" : "Добавить в избранное"}
            >
              <Heart className={cn("h-3.5 w-3.5", isFavorite ? "fill-primary text-[#9ddc09]" : "text-background")} />
            </button>
          )}

          {product.discount && (
            <div className="absolute bottom-0 left-0 rounded-tr-lg bg-[#be5c41] px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
              -{product.discount}%
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="mt-2 line-clamp-2 text-[14px] font-semibold leading-[1.25] text-foreground">
          {product.name}
        </h3>

        <div className="mt-1 flex items-baseline gap-1.5">
          <span className={cn("shrink-0 whitespace-nowrap text-[16px] font-bold leading-none", isLowestPrice ? "text-[#d41111]" : "text-foreground")}>
            {priceFormatted.formatted}
            <BynSymbol />
          </span>
          {unitLabel && (
            <span className="min-w-0 truncate text-[10px] leading-none text-muted-foreground">за {unitLabel}</span>
          )}
        </div>
        {oldPriceFormatted && (
          <span className="mt-0.5 block text-[10px] leading-none text-muted-foreground line-through">
            {oldPriceFormatted.formatted}
            <BynSymbol />
          </span>
        )}

        {quantity === 0 ? (
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={cn(
              "mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[hsl(var(--seller-deep))] text-[13px] font-semibold text-primary-foreground transition-transform duration-150 active:scale-[0.97]",
              justAdded && "scale-[0.96]",
              isOutOfStock && "pointer-events-none bg-muted text-muted-foreground",
            )}
          >
            {!isOutOfStock && <ShoppingCart className="h-4 w-4" />}
            {isOutOfStock ? "Нет в наличии" : "В корзину"}
          </button>
        ) : (
          <div className="cart-pop mt-2 flex h-9 items-center justify-between rounded-lg border border-[hsl(var(--seller-deep))]/15 bg-[hsl(var(--seller-deep))]/[0.06] px-1">
            <button
              onClick={handleDecrease}
              aria-label="Убрать одну штуку"
              className="flex h-7 w-8 items-center justify-center rounded-lg text-foreground transition-colors active:bg-black/5"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-4 text-center text-[13px] font-bold tabular-nums text-foreground" aria-live="polite">
              {quantity}
            </span>
            <button
              onClick={handleIncrease}
              aria-label="Добавить ещё одну штуку"
              className="flex h-7 w-8 items-center justify-center rounded-lg text-foreground transition-colors active:bg-black/5"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </Link>
  );
});
