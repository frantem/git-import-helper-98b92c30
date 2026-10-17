import { memo, useState } from "react";
import { Minus, Plus, ShoppingCart, Star, Heart } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Product } from "@/data/products";
import { useCart } from "@/contexts/CartContext";
import { cn } from "@/lib/utils";
import { formatPrice, calculateOldPrice } from "@/lib/priceUtils";
import { BynSymbol } from "@/components/ui/byn-symbol";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { usePrefetchProduct } from "@/hooks/useProduct";

function formatPrepTime(prepMinutes?: number, leadHours?: number): { label: string; isInStock: boolean } {
  const totalMinutes = (prepMinutes || 0) + (leadHours || 0) * 60;
  if (totalMinutes === 0) return { label: "В наличии", isInStock: true };
  if (totalMinutes < 60) return { label: `~${totalMinutes}мин.`, isInStock: false };
  const hours = Math.round(totalMinutes / 60);
  if (hours < 24) return { label: `~${hours}ч.`, isInStock: false };
  const days = Math.round(hours / 24);
  return { label: `~${days}дн.`, isInStock: false };
}

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
        "group relative flex flex-col overflow-hidden rounded-2xl bg-card shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
    >
      <div className="relative">
        <div className="aspect-square overflow-hidden rounded-t-2xl bg-secondary">
          <OptimizedImage
            src={product.image}
            alt={product.name}
            preset="card"
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            className="h-full w-full"
          />

          {product.isNew && !product.discount && (
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

      <div className="flex flex-1 flex-col p-2.5">
        <h3 className="mb-1 line-clamp-2 min-h-[2.4em] text-[13px] font-medium leading-snug text-foreground">
          {product.name}
        </h3>

        <div className="mt-0.5">
          <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5">
            <span className={cn("text-[17px] font-bold leading-none", isLowestPrice ? "text-[#d41111]" : "text-foreground")}>
              {priceFormatted.formatted}
              <BynSymbol />
            </span>
            {unitLabel && (
              <span className="rounded-md bg-secondary px-1 py-0.5 text-[9.5px] leading-none text-foreground/70">
                за {unitLabel}
              </span>
            )}
          </div>

          {oldPriceFormatted && (
            <span className="mt-0.5 block text-[10px] text-muted-foreground line-through">
              {oldPriceFormatted.formatted}
              <BynSymbol />
            </span>
          )}
        </div>

        <div className="mt-1">
          {(() => {
            if (pickupLabel) {
              // Дата ближайшего самовывоза приходит как «20.10» — без «с» её читают как цену
              const isDate = /^\d{1,2}\.\d{1,2}$/.test(pickupLabel);
              const label = isDate ? `с ${pickupLabel}` : pickupLabel;
              const isUnavailable = pickupLabel === "Нет в наличии";
              const isFast = pickupLabel === "Сегодня" || pickupLabel === "Завтра";
              return (
                <span
                  className={cn(
                    "block text-[10px] leading-tight",
                    isUnavailable ? "text-[#d41111]" : isFast ? "text-green-700" : "text-foreground/75",
                  )}
                >
                  {label}
                </span>
              );
            }
            const prep = formatPrepTime(product.prep_time_minutes, product.order_lead_time_hours);
            return (
              <span className={cn("block text-[10px] leading-tight", prep.isInStock ? "text-green-700" : "text-foreground/75")}>
                {prep.label}
              </span>
            );
          })()}

          {showRating && (
            <div className="mt-0.5 flex items-center gap-1">
              <Star className="h-2.5 w-2.5 fill-accent text-accent" />
              <span className="text-[10px] font-medium text-foreground">{product.rating.toFixed(1)}</span>
              <span className="text-[9.5px] text-muted-foreground">({product.reviews})</span>
            </div>
          )}
        </div>

        {quantity === 0 ? (
          <button
            onClick={handleAddToCart}
            className={cn(
              "mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-[hsl(var(--seller-deep))] text-[13px] font-semibold text-primary-foreground transition-transform duration-150 active:scale-[0.95]",
              justAdded && "scale-[0.96]",
            )}
          >
            <ShoppingCart className="h-4 w-4" />
            В корзину
          </button>
        ) : (
          <div className="cart-pop mt-2 flex h-9 items-center justify-between rounded-xl border border-[hsl(var(--seller-deep))]/15 bg-[hsl(var(--seller-deep))]/[0.06] px-1">
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
