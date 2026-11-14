import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingBag, Users } from "lucide-react";
import { usePendingOrdersCount } from "@/hooks/usePendingOrdersCount";
import { cn } from "@/lib/utils";

/**
 * Нижняя навигация кабинета продавца: четыре рабочих раздела.
 * Переход на витрину живёт в шапке кабинета, поэтому здесь его нет.
 */
export function SellerBottomNav() {
  const location = useLocation();
  const { sellerPendingCount } = usePendingOrdersCount();

  const items = [
    { path: "/seller", icon: LayoutDashboard, label: "Кабинет", exact: true },
    { path: "/seller/products", icon: Package, label: "Товары" },
    { path: "/seller/orders", icon: ShoppingBag, label: "Заказы", badge: sellerPendingCount },
    { path: "/seller/clients", icon: Users, label: "Клиенты" },
  ];

  return (
    <nav
      aria-label="Навигация кабинета продавца"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[#E4E1DA] bg-white/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map((item) => {
          const active = item.exact
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 px-1 pb-1.5 pt-2 text-[10px] font-medium transition-colors",
                active ? "text-[#1F3A2E]" : "text-[#8A8478]",
              )}
            >
              <span className="relative">
                <Icon className={cn("h-[21px] w-[21px]", active && "stroke-[2.2]")} aria-hidden="true" />
                {!!item.badge && item.badge > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E5453D] px-1 text-[9px] font-bold leading-none text-white">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </span>
              <span className="leading-none">{item.label}</span>
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-x-3 top-0 h-0.5 rounded-full transition-colors",
                  active ? "bg-[#1F3A2E]" : "bg-transparent",
                )}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
