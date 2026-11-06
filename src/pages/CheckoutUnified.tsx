import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, ChevronDown, Loader2, MapPin, MessageCircle, Minus, Plus, Trash2, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/priceUtils";
import { BynSymbol } from "@/components/ui/byn-symbol";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { cleanSellerName } from "@/lib/sellerName";
import { trackMetaEvent } from "@/lib/metaPixel";
import { cn } from "@/lib/utils";
import type { SellerContacts } from "@/components/seller/SellerTrustFooter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import type { PickupSlots } from "@/components/PickupSettingsSection";
import { buyerDetailsKey, formatPickupSchedule, getReceivingOptions, mergeBuyerDetails, normalizeCheckoutPhone, readBuyerDetails } from "@/lib/checkoutDetails";

type ContactMethod = "call" | "telegram" | "viber" | "whatsapp";
type DeliveryType = "courier" | "self";

interface CheckoutFarmer {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  street: string | null;
  address_details: string | null;
  delivery_enabled: boolean | null;
  pickup_enabled: boolean | null;
  delivery_terms: string | null;
  contacts: SellerContacts | null;
  pickup_slots: PickupSlots | null;
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
 * Единая страница оформления заказа — и для маркетплейса, и для витрины продавца.
 *
 * Один экран без лишних шагов: состав заказа, имя, телефон, способ получения,
 * адрес, способ связи и комментарий. Регистрация не нужна: заказ создаёт
 * RPC-функция create_guest_order, сумма пересчитывается на сервере.
 */
export default function CheckoutUnified() {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart, getItemKey, updateQuantity, removeFromCart, cartFarmerId } = useCart();

  const { user, isLoading: authLoading } = useAuth();
  const [detailsOwner, setDetailsOwner] = useState<string | null>(null);
  const editedFields = useRef(new Set<string>());
  const [itemsExpanded, setItemsExpanded] = useState(false);
  const [sellerLoading, setSellerLoading] = useState(true);
  const [sellerError, setSellerError] = useState(false);

  const [farmer, setFarmer] = useState<CheckoutFarmer | null>(null);
  const [delivery, setDelivery] = useState<DeliveryType>("courier");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState<ContactMethod>("call");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<{ code: string; total: number } | null>(null);

