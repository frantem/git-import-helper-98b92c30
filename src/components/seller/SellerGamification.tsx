import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  ChevronRight,
  Copy,
  ImagePlus,
  Package,
  Send,
  Share2,
  Store,
  Truck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export interface GamificationFarmer {
  id: string;
  name: string;
  slug: string | null;
  photo_url: string | null;
  description: string | null;
  telegram_chat_id: string | null;
  published_to_marketplace: boolean | null;
  store_type: string | null;
}

interface SellerGamificationProps {
  farmer: GamificationFarmer;
  productsCount: number;
  hasDeliveryConfigured: boolean;
}

const MAX_XP = 300;

const LEVELS = [
  { min: 0, max: 70, title: "Уровень 1: Начало", emoji: "🌱", className: "bg-[#EDF2EA] text-[#4E6B4A]" },
  { min: 71, max: 150, title: "Уровень 2: Витрина открыта", emoji: "⚡", className: "bg-[#E4F0E4] text-[#1F6B3B]" },
  { min: 151, max: 240, title: "Уровень 3: Готов к заказам", emoji: "🚀", className: "bg-[#E6EDF7] text-[#2A4F86]" },
  { min: 241, max: MAX_XP, title: "Уровень 4: Мастер продаж", emoji: "👑", className: "bg-[#FBF1D8] text-[#8A6212]" },
];

function levelFor(xp: number) {
  return LEVELS.find((level) => xp >= level.min && xp <= level.max) ?? LEVELS[LEVELS.length - 1];
}

function nextLevelFor(xp: number) {
  const next = LEVELS.find((level) => level.min > xp);
  return next ?? null;
}

/**
 * Геймификация запуска витрины: опыт, уровни и задачи по приоритету.
 * XP считается только по реальному состоянию магазина — крестиков
 * «скрыть» нет, задача исчезает лишь когда выполнена.
 */
