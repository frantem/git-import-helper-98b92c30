import { RefreshCw, Store, Truck } from "lucide-react";

interface SellerApparelTrustProps {
  pickupCount: number;
  deliveryEnabled: boolean;
}

/**
 * Полоса доверия для витрины одежды: три причины купить здесь, а не в Instagram.
 * Показывается только магазинам одежды и крафта.
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
    <div className="mx-3 mt-3 overflow-hidden rounded-2xl border border-[#E8E4DB] bg-white">
      <div className="grid grid-cols-1 divide-y divide-[#EEEAE2] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="flex items-start gap-2.5 px-3.5 py-3">
              <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#2F5D45]" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold leading-tight text-[#1A1A1A]">{item.title}</p>
                <p className="mt-0.5 text-[11.5px] leading-tight text-[#7A7469]">{item.hint}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
