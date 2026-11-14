import { RefreshCw, Store, Truck } from "lucide-react";

interface SellerApparelTrustProps {
  pickupCount: number;
  deliveryEnabled: boolean;
}

/**
 * Полоса доверия для витрины одежды — редакционный стиль топовых fashion-магазинов:
 * белый фон, тонкие линии, чёрный текст, без цветных плашек.
 */
export function SellerApparelTrust({ pickupCount, deliveryEnabled }: SellerApparelTrustProps) {
  const items = [
    {
      icon: Store,
      title: pickupCount > 1 ? `Примерка в ${pickupCount} магазинах` : "Примерка в магазине",
      hint: "Посмотреть и примерить перед покупкой",
      show: pickupCount > 0,
    },
    {
      icon: RefreshCw,
      title: "Обмен 14 дней",
      hint: "Если размер не подошёл",
      show: true,
    },
    {
      icon: Truck,
      title: deliveryEnabled ? "Доставка по Беларуси" : "Самовывоз сегодня",
      hint: deliveryEnabled ? "Европочта и Белпочта" : "Забрать в удобной точке",
      show: true,
    },
  ].filter((item) => item.show);

  return (
    <div className="border-b border-neutral-200 bg-white">
      <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-neutral-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="flex items-center gap-2.5 px-4 py-3.5">
              <Icon className="h-[17px] w-[17px] shrink-0 text-neutral-900" strokeWidth={1.4} aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-[12.5px] font-medium uppercase tracking-[0.04em] leading-tight text-neutral-900">
                  {item.title}
                </p>
                <p className="mt-0.5 text-[11.5px] leading-tight text-neutral-500">{item.hint}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
