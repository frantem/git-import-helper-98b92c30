import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  Copy,
  CreditCard,
  LayoutGrid,
  LogOut,
  Menu,
  Package,
  Palette,
  Send,
  Settings,
  ShoppingBag,
  Truck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface SellerTopBarProps {
  name?: string | null;
  slug?: string | null;
  className?: string;
}

const MENU = [
  { icon: LayoutGrid, label: "Кабинет", to: "/seller" },
  { icon: Package, label: "Товары", to: "/seller/products" },
  { icon: ShoppingBag, label: "Заказы", to: "/seller/orders" },
  { icon: Users, label: "Клиенты", to: "/seller/clients" },
  { icon: Truck, label: "Способы получения и доставка", to: "/seller/delivery" },
  { icon: Settings, label: "Информация на витрине", to: "/seller/settings" },
  { icon: Palette, label: "Оформление витрины", to: "/seller/page" },
  { icon: CreditCard, label: "Тариф и подписка", to: "/seller/tariffs" },
  { icon: Send, label: "Сторис для соцсетей", to: "/seller/story" },
];

/**
 * Шапка кабинета продавца: бургер с инструментами, название магазина
 * и быстрый переход на витрину.
 */
export function SellerTopBar({ name, slug, className }: SellerTopBarProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [store, setStore] = useState<{ name: string; slug: string | null } | null>(
    name ? { name, slug: slug ?? null } : null,
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (name) {
      setStore({ name, slug: slug ?? null });
      return;
    }
    if (!user) return;
    let cancelled = false;
    void supabase
      .from("farmers")
      .select("name, slug")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setStore({ name: data.name, slug: (data as { slug?: string }).slug ?? null });
      });
    return () => {
      cancelled = true;
    };
  }, [user, name, slug]);

  const storeName = store?.name ?? "Кабинет";
  const storefront = store?.slug ? `/seller/${store.slug}` : null;
  const storefrontUrl = storefront ? `${window.location.origin}${storefront}` : null;

  const copyLink = async () => {
    if (!storefrontUrl) return;
    try {
      await navigator.clipboard.writeText(storefrontUrl);
      toast.success("Ссылка скопирована!");
    } catch {
      toast.error("Не удалось скопировать ссылку");
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    setMenuOpen(false);
    navigate("/", { replace: true });
  };

  return (
    <header className={cn("sticky top-0 z-40 border-b border-[#EEECE7] bg-[#FCFBF9]/95 backdrop-blur", className)}>
      <div className="mx-auto flex h-[60px] max-w-3xl items-center justify-between gap-3 px-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Меню кабинета"
              className="-ml-1 flex h-10 w-10 items-center justify-center rounded-xl text-[#1A1A1A] transition-colors hover:bg-[#F1EFEA]"
            >
              <Menu className="h-5 w-5" />
            </button>

            <SheetContent side="left" className="flex w-[86%] max-w-sm flex-col border-r-0 bg-[#FCFBF9] p-0">
              <SheetHeader className="border-b border-[#EAE7E0] px-4 pb-4 pt-5 pr-12 text-left">
                <SheetTitle className="truncate text-[17px] font-bold text-[#1A1A1A]">{storeName}</SheetTitle>
                {storefrontUrl ? (
                  <button
                    type="button"
                    onClick={copyLink}
                    className="mt-1 inline-flex items-center gap-1.5 text-[12.5px] text-[#6B655C]"
                  >
                    <span className="truncate">locusfood.by/seller/{store?.slug}</span>
                    <Copy className="h-3.5 w-3.5 shrink-0" />
                  </button>
                ) : (
                  <Link to="/seller/settings" className="mt-1 text-[12.5px] text-[#6B655C]">
                    Настройте ссылку витрины
                  </Link>
                )}
              </SheetHeader>

              <nav className="flex-1 overflow-y-auto px-2 py-3">
                {MENU.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SheetClose asChild key={item.to}>
                      <Link
                        to={item.to}
                        className="flex items-center gap-3 rounded-xl px-3 py-3 text-[14.5px] font-medium text-[#1A1A1A] transition-colors hover:bg-[#F1EFEA]"
                      >
                        <Icon className="h-[18px] w-[18px] text-[#5B564C]" />
                        {item.label}
                      </Link>
                    </SheetClose>
                  );
                })}
              </nav>

              <div className="mt-auto border-t border-[#EAE7E0] p-3">
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[14.5px] font-medium text-[#C0392B] transition-colors hover:bg-[#FDECEA] disabled:opacity-60"
                >
                  <LogOut className="h-[18px] w-[18px]" />
                  {signingOut ? "Выходим…" : "Выйти из аккаунта"}
                </button>
              </div>
            </SheetContent>
          </Sheet>

          <span className="truncate text-[15px] font-semibold text-[#1A1A1A]">{storeName}</span>
        </div>

        {storefront ? (
          <a
            href={storefront}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-[#E4E1DA] bg-white px-3 text-[13px] font-semibold text-[#1A1A1A] transition-colors hover:bg-[#F4F2ED]"
          >
            Витрина
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        ) : (
          <Link
            to="/seller/settings"
            className="inline-flex h-9 shrink-0 items-center rounded-full border border-[#E4E1DA] bg-white px-3 text-[13px] font-semibold text-[#1A1A1A]"
          >
            Настроить
          </Link>
        )}
      </div>
    </header>
  );
}
