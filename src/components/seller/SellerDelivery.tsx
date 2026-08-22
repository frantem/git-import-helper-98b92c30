import { memo } from "react";
import { Link } from "react-router-dom";
import { Truck, ChevronRight } from "lucide-react";

interface SellerDeliveryProps {
  note?: string | null;
}

/** Компактная плашка про доставку и самовывоз. */
export const SellerDelivery = memo(function SellerDelivery({ note }: SellerDeliveryProps) {
  const text = note?.trim() || "Доставка по Витебску и самовывоз. Сроки и стоимость — при оформлении заказа.";

  return (
    <section className="mb-6">
      <Link
        to="/delivery"
        className="flex items-center gap-3 rounded-2xl bg-card p-3 transition-colors hover:bg-accent/40"
      >
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[hsl(var(--seller-deep))]">
          <Truck className="h-4 w-4 text-primary-foreground" />
        </span>
        <p className="flex-1 text-[13px] leading-snug text-foreground">{text}</p>
        <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
      </Link>
    </section>
  );
});