  const itemsCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const price = formatPrice(totalPrice);
  const receivingOptions = getReceivingOptions(farmer);
  const canSubmit = !submitting && !sellerLoading && receivingOptions.includes(delivery);
  const pickupSchedule = formatPickupSchedule(farmer?.pickup_slots ?? null);
  const storeUrl = farmer?.slug ? `/seller/${farmer.slug}` : farmer ? `/seller/${farmer.id}` : "/catalog";

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    const owner = buyerDetailsKey(user?.id);
    const saved = readBuyerDetails(user?.id);
    editedFields.current.clear();
    setName(saved.name);
    setPhone(saved.phone);
    setAddress(saved.address);
    setDetailsOwner(owner);
    if (user) {
      supabase.from("profiles").select("full_name, phone, delivery_address").eq("user_id", user.id).maybeSingle()
        .then(({ data }) => {
          if (cancelled) return;
          const details = mergeBuyerDetails(saved, data);
          if (!editedFields.current.has("name")) setName(details.name);
          if (!editedFields.current.has("phone")) setPhone(details.phone);
          if (!editedFields.current.has("address")) setAddress(details.address);
        });
    }
    return () => { cancelled = true; };
  }, [authLoading, user?.id]);

  useEffect(() => {
    if (authLoading || detailsOwner !== buyerDetailsKey(user?.id)) return;
    const timer = window.setTimeout(() => {
      try { localStorage.setItem(detailsOwner, JSON.stringify({ name, phone, address })); } catch { /* Storage may be unavailable. */ }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [name, phone, address, detailsOwner, authLoading, user?.id]);

  useEffect(() => {
    trackMetaEvent("InitiateCheckout", { num_items: itemsCount, value: Math.floor(totalPrice / 100) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Настройки продавца: доставка, самовывоз, адрес выдачи
  useEffect(() => {
    if (!cartFarmerId) {
      setFarmer(null);
      setSellerLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setSellerLoading(true);
      setSellerError(false);
      setFarmer(null);
      const { data, error: loadError } = await supabase
        .from("farmers")
        .select(
          "id, name, slug, city, street, address_details, delivery_enabled, pickup_enabled, delivery_terms, contacts, pickup_slots",
        )
        .eq("id", cartFarmerId)
        .maybeSingle();
      if (cancelled) return;
      setSellerLoading(false);
      setSellerError(!!loadError || !data);
      if (data) {
        const row = data as unknown as CheckoutFarmer;
        setFarmer(row);
        setDelivery(getReceivingOptions(row)[0] ?? "courier");
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [cartFarmerId]);

  const pickupAddress = useMemo(
    () =>
      [farmer?.city, farmer?.street, farmer?.address_details]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(", "),
    [farmer],
  );

  const contactHref = useMemo(() => {
    const c = farmer?.contacts;
    if (!c) return null;
    if (c.telegram?.trim()) return `https://t.me/${c.telegram.trim().replace(/^@/, "")}`;
    if (c.whatsapp?.trim()) return `https://wa.me/${c.whatsapp.replace(/\D/g, "")}`;
    if (c.viber?.trim()) return `viber://chat?number=${c.viber.replace(/\D/g, "")}`;
    if (c.phone?.trim()) return `tel:${c.phone.replace(/[^\d+]/g, "")}`;
    return null;
  }, [farmer]);

  const submit = async () => {
    if (!canSubmit || !farmer) return;

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
      p_items: items.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        variant_id: item.variant?.id ?? null,
      })),
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

    supabase.functions
      .invoke("send-new-order-telegram", { body: { orderId: result.order_id, seller_times: {} } })
      .catch((err) => console.error("telegram notify failed:", err));
    supabase.functions
      .invoke("send-new-order-notification", { body: { order_id: result.order_id } })
      .catch((err) => console.error("email notify failed:", err));

    trackMetaEvent("Purchase", {
      value: Math.floor(result.total / 100),
      currency: "BYN",
      content_ids: items.map((it) => it.product.id),
      num_items: itemsCount,
    });

    try { localStorage.setItem(buyerDetailsKey(user?.id), JSON.stringify({ name: name.trim(), phone: digits, address: address.trim() })); } catch { /* Keep ordering available without storage. */ }

    clearCart();
    setOrder({ code: result.code, total: result.total });
    setSubmitting(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  // Пустая корзина
  if (!items.length && !order) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col items-center justify-center px-5 text-center">
        <p className="text-[19px] font-bold text-foreground">В корзине пока пусто</p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Добавьте товары — оформление займёт меньше минуты.
        </p>
        <Link
          to="/catalog"
          className="mt-5 inline-flex h-11 items-center rounded-xl bg-primary px-5 text-[14px] font-semibold text-primary-foreground"
        >
          Перейти в каталог
        </Link>
      </div>
    );
  }

  // Заказ принят
  if (order) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col items-center justify-center px-5 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Check className="h-8 w-8" />
        </span>
        <p className="mt-4 text-[21px] font-bold text-foreground">Заказ №{order.code} принят!</p>
        <p className="mt-1.5 text-[13.5px] leading-snug text-muted-foreground">
          {order.total > 0 ? `Сумма ${formatPrice(order.total).formatted} BYN. ` : ""}
          {farmer
            ? `${cleanSellerName(farmer.name)} свяжется с вами в ближайшее время.`
            : "Продавец свяжется с вами в ближайшее время."}
        </p>

        {contactHref && (
          <a
            href={contactHref}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground"
          >
            <MessageCircle className="h-4 w-4" />
            Написать продавцу
          </a>
        )}

        <div className="mt-3 flex w-full flex-col gap-2">
          {farmer?.slug && (
            <Link
              to={`/seller/${farmer.slug}`}
              className="flex h-11 items-center justify-center rounded-xl border border-border text-[13px] font-medium text-foreground"
            >
              Вернуться в магазин
            </Link>
          )}
          <Link
            to="/"
            className="flex h-11 items-center justify-center rounded-xl border border-border text-[13px] font-medium text-foreground"
          >
            На главную
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] pt-3 md:pb-10">
      <Button variant="ghost"
        type="button"
        onClick={() => navigate(-1)}
        className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад
      </Button>

      <div className="mb-4">
        <h1 className="text-[22px] font-bold leading-tight text-foreground">Оформление заказа</h1>
        {farmer && <p className="mt-0.5 text-[12.5px] text-secondary-foreground">{cleanSellerName(farmer.name)}</p>}
      </div>

      <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr] md:items-start">
        {/* Форма */}
        <div className="order-2 space-y-3.5 md:order-1 [&_input]:scroll-mb-28 [&_textarea]:scroll-mb-28" onFocusCapture={(event) => {
          if (window.innerWidth < 768 && (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
            event.target.scrollIntoView({ block: "center", behavior: "smooth" });
          }
        }}>
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-medium text-muted-foreground">Ваше имя</span>
            <input
              value={name}
              onChange={(e) => { editedFields.current.add("name"); setName(e.target.value); }}
              placeholder="Анна"
              autoComplete="given-name"
              className="h-12 w-full rounded-xl border border-border bg-background px-3 text-[15px] text-foreground outline-none focus:border-primary"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[11.5px] font-medium text-muted-foreground">Телефон</span>
            <input
              value={formatPhone(phone.replace(/\D/g, ""))}
              onChange={(e) => {
                editedFields.current.add("phone");
                setPhone(normalizeCheckoutPhone(e.target.value));
              }}
              inputMode="tel"
              autoComplete="tel"
              placeholder="+375 29 123-45-67"
              className="h-12 w-full rounded-xl border border-border bg-background px-3 text-[15px] tracking-wide text-foreground outline-none focus:border-primary"
            />
          </label>

          <div>
            <span className="mb-1 block text-[11.5px] font-medium text-muted-foreground">Как получить</span>
            {sellerLoading && <p className="text-sm text-secondary-foreground" role="status">Загружаем условия продавца…</p>}
            {sellerError && <p className="text-sm text-destructive" role="alert">Не удалось загрузить условия продавца. Обновите страницу.</p>}
            {!sellerLoading && !sellerError && !receivingOptions.length && <p className="text-sm text-secondary-foreground">Продавец пока не указал способ получения заказа.</p>}
            <div className="flex gap-1.5">
              {receivingOptions.map((option) => (
                <Button variant="outline"
                  key={option}
                  type="button"
                  aria-pressed={delivery === option}
                  onClick={() => setDelivery(option)}
                  className={cn(
                    "h-11 flex-1 rounded-lg text-[13px] font-medium",
                    delivery === option ? "border-primary bg-primary/10 text-foreground" : "text-secondary-foreground",
                  )}
                >
                  {option === "courier" ? <Truck /> : <MapPin />}
                  {option === "courier" ? "Доставка" : "Самовывоз"}
                </Button>
              ))}
            </div>
            {delivery === "courier" && farmer?.delivery_terms?.trim() && (
              <div className="mt-3 border-l-2 border-primary pl-3">
                <p className="mb-1 text-[13px] font-semibold text-foreground">Условия доставки</p>
                <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-foreground">{farmer.delivery_terms}</p>
              </div>
            )}
            {delivery === "self" && receivingOptions.includes("self") && (pickupAddress || pickupSchedule.length > 0) && (
              <div className="mt-3 border-l-2 border-primary pl-3 text-[14px] leading-relaxed text-foreground">
                {pickupAddress && <p className="break-words">Забрать: {pickupAddress}</p>}
                {pickupSchedule.length > 0 && <div className="mt-1 text-[13px] text-secondary-foreground"><p className="font-medium">График выдачи</p>{pickupSchedule.map((line) => <p key={line}>{line}</p>)}</div>}
              </div>
            )}
          </div>

          {delivery === "courier" && receivingOptions.includes("courier") && (
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-medium text-muted-foreground">Адрес доставки</span>
              <input
                value={address}
                onChange={(e) => { editedFields.current.add("address"); setAddress(e.target.value); }}
                placeholder="Город, улица, дом, квартира"
                autoComplete="street-address"
                className="h-12 w-full rounded-xl border border-border bg-background px-3 text-[15px] text-foreground outline-none focus:border-primary"
              />
            </label>
          )}

          <div>
            <span className="mb-1 block text-[11.5px] font-medium text-muted-foreground">Как удобнее связаться</span>
            <div className="grid grid-cols-4 gap-1.5">
              {CONTACTS.map((option) => (
                <Button variant="outline"
                  key={option.id}
                  type="button"
                  onClick={() => setContact(option.id)}
                  className={cn(
                    "h-10 rounded-lg border text-[11.5px] font-medium transition-colors",
                    contact === option.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-[11.5px] font-medium text-muted-foreground">
              Комментарий <span className="text-muted-foreground/60">(необязательно)</span>
            </span>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder="К какому времени, особенности заказа"
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-[14px] text-foreground outline-none focus:border-primary"
            />
          </label>

          <p className="text-[11.5px] text-secondary-foreground">Без регистрации</p>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-[12.5px] text-destructive">{error}</p>
          )}

          <Button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="hidden h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-bold text-primary-foreground transition-transform active:scale-[0.995] disabled:opacity-70 md:flex"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Отправляем…
              </>
            ) : (
              <>Заказать · {price.formatted} <BynSymbol className="h-3 w-3" /></>
            )}
          </Button>
        </div>

        {/* Состав заказа */}
        <div className="order-1 md:order-2 md:sticky md:top-4">
          <div className="rounded-2xl border border-border/70 bg-card p-3.5">
            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={() => setItemsExpanded((value) => !value)} aria-expanded={itemsExpanded} aria-controls="checkout-items" className="h-auto min-h-11 flex-1 justify-between whitespace-normal px-0 text-left md:pointer-events-none">
                <span><span className="block text-[13px] font-semibold">Ваш заказ · {itemsCount} шт.</span><span className="text-[15px] font-bold">{price.formatted} <BynSymbol className="inline-block h-3 w-3" /></span></span>
                <ChevronDown className={cn("transition-transform md:hidden", itemsExpanded && "rotate-180")} />
              </Button>
              <Link
                to={storeUrl}
                className="text-[12px] font-medium text-muted-foreground underline-offset-2 hover:underline"
              >
                Добавить
              </Link>
            </div>

            <div id="checkout-items" className={cn("mt-3 md:block", !itemsExpanded && "hidden")}>
            <ul className="space-y-2.5 pr-0.5">
              {items.map((item) => {
                const key = getItemKey(item);
                const linePrice = (item.variant?.price ?? item.product.price) * item.quantity;
                return (
                  <li key={key} className="flex items-center gap-2.5">
                    <OptimizedImage
                      src={item.product.image}
                      alt={item.product.name}
                      preset="thumb"
                      className="h-12 w-12 shrink-0 overflow-hidden rounded-lg"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-[13.5px] font-medium leading-tight text-foreground">
                        {item.product.name}
                      </p>
                      <p className="text-[11.5px] leading-tight text-muted-foreground">
                        {item.variant?.unit || item.product.unit || "шт."}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <Button variant="outline" size="icon"
                          type="button"
                          onClick={() => updateQuantity(key, Math.max(1, item.quantity - 1))}
                          disabled={item.quantity <= 1}
                          aria-label="Меньше"
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-foreground disabled:opacity-40"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="min-w-4 text-center text-[12.5px] font-semibold text-foreground">
                          {item.quantity}
                        </span>
                        <Button variant="outline" size="icon"
                          type="button"
                          onClick={() => updateQuantity(key, item.quantity + 1)}
                          aria-label="Больше"
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-foreground"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon"
                          type="button"
                          onClick={() => removeFromCart(key)}
                          aria-label="Удалить"
                          className="ml-1 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <span className="shrink-0 self-start text-[13px] font-semibold text-foreground">
                      {formatPrice(linePrice).formatted}
                      <BynSymbol className="ml-0.5 inline-block h-2.5 w-2.5 align-baseline" />
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-2.5">
              <span className="text-[12.5px] text-muted-foreground">
                {itemsCount} {itemsCount === 1 ? "товар" : itemsCount < 5 ? "товара" : "товаров"}
              </span>
              <span className="text-[15px] font-bold text-foreground">{price.formatted} <BynSymbol className="inline-block h-3 w-3" /></span>
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Кнопка на телефоне — всегда под рукой */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:hidden">
        <Button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg text-[14.5px] font-bold"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Отправляем…
            </>
          ) : (
            <>Заказать · {price.formatted} <BynSymbol className="h-3 w-3" /></>
          )}
        </Button>
      </div>

    </div>
  );
}
