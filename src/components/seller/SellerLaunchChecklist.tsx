import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Copy,
  ExternalLink,
  Plus,
  Share2,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SellerLaunchChecklistProps {
  farmerId: string;
  storeName: string;
  slug: string | null;
  productsCount: number;
  hasDeliveryConfigured: boolean;
  ordersCount: number;
}

/**
 * Чеклист запуска витрины в стиле Shopify: карточка магазина, прогресс
 * и четыре шага до первых заказов. Ссылка на шаг «поделиться» запоминается
 * в localStorage, чтобы отметка не терялась между заходами.
 */
export function SellerLaunchChecklist({
  farmerId,
  storeName,
  slug,
  productsCount,
  hasDeliveryConfigured,
  ordersCount,
}: SellerLaunchChecklistProps) {
  const shareKey = `seller_shared_link_${farmerId}`;
  const [shared, setShared] = useState(() => {
    try {
      return window.localStorage.getItem(shareKey) === "1";
    } catch {
      return false;
    }
  });

  const storefrontUrl = `${window.location.origin}/seller/${slug || farmerId}`;
  const storefrontPath = `/seller/${slug || farmerId}`;
  const hasProducts = productsCount > 0;

  const stepsDone = useMemo(
    () => [true, hasProducts, hasDeliveryConfigured, shared].filter(Boolean).length,
    [hasProducts, hasDeliveryConfigured, shared],
  );

  const everythingDone = stepsDone === 4;
  // У продавца уже есть заказы — чеклист по умолчанию свёрнут, вперёд выходят показатели.
  const [collapsed, setCollapsed] = useState(ordersCount > 0);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(storefrontUrl);
      toast.success("Ссылка скопирована!");
    } catch {
      toast.error("Не удалось скопировать. Выделите ссылку вручную.");
    }
  };

  const toggleShared = () => {
    const next = !shared;
    setShared(next);
    try {
      window.localStorage.setItem(shareKey, next ? "1" : "0");
    } catch {
      /* приватный режим — просто не запоминаем */
    }
  };

  const steps = [
    {
      title: "Магазин создан",
      hint: "Название и ссылка зарезервированы",
      done: true,
      action: null,
    },
    {
      title: "Добавьте первый товар",
      hint: hasProducts
        ? `Добавлено товаров: ${productsCount}`
        : "Загрузите фото, название и цену — товар сразу появится на вашей витрине",
      done: hasProducts,
      action: (
        <Button asChild size="sm" className="h-9 rounded-lg px-3 text-[13px]">
          <Link to="/seller/products?new=1">
            <Plus className="mr-1 h-4 w-4" />
            Добавить товар
          </Link>
        </Button>
      ),
    },
    {
      title: "Настройте получение заказов",
      hint: hasDeliveryConfigured
        ? "Способы получения настроены"
        : "Укажите адрес самовывоза, условия доставки курьером или отправки почтой (Европочта/Белпочта)",
      done: hasDeliveryConfigured,
      action: (
        <Button asChild size="sm" variant="outline" className="h-9 rounded-lg px-3 text-[13px]">
          <Link to="/seller/delivery">
            <Truck className="mr-1 h-4 w-4" />
            Настроить получение
          </Link>
        </Button>
      ),
    },
    {
      title: "Разместите ссылку в соцсетях",
      hint: "Вставьте ссылку в шапку профиля Instagram или отправьте постоянным клиентам — они смогут оформлять заказы без переписок в Direct",
      done: shared,
      action: (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={copyLink} className="h-9 rounded-lg px-3 text-[13px]">
            <Copy className="mr-1 h-4 w-4" />
            Скопировать ссылку
          </Button>
          <button
            type="button"
            onClick={toggleShared}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground"
          >
            <span
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded border",
                shared ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background",
              )}
            >
              {shared && <Check className="h-3 w-3" />}
            </span>
            Уже разместил
          </button>
        </div>
      ),
    },
  ];

  return (
    <section className="mb-5 overflow-hidden rounded-2xl border border-[#E4E1DA] bg-white">
      {/* Карточка витрины */}
      <div className="border-b border-[#EFECE6] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Ваша витрина</p>
            <h2 className="mt-1 truncate text-[19px] font-bold leading-tight text-foreground">{storeName}</h2>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
              hasProducts ? "bg-[#E7F2EA] text-[#1F6B3B]" : "bg-[#FBF0DA] text-[#8A6212]",
            )}
          >
            {hasProducts ? "Витрина открыта" : "Наполняется"}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          <code className="min-w-0 flex-1 truncate rounded-lg bg-[#F7F5F0] px-2.5 py-2 text-[12px] text-[#5B564C]">
            locusfood.by/seller/{slug || farmerId}
          </code>
          <button
            type="button"
            onClick={copyLink}
            aria-label="Скопировать ссылку на витрину"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E4E1DA] text-[#5B564C] transition-colors hover:bg-[#F7F5F0]"
          >
            <Copy className="h-4 w-4" />
          </button>
          <a
            href={storefrontPath}
            target="_blank"
            rel="noreferrer"
            className="flex h-9 shrink-0 items-center gap-1 rounded-lg bg-[#1F3A2E] px-3 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#16291F]"
          >
            Открыть
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Прогресс */}
      <div className="p-4">
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="flex w-full items-start justify-between gap-3 text-left"
        >
          <div>
            <h3 className="text-[15px] font-bold leading-snug text-foreground">Подготовка к первым заказам</h3>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">
              {everythingDone
                ? "Все шаги выполнены — витрина готова принимать заказы"
                : `${stepsDone} из 4 шагов выполнено`}
            </p>
          </div>
          <span className="mt-0.5 text-muted-foreground">
            {collapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
          </span>
        </button>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#EDEAE3]">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${(stepsDone / 4) * 100}%` }}
          />
        </div>

        {!collapsed && (
          <ol className="mt-4 space-y-3">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="mt-0.5 shrink-0">
                  {step.done ? (
                    <CheckCircle2 className="h-5 w-5 text-[#1F6B3B]" />
                  ) : (
                    <Circle className="h-5 w-5 text-[#C9C4B8]" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-[14px] font-semibold leading-snug",
                      step.done ? "text-foreground" : "text-foreground/90",
                    )}
                  >
                    {index + 1}. {step.title}
                  </p>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">{step.hint}</p>
                  {!step.done && step.action && <div className="mt-2">{step.action}</div>}
                  {step.done && index === 3 && step.action && <div className="mt-2">{step.action}</div>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Поделиться ссылкой, если чеклист свёрнут */}
      {collapsed && !shared && (
        <div className="border-t border-[#EFECE6] px-4 py-3">
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary"
          >
            <Share2 className="h-4 w-4" />
            Скопировать ссылку для Instagram
          </button>
        </div>
      )}
    </section>
  );
}
