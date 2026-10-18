import { useEffect, useRef, useState } from "react";
import { Minus, Plus, ShoppingCart, X } from "lucide-react";
import type { Product } from "@/data/products";
import { useCart } from "@/contexts/CartContext";
import { BynSymbol } from "@/components/ui/byn-symbol";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { formatPrice } from "@/lib/priceUtils";
import { cn } from "@/lib/utils";

interface SellerProductSheetProps {
  product: Product | null;
  onClose: () => void;
  /** Имя магазина — контекст, к кому относится товар. */
  farmerName?: string;
}

/**
 * Быстрый просмотр товара прямо на витрине продавца.
 *
 * Покупатель не уходит в маркетплейс: закрывает шторку и остаётся на том же
 * месте каталога. Добавление и количество меняются здесь же, нижняя панель
 * корзины обновляется моментально (общий CartContext).
 */
export function SellerProductSheet({ product, onClose, farmerName }: SellerProductSheetProps) {
  const { items, addToCart, updateQuantity, removeFromCart, getItemKey } = useCart();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    if (!product) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [product, onClose]);

  // Свайп вниз за ручку: панель двигаем через DOM, без ре-рендеров
  useEffect(() => {
    const panel = panelRef.current;
    const handle = handleRef.current;
    if (!product || !panel || !handle) return;
    let startY: number | null = null;

    const onDown = (e: PointerEvent) => {
      startY = e.clientY;
      panel.style.transition = "none";
    };
    const onMove = (e: PointerEvent) => {
      if (startY === null) return;
      const delta = e.clientY - startY;
      if (delta <= 0) return;
      dragRef.current = delta;
      panel.style.transform = `translateY(${delta}px)`;
    };
    const onUp = () => {
      if (startY === null) return;
      const distance = dragRef.current;
      startY = null;
      dragRef.current = 0;
      panel.style.transition = "transform .22s ease-out";
      panel.style.transform = "translateY(0px)";
      if (distance > 80) onCloseRef.current();
    };

    handle.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      handle.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [product]);

  if (!product) return null;

  const cartItem = items.find((item) => item.product.id === product.id);
  const quantity = cartItem?.quantity ?? 0;
  const itemKey = cartItem ? getItemKey(cartItem) : null;
  const price = cartItem?.variant?.price ?? product.price;
  const oldPrice = product.oldPrice && product.oldPrice > price ? product.oldPrice : null;

  const handleAdd = () => {
    if (product.defaultVariant) addToCart(product, product.defaultVariant);
    else addToCart(product);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 320);
  };

  const facts = [
    product.unit ? { label: "Фасовка", value: product.unit } : null,
    product.composition?.trim() ? { label: "Состав", value: product.composition.trim() } : null,
    product.shelfLife?.trim() ? { label: "Срок хранения", value: product.shelfLife.trim() } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <button type="button" aria-label="Закрыть" onClick={onClose} className="absolute inset-0 bg-black/55" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={product.name}
        ref={panelRef}
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-card shadow-2xl"
      >
        <div
          ref={handleRef}
          aria-label="Потяните вниз, чтобы закрыть"
          className="absolute inset-x-0 top-0 z-10 flex h-9 cursor-grab touch-none justify-center pt-2 active:cursor-grabbing"
        >
          <span className="h-1 w-10 rounded-full bg-white/80 shadow" />
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="overflow-y-auto overscroll-contain pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
          <div className="aspect-[4/3] w-full overflow-hidden bg-secondary">
            <OptimizedImage src={product.image} alt={product.name} preset="detail" className="h-full w-full" />
          </div>

          <div className="px-4 pt-3">
            {product.categoryName && (
              <p className="mb-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
                {product.categoryName}
              </p>
            )}
            <h2 className="text-[19px] font-bold leading-tight text-foreground">{product.name}</h2>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-[24px] font-bold leading-none text-foreground">
                {formatPrice(price).formatted}
                <BynSymbol className="ml-1 inline-block h-3.5 w-3.5 align-baseline" />
              </span>
              {oldPrice && (
                <span className="ml-1 text-[12px] text-muted-foreground line-through">
                  {formatPrice(oldPrice).formatted}
                </span>
              )}
            </div>

            {!product.inStock && (
              <p className="mt-2 inline-flex rounded-lg bg-secondary px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                Распродано
              </p>
            )}

            {facts.length > 0 && (
              <dl className="mt-3 divide-y divide-border/60 rounded-xl bg-secondary/60 px-3">
                {facts.map((fact) => (
                  <div key={fact.label} className="flex gap-3 py-2">
                    <dt className="w-[104px] shrink-0 text-[11.5px] text-muted-foreground">{fact.label}</dt>
                    <dd className="min-w-0 flex-1 text-[12.5px] leading-snug text-foreground">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {product.description?.trim() && (
              <div className="mt-3">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Описание
                </p>
                <p className="whitespace-pre-line text-[13px] leading-relaxed text-foreground/90">
                  {product.description.trim()}
                </p>
              </div>
            )}

            {product.warning?.trim() && (
              <p className="mt-3 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] leading-snug text-amber-900">
                {product.warning.trim()}
              </p>
            )}

            {farmerName && (
              <p className="mt-3 text-[11px] text-muted-foreground">Продавец: {farmerName}</p>
            )}
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 border-t border-border/60 bg-card px-3 pb-[calc(0.6rem+env(safe-area-inset-bottom,0px))] pt-2">
          {quantity === 0 ? (
            <button
              type="button"
              onClick={handleAdd}
              disabled={!product.inStock}
              className={cn(
                "flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--seller-deep))] text-[14px] font-bold text-primary-foreground transition-transform active:scale-[0.99] disabled:opacity-50",
                justAdded && "scale-[0.99]",
              )}
            >
              <ShoppingCart className="h-4 w-4" />
              {product.inStock ? "Добавить в корзину" : "Распродано"}
            </button>
          ) : (
            <div className="flex h-12 items-center justify-between rounded-xl bg-[hsl(var(--seller-deep))] px-1.5 text-primary-foreground">
              <button
                type="button"
                aria-label="Уменьшить количество"
                onClick={() => {
                  if (!itemKey) return;
                  if (quantity > 1) updateQuantity(itemKey, quantity - 1);
                  else removeFromCart(itemKey);
                }}
                className="flex h-9 w-11 items-center justify-center rounded-lg active:bg-white/15"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="flex items-baseline gap-1 text-[14px] font-bold">
                {quantity}
                <span className="text-[11px] font-medium opacity-80">в корзине</span>
              </span>
              <button
                type="button"
                aria-label="Увеличить количество"
                onClick={() => itemKey && updateQuantity(itemKey, quantity + 1)}
                className="flex h-9 w-11 items-center justify-center rounded-lg active:bg-white/15"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
