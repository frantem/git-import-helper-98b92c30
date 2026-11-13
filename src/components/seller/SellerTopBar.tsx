import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface SellerTopBarProps {
  name?: string | null;
  slug?: string | null;
  className?: string;
}

function initials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "L";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Лёгкая шапка кабинета продавца: аватар-инициалы, название магазина
 * и переход на витрину. Никакого покупательского поиска и корзины.
 */
export function SellerTopBar({ name, slug, className }: SellerTopBarProps) {
  const { user } = useAuth();
  const [store, setStore] = useState<{ name: string; slug: string | null } | null>(
    name ? { name, slug: slug ?? null } : null,
  );

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

  return (
    <header className={cn("sticky top-0 z-40 border-b border-[#EEECE7] bg-[#FCFBF9]/95 backdrop-blur", className)}>
      <div className="mx-auto flex h-[64px] max-w-3xl items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1F3A2E] text-[13px] font-bold uppercase text-white">
            {initials(storeName)}
          </span>
          <span className="truncate text-[15px] font-semibold text-[#1A1A1A]">{storeName}</span>
        </div>

        {storefront && (
          <a
            href={storefront}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-[#E4E1DA] bg-white px-3 text-[13px] font-semibold text-[#1A1A1A] transition-colors hover:bg-[#F4F2ED]"
          >
            Витрина
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        )}
        {!storefront && (
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
