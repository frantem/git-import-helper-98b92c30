import { forwardRef } from "react";
import { Home, LayoutGrid, ShoppingCart, User } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useSellerNavContext } from "@/hooks/useSellerNavContext";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", icon: Home, label: "Главная" },
  { path: "/catalog", icon: LayoutGrid, label: "Каталог" },
  { path: "/cart", icon: ShoppingCart, label: "Корзина", showBadge: true },
  { path: "/profile", icon: User, label: "Профиль" },
];

/** Дожидаемся появления блока каталога продавца и скроллим к нему. */
const scrollToSellerCatalog = (attempt = 0) => {
  const el = document.getElementById("seller-catalog");
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (attempt < 20) {
    setTimeout(() => scrollToSellerCatalog(attempt + 1), 150);
  }
};

export const BottomNavigation = forwardRef<HTMLElement, object>((_props, ref) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { totalItems } = useCart();
  const sellerCtx = useSellerNavContext();

  const sellerPath = sellerCtx ? `/seller/${sellerCtx.sellerSlug}` : null;
  const onSellerPage = !!sellerPath && location.pathname === sellerPath;

  return (
    <nav ref={ref} className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card shadow-lg md:hidden">
      <div className="flex items-center justify-around py-1.5 bg-[#faf5ea]">
        {navItems.map((item) => {
          const isSellerAnchor = !!sellerPath && (item.path === "/" || item.path === "/catalog");
          const to = isSellerAnchor ? sellerPath! : item.path;

          const isActive = onSellerPage
            ? item.path === "/"
            : location.pathname === item.path;
          const Icon = item.icon;
          const showBadge = item.showBadge && totalItems > 0;

          return (
            <Link
              key={item.path}
              to={to}
              onClick={(e) => {
                if (isSellerAnchor) {
                  const wantsCatalog = item.path === "/catalog";
                  if (onSellerPage) {
                    e.preventDefault();
                    if (wantsCatalog) {
                      scrollToSellerCatalog();
                    } else {
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                    return;
                  }
                  e.preventDefault();
                  navigate(sellerPath!);
                  if (wantsCatalog) {
                    scrollToSellerCatalog();
                  } else {
                    window.scrollTo({ top: 0 });
                  }
                  return;
                }

                if (location.pathname === item.path) {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
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
