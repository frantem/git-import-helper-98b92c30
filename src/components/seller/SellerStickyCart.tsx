import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/priceUtils";
import { BynSymbol } from "@/components/ui/byn-symbol";

function pluralItems(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "товар";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "товара";
  return "товаров";
}

/**
 * Плавающая панель корзины.
 *
 * Появляется, как только в корзине есть товар этого продавца, и держится
 * над нижней навигацией. Один тап — сразу оформление, без возврата наверх
 * к иконке корзины.
 */
export function SellerStickyCart({ farmerId }: { farmerId: string }) {
  const { totalItems, totalPrice, cartFarmerId } = useCart();
  const visible = cartFarmerId === farmerId && totalItems > 0;

  if (!visible) return null;

  const price = formatPrice(totalPrice);

  return (
    <>
      {/* Отступ, чтобы панель не перекрывала конец страницы */}
      <div aria-hidden className="h-16 md:h-20" />
      <div className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom,0px))] z-40 px-3 pb-2 md:bottom-5 md:pb-0">
        <Link
          to="/checkout"
          className="sticky-cart-in flex items-center gap-3 rounded-2xl bg-[hsl(var(--seller-deep))] px-4 py-2.5 text-primary-foreground shadow-[0_10px_30px_-8px_rgba(0,0,0,0.45)] transition-transform active:scale-[0.99] md:mx-auto md:max-w-xl"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-bold leading-tight">Оформить заказ</span>
            <span className="mt-0.5 block truncate text-[11.5px] text-primary-foreground/75">
              {totalItems} {pluralItems(totalItems)} на {price.formatted}
              <BynSymbol className="ml-0.5 inline-block h-2.5 w-2.5 align-baseline" />
            </span>
          </span>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--seller-accent))] text-[hsl(var(--seller-accent-foreground))]">
            <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </div>
    </>
  );
}
