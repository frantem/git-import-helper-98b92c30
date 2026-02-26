import { memo } from "react";
import { ShoppingCart, Star, Heart } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Product } from "@/data/products";
import { useCart } from "@/contexts/CartContext";
import { cn } from "@/lib/utils";
import { formatPrice, calculateOldPrice } from "@/lib/priceUtils";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { usePrefetchProduct } from "@/hooks/useProduct";

interface ProductCardProps {
  product: Product;
  className?: string;
  isFavorite?: boolean;
  onToggleFavorite?: (productId: string) => void;
  hasRequiredFields?: boolean;
}

export const ProductCard = memo(function ProductCard({
  product,
  className,
  isFavorite = false,
  onToggleFavorite,
  hasRequiredFields = false,
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

      <div className="relative aspect-square overflow-hidden bg-secondary">
        <OptimizedImage
          src={product.image}
          alt={product.name}
          className="h-full w-full transition-transform duration-300 group-hover:scale-105" />


        {product.discount &&
        <div className="absolute left-2 top-2 rounded-lg px-2 py-0.5 text-xs font-bold text-destructive-foreground bg-[#f26464]">
            -{product.discount}%
          </div>
        }

        {product.isNew && !product.discount &&
        <div className="absolute left-2 top-2 rounded-lg bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">
            NEW
          </div>
        }

        {isUUID && onToggleFavorite &&
        <button
          onClick={toggleFavorite}
          className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-card/80 backdrop-blur-sm transition-colors hover:bg-card"
          aria-label={isFavorite ? "Удалить из избранного" : "Добавить в избранное"}>

            <Heart className={cn("h-4 w-4", isFavorite ? "fill-primary text-primary" : "text-muted-foreground")} />
          </button>
        }

        <button
          onClick={handleAddToCart}
          className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-tl-2xl text-primary-foreground transition-colors active:scale-95 bg-[#009434]"
          aria-label="Добавить в корзину">

          <ShoppingCart className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-2.5">
        {showRating &&
        <div className="mb-1 flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-accent text-accent" />
            <span className="text-xs font-medium text-foreground">{product.rating.toFixed(1)}</span>
          </div>
        }

        <h3 className="mb-1 line-clamp-2 text-sm font-medium leading-tight text-foreground">
          {product.name}
        </h3>

        <div className="mt-auto">
          <div className="flex items-baseline gap-1">
            <span className="text-base font-bold text-foreground">
              {priceFormatted.rubles}р.
              {priceFormatted.kopecks > 0 &&
              <span className="text-sm"> {priceFormatted.kopecks.toString().padStart(2, "0")}к.</span>
              }
            </span>
            {product.unit && <span className="text-xs text-muted-foreground">/{product.unit}</span>}
          </div>

          {oldPriceFormatted &&
          <span className="text-xs text-muted-foreground line-through">
              {oldPriceFormatted.rubles}р.
              {oldPriceFormatted.kopecks > 0 && ` ${oldPriceFormatted.kopecks.toString().padStart(2, "0")}к.`}
            </span>
          }
        </div>
      </div>
    </Link>);

});