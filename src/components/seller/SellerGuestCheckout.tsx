import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, MessageCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/priceUtils";
import { BynSymbol } from "@/components/ui/byn-symbol";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { cleanSellerName } from "@/lib/sellerName";
import { cn } from "@/lib/utils";
import type { SellerContacts } from "@/components/seller/SellerTrustFooter";

type ContactMethod = "call" | "telegram" | "viber" | "whatsapp";
type DeliveryType = "courier" | "self";

interface SellerGuestCheckoutProps {
  farmer: {
    id: string;
    name: string;
    deliveryEnabled?: boolean | null;
    pickupEnabled?: boolean | null;
    city?: string | null;
    street?: string | null;
    addressDetails?: string | null;
    contacts?: SellerContacts | null;
  };
  onClose: () => void;
}

const CONTACTS: { id: ContactMethod; label: string }[] = [
  { id: "call", label: "Звонок" },
  { id: "telegram", label: "Telegram" },
  { id: "viber", label: "Viber" },
  { id: "whatsapp", label: "WhatsApp" },
];

/** 9 цифр после +375 → «+375 29 123-45-67» */
function formatPhone(digits: string) {
  const d = digits.slice(0, 9);
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  if (!parts.length) return "+375 ";
  const [code, a, b, c] = [parts[0], parts[1] ?? "", parts[2] ?? "", parts[3] ?? ""];
  let out = `+375 ${code}`;
  if (a) out += ` ${a}`;
  if (b) out += `-${b}`;
  if (c) out += `-${c}`;
  return out;
}

function errorText(code?: string) {
  switch (code) {
    case "NAME_REQUIRED":
      return "Укажите имя — продавец должен знать, к кому обращаться.";
    case "PHONE_INVALID":
      return "Телефон в формате +375 29 123-45-67.";
    case "ADDRESS_REQUIRED":
      return "Для доставки курьером нужен адрес.";
    case "EMPTY_CART":
      return "Корзина пуста — добавьте товар.";
    case "TOO_MANY_ORDERS":
      return "С этого номера уже оформляли заказ. Подождите 10 минут или напишите продавцу.";
    case "PRODUCT_NOT_FOUND":
    case "PRODUCT_FOREIGN":
      return "Товар изменился — обновите страницу и добавьте его заново.";
    default:
      return "Не получилось отправить заказ. Попробуйте ещё раз.";
  }
}

/**
 * Гостевое оформление заказа с витрины продавца.
 *
 * Один экран: имя, телефон, получение, адрес, способ связи и комментарий.
 * Регистрация не нужна — заказ создаётся RPC-функцией, сумма пересчитывается
 * на сервере, продавец получает уведомление в Telegram.
 */
