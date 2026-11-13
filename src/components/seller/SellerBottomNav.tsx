import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ExternalLink, LayoutDashboard, Package, ShoppingBag, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePendingOrdersCount } from "@/hooks/usePendingOrdersCount";
import { cn } from "@/lib/utils";

interface SellerBottomNavProps {
  /** Слаг магазина; если не передан — берём по текущему продавцу. */
  slug?: string | null;
}

/**
 * Нижняя навигация кабинета продавца.
 *
 * Рабочая панель без покупательских разделов: дашборд, товары, заказы,
 * клиенты и переход на свою витрину. На десктопе не показывается —
 * там продавец ходит по боковому меню.
 */
export function SellerBottomNav({ slug: slugProp }: SellerBottomNavProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { sellerPendingCount } = usePendingOrdersCount();
  const [slug, setSlug] = useState<string | null>(slugProp ?? null);

  useEffect(() => {
    if (slugProp) {
      setSlug(slugProp);
      return;
    }
    if (!user) return;
    let cancelled = false;
    void supabase
      .from("farmers")
      .select("slug")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setSlug((data as { slug?: string } | null)?.slug ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [user, slugProp]);

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
                <Icon className={cn("h-[20px] w-[20px]", active && "stroke-[2.2]")} aria-hidden="true" />
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

        <a
          href={slug ? `/seller/${slug}` : "/seller/page"}
          target={slug ? "_blank" : undefined}
          rel={slug ? "noreferrer" : undefined}
          className="relative flex flex-1 flex-col items-center gap-0.5 px-1 pb-1.5 pt-2 text-[10px] font-medium text-[#8A8478] transition-colors"
        >
          <ExternalLink className="h-[20px] w-[20px]" aria-hidden="true" />
          <span className="leading-none">Витрина</span>
        </a>
      </div>
    </nav>
  );
}
