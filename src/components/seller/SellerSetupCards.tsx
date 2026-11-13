import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Check, Copy, Loader2, Package, Plus, Truck, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type CardId = "product" | "delivery" | "share" | "type";

interface SellerSetupCardsProps {
  farmerId: string;
  slug: string | null;
  productsCount: number;
  hasDeliveryConfigured: boolean;
  storeType: string | null;
}

const STORE_TYPES: { id: "food" | "apparel"; emoji: string; label: string }[] = [
  { id: "food", emoji: "🍰", label: "Еда и сладости" },
  { id: "apparel", emoji: "👗", label: "Одежда и крафт" },
];

/**
 * Карточки запуска в стиле Shopify: одна карточка — одно действие.
 * Выполненные и закрытые карточки не возвращаются, поэтому лента
 * у опытного продавца исчезает сама.
 */
export function SellerSetupCards({
  farmerId,
  slug,
  productsCount,
  hasDeliveryConfigured,
  storeType,
}: SellerSetupCardsProps) {
  const flag = (key: string) => `seller_setup_${key}_${farmerId}`;

  const readFlag = (key: string) => {
    try {
      return window.localStorage.getItem(flag(key)) === "1";
    } catch {
      return false;
    }
  };

  const writeFlag = (key: string) => {
    try {
      window.localStorage.setItem(flag(key), "1");
    } catch {
      /* приватный режим — просто скрываем до перезагрузки */
    }
  };

  const [dismissed, setDismissed] = useState<Record<string, boolean>>({
    product: readFlag("product_done"),
    delivery: readFlag("delivery_done"),
    share: readFlag("share_done"),
    type: readFlag("type_done"),
  });
  const [chosenType, setChosenType] = useState<"food" | "apparel">(
    storeType === "apparel" || storeType === "craft" ? "apparel" : "food",
  );
  const [savingType, setSavingType] = useState(false);

  const hide = (id: CardId) => {
    setDismissed((prev) => ({ ...prev, [id]: true }));
    writeFlag(`${id}_done`);
  };

  const storefrontUrl = `${window.location.origin}/seller/${slug || farmerId}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(storefrontUrl);
      toast.success("Ссылка скопирована!");
      hide("share");
    } catch {
      toast.error("Не удалось скопировать. Выделите ссылку вручную.");
    }
  };

  const saveType = async () => {
    setSavingType(true);
    const { error } = await supabase.rpc("update_seller_store_type" as never, {
      p_store_type: chosenType,
    } as never);
    setSavingType(false);
    if (error) {
      toast.error("Не получилось сохранить тип витрины");
      return;
    }
    toast.success("Тип витрины сохранён");
    hide("type");
  };

  const visible = useMemo(
    () => ({
      product: productsCount === 0 && !dismissed.product,
      delivery: !hasDeliveryConfigured && !dismissed.delivery,
      share: !dismissed.share,
      type: !dismissed.type,
    }),
    [productsCount, hasDeliveryConfigured, dismissed],
  );

  const nothingLeft = !visible.product && !visible.delivery && !visible.share && !visible.type;

  if (nothingLeft) {
    return (
      <section className="mb-5 flex items-center gap-3 rounded-2xl border border-[#E7E4DD] bg-white px-4 py-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E7F2EA]">
          <Check className="h-4.5 w-4.5 text-[#1F6B3B]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-[#1A1A1A]">Всё готово к первым заказам</p>
          <p className="text-[12.5px] text-[#6B655C]">Витрина открыта, ссылку можно отправлять клиентам</p>
        </div>
        <button
          type="button"
          onClick={copyLink}
          aria-label="Скопировать ссылку на витрину"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E4E1DA] text-[#5B564C]"
        >
          <Copy className="h-4 w-4" />
        </button>
      </section>
    );
  }

  return (
    <section className="mb-5 space-y-3">
      {/* Первый товар */}
      {visible.product && (
        <article className="overflow-hidden rounded-[22px] border border-[#EAE7E0] bg-white">
          <div className="relative h-[148px] overflow-hidden bg-[#F3F1EC]">
            <div className="absolute left-1/2 top-1/2 flex h-[92px] w-[92px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border border-dashed border-[#C9C4B8] bg-white/70">
              <Plus className="h-6 w-6 text-[#8A8478]" />
            </div>
            <div className="absolute left-4 top-6 h-12 w-12 rotate-[-8deg] rounded-xl bg-[#DCE6DC] blur-[1px]" />
            <div className="absolute right-5 top-4 h-14 w-14 rotate-[7deg] rounded-xl bg-[#E8D9D2] blur-[1px]" />
            <div className="absolute bottom-3 right-10 h-9 w-16 rotate-[-4deg] rounded-xl bg-[#DEDCDA] blur-[1px]" />
            <button
              type="button"
              onClick={() => hide("product")}
              aria-label="Скрыть карточку"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#5B564C]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4">
            <h2 className="text-[17px] font-bold leading-tight text-[#1A1A1A]">Добавьте свой первый товар</h2>
            <p className="mt-1.5 text-[13.5px] leading-snug text-[#6B655C]">
              Начните с названия, цены и фотографии. Вы всегда сможете добавить больше информации позже.
            </p>
            <Link
              to="/seller/products?new=1"
              className="mt-3.5 inline-flex h-10 items-center gap-1.5 rounded-full bg-[#161616] px-4 text-[13.5px] font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              Добавить товар
            </Link>
          </div>
        </article>
      )}

      {/* Получение заказов */}
      {visible.delivery && (
        <article className="overflow-hidden rounded-[22px] border border-[#EAE7E0] bg-white">
          <div className="relative h-[120px] overflow-hidden bg-[#F3F1EC]">
            <div className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-sm">
              <Truck className="h-6 w-6 text-[#1F3A2E]" />
            </div>
            <div className="absolute bottom-4 left-6 right-6 border-t border-dashed border-[#C9C4B8]" />
            <button
              type="button"
              onClick={() => hide("delivery")}
              aria-label="Скрыть карточку"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#5B564C]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4">
            <h2 className="text-[17px] font-bold leading-tight text-[#1A1A1A]">Настройте получение заказов</h2>
            <p className="mt-1.5 text-[13.5px] leading-snug text-[#6B655C]">
              Укажите адрес самовывоза или условия доставки, чтобы покупатели могли оформить заказ.
            </p>
            <Link
              to="/seller/delivery"
              className="mt-3.5 inline-flex h-10 items-center rounded-full bg-[#161616] px-4 text-[13.5px] font-semibold text-white"
            >
              Настроить условия
            </Link>
          </div>
        </article>
      )}

      {/* Ссылка на витрину */}
      {visible.share && (
        <article className="overflow-hidden rounded-[22px] border border-[#EAE7E0] bg-white">
          <div className="relative h-[120px] overflow-hidden bg-[#F3F1EC] px-6 pt-6">
            <div className="flex h-9 items-center gap-2 rounded-full bg-white px-3 shadow-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-[#D8D4CB]" />
              <span className="h-2 w-24 rounded-full bg-[#EDEAE3]" />
              <span className="text-[11px] text-[#8A8478]">locusfood.by</span>
            </div>
            <div className="mt-2 ml-6 flex h-9 items-center gap-2 rounded-full bg-white px-3 shadow-sm">
              <span className="text-[11px] text-[#8A8478]">/seller/{slug || "vasha-vitrina"}</span>
            </div>
            <button
              type="button"
              onClick={() => hide("share")}
              aria-label="Скрыть карточку"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#5B564C]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4">
            <h2 className="text-[17px] font-bold leading-tight text-[#1A1A1A]">Поделитесь ссылкой на витрину</h2>
            <p className="mt-1.5 text-[13.5px] leading-snug text-[#6B655C]">
              Разместите её в описании Instagram или отправьте клиентам — они смогут оформить заказ без переписок в
              Direct.
            </p>
            <div className="mt-3.5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#161616] px-4 text-[13.5px] font-semibold text-white"
              >
                <Copy className="h-4 w-4" />
                Скопировать ссылку
              </button>
              <a
                href={`/seller/${slug || farmerId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center gap-1 rounded-full bg-[#F1EFEA] px-4 text-[13.5px] font-semibold text-[#1A1A1A]"
              >
                Открыть витрину
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </article>
      )}

      {/* Тип витрины */}
      {visible.type && (
        <article className="overflow-hidden rounded-[22px] border border-[#EAE7E0] bg-white">
          <div className="relative flex h-[96px] items-center justify-center gap-3 bg-[#F3F1EC]">
            {STORE_TYPES.map((type) => (
              <span
                key={type.id}
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-2xl text-[22px] transition-transform",
                  chosenType === type.id ? "scale-105 bg-white shadow-sm" : "bg-white/60",
                )}
              >
                {type.emoji}
              </span>
            ))}
            <button
              type="button"
              onClick={() => hide("type")}
              aria-label="Скрыть карточку"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#5B564C]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4">
            <h2 className="text-[17px] font-bold leading-tight text-[#1A1A1A]">Выберите тип витрины</h2>
            <p className="mt-1.5 text-[13.5px] leading-snug text-[#6B655C]">
              Шаблон для еды и выпечки или для одежды и ремесленников. От него зависят размеры, сроки и способы
              получения.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {STORE_TYPES.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setChosenType(type.id)}
                  className={cn(
                    "inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors",
                    chosenType === type.id
                      ? "bg-[#161616] text-white"
                      : "bg-[#F1EFEA] text-[#1A1A1A]",
                  )}
                >
                  <span>{type.emoji}</span>
                  {type.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={saveType}
              disabled={savingType}
              className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-full border border-[#E4E1DA] px-4 text-[13.5px] font-semibold text-[#1A1A1A] disabled:opacity-60"
            >
              {savingType ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
              Сохранить тип
            </button>
          </div>
        </article>
      )}
    </section>
  );
}
