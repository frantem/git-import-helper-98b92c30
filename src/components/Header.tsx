import { Search, X, ShoppingCart } from "lucide-react";
import { useState, forwardRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { useCart } from "@/contexts/CartContext";

export const Header = forwardRef<HTMLElement, object>(function Header(_props, ref) {
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

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-3 py-2 flex items-center gap-3">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Поиск продуктов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-xl bg-[#bdf31b] pl-10 pr-10 text-sm placeholder:text-muted-foreground focus-visible:ring-primary"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        {/* Cart - desktop only */}
        <Link
          to="/cart"
          className="relative hidden flex-shrink-0 rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground md:flex"
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