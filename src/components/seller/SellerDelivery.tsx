import { memo } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Store, Truck, Wallet } from "lucide-react";

interface SellerDeliveryProps {
  deliveryEnabled?: boolean | null;
  deliveryTerms?: string | null;
  pickupEnabled?: boolean | null;
  city?: string | null;
  street?: string | null;
  addressDetails?: string | null;
}

/** Достаём сумму из свободного текста продавца: «бесплатно от 30 руб.» → «от 30 BYN». */
function pickupAmount(terms?: string | null): string | null {
  const match = terms?.match(/от\s+(\d+(?:[.,]\d+)?)/i);
  return match ? `от ${match[1].replace(".", ",")} BYN` : null;
}

/**
 * Условия получения — одна горизонтальная полоса высотой 44 px.
 *
 * Полный текст продавца и адрес остаются на странице доставки,
 * а под шапкой видны только короткие факты: курьер, самовывоз, оплата.
 */
export const SellerDelivery = memo(function SellerDelivery({
  deliveryEnabled,
  deliveryTerms,
  pickupEnabled = true,
}: SellerDeliveryProps) {
  const hasCourier = !!deliveryEnabled;
  const hasPickup = pickupEnabled !== false;
  if (!hasCourier && !hasPickup) return null;

  const amount = pickupAmount(deliveryTerms);

  return (
    <section className="px-3 pt-1.5">
      <Link
        to="/delivery"
        aria-label="Условия доставки и самовывоза"
        className="flex h-11 items-center gap-2.5 overflow-hidden rounded-xl bg-card px-3 shadow-sm ring-1 ring-black/[0.04]"
      >
        {hasCourier && (
          <span className="inline-flex min-w-0 items-center gap-1 text-[10.5px] font-medium leading-none text-foreground/85">
            <Truck className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--seller-deep))]" />
            <span className="truncate">{amount ? `Курьер ${amount}` : "Курьер"}</span>
          </span>
        )}
        {hasPickup && (
          <span className="inline-flex shrink-0 items-center gap-1 text-[10.5px] font-medium leading-none text-foreground/85">
            <Store className="h-3.5 w-3.5 text-[hsl(var(--seller-deep))]" />
            Самовывоз
          </span>
        )}
        <span className="inline-flex shrink-0 items-center gap-1 text-[10.5px] font-medium leading-none text-foreground/85">
          <Wallet className="h-3.5 w-3.5 text-[hsl(var(--seller-deep))]" />
          Оплата на месте
        </span>
        <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>
    </section>
  );
});