export function SellerGamification({ farmer, productsCount, hasDeliveryConfigured }: SellerGamificationProps) {
  const shareKey = `seller_link_shared_${farmer.id}`;
  const [linkShared, setLinkShared] = useState(() => {
    try {
      return window.localStorage.getItem(shareKey) === "1";
    } catch {
      return false;
    }
  });
  const [published, setPublished] = useState(Boolean(farmer.published_to_marketplace));
  const [savingPublish, setSavingPublish] = useState(false);

  const isFood = (farmer.store_type ?? "food") === "food";
  const hasLogo = Boolean(farmer.photo_url);
  const hasDescription = Boolean(farmer.description && farmer.description.trim().length >= 10);
  const hasProduct = productsCount >= 1;
  const hasThree = productsCount >= 3;
  const hasTelegram = Boolean(farmer.telegram_chat_id);

  const shopBranded = hasLogo && hasDescription;
  const xp =
    (shopBranded ? 70 : 0) +
    (hasProduct ? 60 : 0) +
    (hasDeliveryConfigured ? 50 : 0) +
    (hasTelegram ? 50 : 0) +
    (hasThree ? 40 : 0) +
    (linkShared ? 30 : 0);

  const level = levelFor(xp);
  const nextLevel = nextLevelFor(xp);

  const storefrontUrl = `${window.location.origin}/seller/${farmer.slug || farmer.id}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(storefrontUrl);
      toast.success("Ссылка скопирована!");
      setLinkShared(true);
      try {
        window.localStorage.setItem(shareKey, "1");
      } catch {
        /* приватный режим */
      }
    } catch {
      toast.error("Не удалось скопировать. Выделите ссылку вручную.");
    }
  };

  const togglePublishing = async (enabled: boolean) => {
    setSavingPublish(true);
    const { error } = await supabase.rpc("toggle_marketplace_publishing" as never, { p_enabled: enabled } as never);
    setSavingPublish(false);
    if (error) {
      toast.error("Не получилось изменить публикацию");
      return;
    }
    setPublished(enabled);
    toast.success(enabled ? "Товары появятся в каталоге Витебска" : "Витрина работает автономно");
  };

  const tasks = useMemo(
    () => [
      {
        id: "brand",
        icon: ImagePlus,
        xp: 70,
        title: "Оформите витрину",
        hint: "Логотип, название, описание вашего дела и город — чтобы витрина выглядела профессионально.",
        done: shopBranded,
        doneLabel: "Выполнено (+70 XP)",
        action: { label: "Заполнить профиль", to: "/seller/settings" },
      },
      {
        id: "product",
        icon: Package,
        xp: 60,
        title: "Добавьте первый товар",
        hint: "Название, цена и фото — этого достаточно, чтобы принять первый заказ.",
        done: hasProduct,
        doneLabel: "Выполнено (+60 XP)",
        action: { label: "Добавить товар", to: "/seller/products?new=1" },
      },
      {
        id: "delivery",
        icon: Truck,
        xp: 50,
        title: "Настройте получение заказов",
        hint: "Самовывоз, курьер или почта — покупатель должен знать, как забрать заказ.",
        done: hasDeliveryConfigured,
        doneLabel: "Выполнено (+50 XP)",
        action: { label: "Настроить самовывоз или доставку", to: "/seller/delivery" },
      },
      {
        id: "telegram",
        icon: Send,
        xp: 50,
        title: "Подключите Telegram для заказов",
        hint: "Заказ придёт сообщением в бот, и вы подтвердите его одной кнопкой.",
        done: hasTelegram,
        doneLabel: "Выполнено (+50 XP)",
        action: { label: "Подключить бота", to: "/seller/settings#telegram" },
      },
      {
        id: "three",
        icon: Store,
        xp: 40,
        title: "Добавьте 3 товара",
        hint: "С тремя товарами витрина выглядит убедительно для нового покупателя.",
        done: hasThree,
        doneLabel: "Выполнено (+40 XP)",
        action: { label: "Добавить ещё товары", to: "/seller/products" },
      },
      {
        id: "share",
        icon: Share2,
        xp: 30,
        title: "Разместите ссылку в соцсетях",
        hint: "Ссылка для Instagram и Telegram — покупатели оформят заказ без переписки в Direct.",
        done: linkShared,
        doneLabel: "Выполнено (+30 XP)",
        action: { label: "Скопировать ссылку", onClick: copyLink },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shopBranded, hasProduct, hasDeliveryConfigured, hasTelegram, hasThree, linkShared],
  );

  const pending = tasks.filter((task) => !task.done);

  return (
    <section className="mb-5">
      {/* Прогресс и уровень */}
      <div className="rounded-2xl border border-[#EAE7E0] bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold",
              level.className,
            )}
          >
            <span>{level.emoji}</span>
            {level.title}
          </span>
          <span className="text-[13px] font-bold text-[#1A1A1A]">
            {xp} <span className="font-medium text-[#8A8478]">/ {MAX_XP} XP</span>
          </span>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#EDEAE3]">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${Math.min(100, (xp / MAX_XP) * 100)}%` }}
          />
        </div>

        <p className="mt-2 text-[12.5px] leading-snug text-[#6B655C]">
          {nextLevel
            ? `Добавьте ещё ${nextLevel.min - xp} XP, чтобы перейти на ${nextLevel.title}`
            : "Максимальный уровень — витрина готова к продажам без нареканий"}
        </p>
      </div>

      {/* Задачи по приоритету */}
      <div className="mt-3 space-y-2.5">
        {pending.map((task) => {
          const Icon = task.icon;
          return (
            <article key={task.id} className="rounded-2xl border border-[#EAE7E0] bg-white p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3F1EC]">
                  <Icon className="h-[18px] w-[18px] text-[#1F3A2E]" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-[15px] font-bold leading-snug text-[#1A1A1A]">{task.title}</h3>
                    <span className="shrink-0 rounded-full bg-[#F3F1EC] px-2 py-0.5 text-[11px] font-semibold text-[#5B564C]">
                      +{task.xp} XP
                    </span>
                  </div>
                  <p className="mt-1 text-[12.5px] leading-snug text-[#6B655C]">{task.hint}</p>
                  {"onClick" in task.action && task.action.onClick ? (
                    <button
                      type="button"
                      onClick={task.action.onClick}
                      className="mt-2.5 inline-flex h-9 items-center gap-1.5 rounded-full bg-[#161616] px-3.5 text-[13px] font-semibold text-white"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {task.action.label}
                    </button>
                  ) : (
                    <Link
                      to={(task.action as { to: string }).to}
                      className="mt-2.5 inline-flex h-9 items-center gap-1 rounded-full bg-[#161616] px-3.5 text-[13px] font-semibold text-white"
                    >
                      {task.action.label}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Выполненные шаги — внизу, чтобы не мешали активным */}
      {pending.length < tasks.length && (
        <div className="mt-3 space-y-1.5">
          {tasks
            .filter((task) => task.done)
            .map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-2 rounded-xl bg-[#F1F5EF] px-3 py-2 text-[12.5px] text-[#4E6B4A]"
              >
                <Check className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{task.title}</span>
                <span className="ml-auto shrink-0 text-[11.5px] font-semibold">+{task.xp} XP</span>
              </div>
            ))}
        </div>
      )}

      {/* Публикация в общем каталоге — только для еды */}
      {isFood && (
        <article className="mt-2.5 rounded-2xl border border-[#EAE7E0] bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-[15px] font-bold leading-snug text-[#1A1A1A]">
                Показывать товары в общем каталоге Витебска
              </h3>
              <p className="mt-1 text-[12.5px] leading-snug text-[#6B655C]">
                {published
                  ? "Товары видны покупателям на locusfood.by. Выключите — витрина продолжит работать по своей ссылке."
                  : "Сейчас витрина работает автономно, как личный сайт. Включите, чтобы покупатели находили вас в каталоге."}
              </p>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#F3F1EC] px-2 py-0.5 text-[11px] font-semibold text-[#5B564C]">
                +20 XP
              </span>
            </div>
            <Switch
              checked={published}
              disabled={savingPublish}
              onCheckedChange={(value) => void togglePublishing(value)}
              aria-label="Публиковать товары в общем каталоге"
              className="mt-1 shrink-0"
            />
          </div>
        </article>
      )}
    </section>
  );
}