export function SellerGuestCheckout({ farmer, onClose }: SellerGuestCheckoutProps) {
  const { items, totalPrice, clearCart, getItemKey } = useCart();

  const courierAvailable = !!farmer.deliveryEnabled;
  const [delivery, setDelivery] = useState<DeliveryType>(courierAvailable ? "courier" : "self");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState<ContactMethod>("call");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<{ code: string; total: number } | null>(null);

  const price = formatPrice(totalPrice);
  const itemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const pickupAddress = [farmer.city, farmer.street, farmer.addressDetails]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");

  const contactHref = useMemo(() => {
    const c = farmer.contacts;
    if (!c) return null;
    if (c.telegram?.trim()) return `https://t.me/${c.telegram.trim().replace(/^@/, "")}`;
    if (c.whatsapp?.trim()) return `https://wa.me/${c.whatsapp.replace(/\D/g, "")}`;
    if (c.viber?.trim()) return `viber://chat?number=${c.viber.replace(/\D/g, "")}`;
    if (c.phone?.trim()) return `tel:${c.phone.replace(/[^\d+]/g, "")}`;
    return null;
  }, [farmer.contacts]);

  // Блокируем прокрутку страницы под шторкой
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async () => {
    if (submitting) return;

    const digits = phone.replace(/\D/g, "");
    if (name.trim().length < 2) {
      setError(errorText("NAME_REQUIRED"));
      return;
    }
    if (digits.length !== 9) {
      setError(errorText("PHONE_INVALID"));
      return;
    }
    if (delivery === "courier" && address.trim().length < 5) {
      setError(errorText("ADDRESS_REQUIRED"));
      return;
    }

    setSubmitting(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc("create_guest_order" as never, {
      p_farmer_id: farmer.id,
      p_items: items.map((item) => ({ product_id: item.product.id, quantity: item.quantity })),
      p_name: name.trim(),
      p_phone: `+375${digits}`,
      p_delivery_type: delivery,
      p_address: delivery === "courier" ? address.trim() : null,
      p_comment: comment.trim() || null,
      p_contact_method: contact,
    } as never);

    if (rpcError) {
      console.error("guest order error:", rpcError);
      setError(errorText((rpcError as { message?: string }).message));
      setSubmitting(false);
      return;
    }

    const result = data as unknown as { order_id: string; total: number; code: string };

    // Уведомления продавцу и админу — не блокируем успех заказа
    supabase.functions
      .invoke("send-new-order-telegram", { body: { orderId: result.order_id, seller_times: {} } })
      .catch((err) => console.error("telegram notify failed:", err));
    supabase.functions
      .invoke("send-new-order-notification", { body: { order_id: result.order_id } })
      .catch((err) => console.error("email notify failed:", err));

    clearCart();
    setOrder({ code: result.code, total: result.total });
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <button
        type="button"
        aria-label="Закрыть"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Оформление заказа"
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-y-auto rounded-t-2xl bg-card pb-[calc(1rem+env(safe-area-inset-bottom,0px))] shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-card px-4 py-3">
          <div>
            <p className="text-[15px] font-bold leading-tight text-foreground">
              {order ? "Заказ принят" : "Оформление заказа"}
            </p>
            <p className="text-[11px] text-muted-foreground">{cleanSellerName(farmer.name)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {order ? (
          <div className="flex flex-col items-center px-5 py-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Check className="h-7 w-7" />
            </span>
            <p className="mt-4 text-[19px] font-bold text-foreground">Заказ №{order.code} принят!</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {order.total > 0 ? `Сумма ${formatPrice(order.total).formatted} BYN. ` : ""}
              Продавец свяжется с вами в ближайшее время.
            </p>

            {contactHref && (
              <a
                href={contactHref}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--seller-deep))] px-4 py-2.5 text-[13px] font-semibold text-primary-foreground"
              >
                <MessageCircle className="h-4 w-4" />
                Написать продавцу
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full rounded-xl border border-border py-2.5 text-[13px] font-medium text-foreground"
            >
              Готово
            </button>
          </div>
        ) : (
          <div className="space-y-3.5 px-4 pt-3">
            {/* Что покупатель оплачивает — до полей, чтобы не было сюрпризов */}
            <div className="rounded-xl bg-secondary/70 p-2.5">
              <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                Ваш заказ
              </p>
              <ul className="max-h-36 space-y-2 overflow-y-auto pr-1">
                {items.map((item) => {
                  const linePrice = (item.variant?.price ?? item.product.price) * item.quantity;
                  return (
                    <li key={getItemKey(item)} className="flex items-center gap-2">
                      <OptimizedImage
                        src={item.product.image}
                        alt={item.product.name}
                        preset="thumb"
                        className="h-11 w-11 shrink-0 overflow-hidden rounded-lg"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-[13px] font-medium leading-tight text-foreground">
                          {item.product.name}
                        </p>
                        <p className="text-[11px] leading-tight text-muted-foreground">
                          {item.variant?.unit || item.product.unit || "шт."} · × {item.quantity}
                        </p>
                      </div>
                      <span className="shrink-0 text-[12.5px] font-semibold text-foreground">
                        {formatPrice(linePrice).formatted}
                        <BynSymbol className="ml-0.5 inline-block h-2.5 w-2.5 align-baseline" />
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2">
                <span className="text-[11.5px] text-muted-foreground">Сумма товаров</span>
                <span className="text-[13px] font-bold text-foreground">{price.formatted} BYN</span>
              </div>
            </div>

            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-muted-foreground">Ваше имя</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Анна"
                autoComplete="given-name"
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-[14px] text-foreground outline-none focus:border-[hsl(var(--seller-deep))]"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-muted-foreground">Телефон</span>
              <input
                value={formatPhone(phone.replace(/\D/g, ""))}
                onChange={(e) => {
                  let digits = e.target.value.replace(/\D/g, "");
                  if (digits.startsWith("375")) digits = digits.slice(3);
                  else if (digits.startsWith("80")) digits = digits.slice(2);
                  setPhone(digits.slice(0, 9));
                }}
                inputMode="tel"
                autoComplete="tel"
                placeholder="+375 29 123-45-67"
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-[14px] tracking-wide text-foreground outline-none focus:border-[hsl(var(--seller-deep))]"
              />
            </label>

            {courierAvailable && (
              <div>
                <span className="mb-1 block text-[11px] font-medium text-muted-foreground">Как получить</span>
                <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-secondary p-1">
                  {[
                    { id: "courier" as const, label: "Курьером" },
                    { id: "self" as const, label: "Самовывоз" },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setDelivery(option.id)}
                      className={cn(
                        "h-9 rounded-lg text-[12.5px] font-medium transition-colors",
                        delivery === option.id
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {delivery === "self" && pickupAddress && (
                  <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                    Забрать: {pickupAddress}
                  </p>
                )}
              </div>
            )}

            {courierAvailable && delivery === "courier" && (
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-muted-foreground">Адрес доставки</span>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Город, улица, дом, квартира"
                  autoComplete="street-address"
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-[14px] text-foreground outline-none focus:border-[hsl(var(--seller-deep))]"
                />
              </label>
            )}

            <div>
              <span className="mb-1 block text-[11px] font-medium text-muted-foreground">Как удобнее связаться</span>
              <div className="grid grid-cols-4 gap-1.5">
                {CONTACTS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setContact(option.id)}
                    className={cn(
                      "h-9 rounded-lg border text-[11px] font-medium transition-colors",
                      contact === option.id
                        ? "border-[hsl(var(--seller-deep))] bg-[hsl(var(--seller-deep))] text-primary-foreground"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-muted-foreground">
                Комментарий <span className="text-muted-foreground/60">(необязательно)</span>
              </span>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                placeholder="К какому времени, особенности заказа"
                className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:border-[hsl(var(--seller-deep))]"
              />
            </label>

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-[12px] text-destructive">{error}</p>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--seller-deep))] text-[14px] font-bold text-primary-foreground transition-transform active:scale-[0.99] disabled:opacity-70"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Отправляем…
                </>
              ) : (
                <>
                  Подтвердить заказ на {price.formatted} BYN
                </>
              )}
            </button>

            <p className="pb-1 text-center text-[10.5px] leading-snug text-muted-foreground">
              {itemsCount} {itemsCount === 1 ? "товар" : itemsCount < 5 ? "товара" : "товаров"} · без предоплаты ·
              регистрация не нужна
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
