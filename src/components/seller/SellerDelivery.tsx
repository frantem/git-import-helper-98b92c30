import { memo } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, ShieldCheck, Store, Truck, Wallet } from "lucide-react";

interface SellerDeliveryProps {
  deliveryEnabled?: boolean | null;
  deliveryTerms?: string | null;
  pickupEnabled?: boolean | null;
  city?: string | null;
  street?: string | null;
  addressDetails?: string | null;
}

/** Одна строка условий: иконка + заголовок + пояснение. */
function Row({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--seller-deep))]/8 text-[hsl(var(--seller-deep))]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold leading-tight text-foreground">{title}</p>
        <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

/**
 * Условия получения — сразу под шапкой, до каталога.
 *
 * Показываем только то, что продавец реально включил в кабинете:
 * курьер, самовывоз и адрес. Суммы не выдумываем — выводим текст продавца.
 */
export const SellerDelivery = memo(function SellerDelivery({
  deliveryEnabled,
  deliveryTerms,
  pickupEnabled = true,
  city,
  street,
  addressDetails,
}: SellerDeliveryProps) {
  const hasCourier = !!deliveryEnabled;
  const hasPickup = pickupEnabled !== false;
  const pickupAddress = [city?.trim(), street?.trim(), addressDetails?.trim()]
    .filter(Boolean)
    .join(", ");

  if (!hasCourier && !hasPickup) return null;

  return (
    <section className="px-3 pt-1.5">
      <div className="rounded-2xl bg-card p-2.5 shadow-sm ring-1 ring-black/[0.04]">
        <div className="space-y-2">
          {hasCourier && (
            <Row
              icon={<Truck className="h-3.5 w-3.5" />}
              title="Курьер"
              text={deliveryTerms?.trim() || "Условия и стоимость доставки уточнит продавец при подтверждении заказа"}
            />
          )}
          {hasPickup && (
            <Row
              icon={<Store className="h-3.5 w-3.5" />}
              title="Самовывоз"
              text={pickupAddress || "Адрес продавец пришлёт после оформления заказа"}
            />
          )}
          <Row
            icon={<Wallet className="h-3.5 w-3.5" />}
            title="Оплата при получении"
            text="Курьеру или на месте — без предоплаты"
          />
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-1.5">
          <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            Проверено Locus
          </span>
          <Link
            to="/delivery"
            className="inline-flex items-center gap-0.5 text-[10.5px] text-muted-foreground hover:text-foreground"
          >
            Подробнее
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </section>
  );
});
