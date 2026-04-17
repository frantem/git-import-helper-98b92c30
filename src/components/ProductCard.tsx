import { memo } from "react";
import { ShoppingCart, Star, Heart } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Product } from "@/data/products";
import { useCart } from "@/contexts/CartContext";
import { cn } from "@/lib/utils";
import { formatPrice, calculateOldPrice } from "@/lib/priceUtils";
import { BynSymbol } from "@/components/ui/byn-symbol";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { usePrefetchProduct } from "@/hooks/useProduct";

function formatPrepTime(minutes?: number): { label: string; isInStock: boolean } {
  if (!minutes || minutes === 0) return { label: "В наличии", isInStock: true };
  if (minutes < 60) return { label: `~${minutes}мин.`, isInStock: false };
  const hours = Math.round(minutes / 60);
  return { label: `~${hours}ч.`, isInStock: false };
}

interface ProductCardProps {
  product: Product;
  className?: string;
  isFavorite?: boolean;
  onToggleFavorite?: (productId: string) => void;
  hasRequiredFields?: boolean;
  isLowestPrice?: boolean;
}

export const ProductCard = memo(function ProductCard({
  product,
  className,
  isFavorite = false,
  onToggleFavorite,
  hasRequiredFields = false,
  isLowestPrice = false,
}: ProductCardProps) {
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const prefetchProduct = usePrefetchProduct();

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(product.id);

  const handlePrefetch = () => {
    prefetchProduct(product.id);
  };

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite?.(product.id);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (hasRequiredFields) {
      navigate(`/product/${product.id}?fill_required=true`);
      return;
    }

    if (product.defaultVariant) {
      addToCart(product, product.defaultVariant);
    } else {
      addToCart(product);
    }
  };

  const oldPrice = product.discount ? calculateOldPrice(product.price, product.discount) : null;
  const priceFormatted = formatPrice(product.price);
  const oldPriceFormatted = oldPrice ? formatPrice(oldPrice) : null;

  const showRating = product.rating !== null && product.rating !== undefined && product.rating > 0 && product.reviews > 0;

  return (
    <Link
      to={`/product/${product.id}`}
      onMouseEnter={handlePrefetch}
      onTouchStart={handlePrefetch}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl bg-card shadow-sm transition-shadow hover:shadow-md",
        className
      )}>

      <div className="relative">
        <div className="aspect-square overflow-hidden bg-secondary rounded-t-2xl">
          <OptimizedImage
            src={product.image}
            alt={product.name}
            className="h-full w-full transition-transform duration-300 group-hover:scale-105" />

          {product.isNew && !product.discount &&
          <div className="absolute left-2 top-2 rounded-lg bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">
              NEW
            </div>
          }

          {isUUID && onToggleFavorite &&
          <button
            onClick={toggleFavorite}
            className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm transition-colors bg-transparent"
            aria-label={isFavorite ? "Удалить из избранного" : "Добавить в избранное"}>
              <Heart className={cn("h-4 w-4", isFavorite ? "fill-primary text-[#9ddc09]" : "text-background")} />
            </button>
          }

          {product.discount &&
          <div className="absolute left-0 bottom-0 rounded-tr-lg px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground bg-[#be5c41]">
              -{product.discount}%
            </div>
          }
        </div>

        <button
          onClick={handleAddToCart}
          className="absolute -bottom-2 right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full text-primary-foreground transition-colors active:scale-95 shadow-md bg-[#234835]"
          aria-label="Добавить в корзину">
          <ShoppingCart className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 p-2.5 px-[8px] py-[8px] flex flex-col">
        <h3 className="mb-1 line-clamp-2 text-sm font-medium leading-tight text-foreground">
          {product.name}
        </h3>

        <div>
          <div className="flex items-baseline gap-1">
            <span className={cn("text-base font-bold", isLowestPrice ? "text-[#ff0044]" : "text-foreground")}>
              {priceFormatted.formatted}<BynSymbol />
            </span>
            {product.unit && <span className="text-xs text-muted-foreground">/{product.unit}</span>}
          </div>

          {oldPriceFormatted &&
            <span className="mt-0.5 block text-xs text-muted-foreground line-through">
              {oldPriceFormatted.formatted}<BynSymbol />
            </span>
          }
        </div>
        <div className="mt-auto">
          {(() => {
            const prep = formatPrepTime(product.prep_time_minutes);
            return (
              <span className={cn("block text-[10px] leading-tight", prep.isInStock ? "text-green-600" : "text-muted-foreground")}>
                {prep.label}
              </span>
            );
          })()}

          {showRating &&
            <div className="mt-1 flex items-center my-0 mx-0 py-0 px-0 gap-[4px]">
              <Star className="h-3 w-3 fill-accent text-accent" />
              <span className="text-[11px] font-medium text-foreground">{product.rating.toFixed(1)}</span>
              <span className="text-[10px] text-muted-foreground">({product.reviews})</span>
            </div>
          }
        </div>
      </div>
    </Link>);
});
