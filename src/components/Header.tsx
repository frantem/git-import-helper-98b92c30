import { Search, X, ShoppingCart } from "lucide-react";
import { useState, forwardRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { useCart } from "@/contexts/CartContext";
import { cn } from "@/lib/utils";

interface HeaderProps {
  variant?: "default" | "overlay";
}

export const Header = forwardRef<HTMLElement, HeaderProps>(function Header({ variant = "default" }, ref) {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { totalItems } = useCart();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  const isOverlay = variant === "overlay";

  return (
    <header
      ref={ref}
      className={cn(
        "z-50",
        isOverlay
          ? "absolute top-0 left-0 right-0 bg-transparent"
          : "sticky top-0 bg-card border-b border-border shadow-sm"
      )}
    >
      <div className="container flex items-center py-[4px] px-[4px] mx-0 gap-[4px]">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className={cn(
            "pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2",
            isOverlay ? "text-white" : "text-muted-foreground"
          )} />
          <Input
            type="text"
            placeholder="Поиск продуктов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "h-8 w-full rounded-2xl pl-9 pr-9 text-sm focus-visible:ring-primary",
              isOverlay
                ? "bg-black/45 backdrop-blur-md border-white/10 text-white placeholder:text-white/80 shadow-md"
                : "bg-primary-foreground placeholder:text-muted-foreground"
            )}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2",
                isOverlay ? "text-white/80 hover:text-white" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        {/* Cart - desktop only */}
        <Link
          to="/cart"
          className={cn(
            "relative hidden flex-shrink-0 rounded-full p-2 md:flex",
            isOverlay
              ? "bg-background/70 backdrop-blur-md text-foreground hover:bg-background/90"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          <ShoppingCart className="h-6 w-6" />
          {totalItems > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {totalItems > 99 ? "99+" : totalItems}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
});

Header.displayName = "Header";
