import { memo, useEffect, useState } from "react";
import { ChevronRight, Store, Truck, Wallet, X } from "lucide-react";

interface SellerDeliveryProps {
  deliveryEnabled?: boolean | null;
  deliveryTerms?: string | null;
  pickupEnabled?: boolean | null;
  city?: string | null;
  street?: string | null;
  addressDetails?: string | null;
}

function DetailRow({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-[hsl(var(--seller-deep))]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold leading-tight text-foreground">{title}</p>
        <p className="mt-0.5 whitespace-pre-line text-[12px] leading-snug text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

/** Шторка с полными условиями из кабинета продавца. */
function DeliverySheet({
  open,
  onClose,
  hasCourier,
  hasPickup,
  deliveryTerms,
  pickupAddress,
}: {
  open: boolean;
  onClose: () => void;
  hasCourier: boolean;
  hasPickup: boolean;
  deliveryTerms?: string | null;
  pickupAddress: string;
}) {
  useEffect(() => {
    if (!open) return;
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
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <button type="button" aria-label="Закрыть" onClick={onClose} className="absolute inset-0 bg-black/50" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Условия получения"
        className="relative max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-card pb-[calc(1rem+env(safe-area-inset-bottom,0px))] shadow-2xl"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-border/60 bg-card px-4 py-3">
          <p className="text-[15px] font-bold text-foreground">Условия получения</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          {hasCourier && (
            <DetailRow
              icon={<Truck className="h-4 w-4" />}
              title="Курьер"
              text={deliveryTerms?.trim() || "Стоимость и сроки продавец подтвердит при заказе"}
            />
          )}
          {hasPickup && (
            <DetailRow
              icon={<Store className="h-4 w-4" />}
              title="Самовывоз"
              text={pickupAddress || "Адрес продавец пришлёт после заказа"}
            />
          )}
          <DetailRow
            icon={<Wallet className="h-4 w-4" />}
            title="Оплата при получении"
            text="Наличными курьеру или на месте при самовывозе. Предоплата не нужна."
          />
        </div>

        <div className="px-4 pb-1">
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-full rounded-xl bg-[hsl(var(--seller-deep))] text-[13.5px] font-semibold text-primary-foreground"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Тизер условий получения (44 px) и шторка с полным текстом продавца.
 *
 * В строке только суть: как доставляют и как платить. Длинный текст
 * из кабинета не обрезается на полуслове — он открывается по тапу.
 */
export const SellerDelivery = memo(function SellerDelivery({
  deliveryEnabled,
  deliveryTerms,
  pickupEnabled = true,
  city,
  street,
  addressDetails,
}: SellerDeliveryProps) {
  const [open, setOpen] = useState(false);
  const hasCourier = !!deliveryEnabled;
  const hasPickup = pickupEnabled !== false;
  if (!hasCourier && !hasPickup) return null;

  const pickupAddress = [city?.trim(), street?.trim(), addressDetails?.trim()]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <section className="px-3 pt-1.5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Условия получения"
          className="flex h-11 w-full items-center gap-2.5 rounded-xl bg-card px-3 text-left shadow-sm ring-1 ring-black/[0.04]"
        >
          <span className="flex shrink-0 items-center gap-1 text-[10.5px] font-medium leading-none text-foreground/85">
            {hasCourier ? (
              <>
                <Truck className="h-3.5 w-3.5 text-[hsl(var(--seller-deep))]" />
                Курьер / Почта по РБ
              </>
            ) : (
              <>
                <Store className="h-3.5 w-3.5 text-[hsl(var(--seller-deep))]" />
                Самовывоз
              </>
            )}
          </span>
          <span className="flex min-w-0 shrink items-center gap-1 text-[10.5px] font-medium leading-none text-foreground/85">
            <Wallet className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--seller-deep))]" />
            <span className="truncate">Оплата при получении</span>
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-0.5 text-[10.5px] font-medium text-muted-foreground">
            Условия
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </button>
      </section>

      <DeliverySheet
        open={open}
        onClose={() => setOpen(false)}
        hasCourier={hasCourier}
        hasPickup={hasPickup}
        deliveryTerms={deliveryTerms}
        pickupAddress={pickupAddress}
      />
    </>
  );
});
