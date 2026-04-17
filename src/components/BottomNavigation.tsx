import { forwardRef } from "react";
import { Home, LayoutGrid, ShoppingCart, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", icon: Home, label: "Главная" },
  { path: "/catalog", icon: LayoutGrid, label: "Каталог" },
  { path: "/cart", icon: ShoppingCart, label: "Корзина", showBadge: true },
  { path: "/profile", icon: User, label: "Профиль" },
];

export const BottomNavigation = forwardRef<HTMLElement, object>((_props, ref) => {
  const location = useLocation();
  const { totalItems } = useCart();

  return (
    <nav ref={ref} className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card shadow-lg md:hidden">
      <div className="flex items-center justify-around py-1.5 bg-[#faf5ea]">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          const showBadge = item.showBadge && totalItems > 0;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-4 py-1 transition-colors",
                isActive ? "text-accent" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <Icon className={cn("h-6 w-6", isActive && "stroke-[2.5px]")} />
                {showBadge && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-primary-foreground bg-[#ab5a3f]">
                    {totalItems > 99 ? "99+" : totalItems}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[10px]",
                isActive ? "font-semibold" : "font-medium"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      {/* Safe area for iPhone */}
      <div className="h-safe-area-inset-bottom bg-card" />
    </nav>
  );
});

BottomNavigation.displayName = "BottomNavigation";