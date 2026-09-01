import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, Phone } from "lucide-react";

type ClientStatus = "new" | "regular" | "lost";

interface Client {
  userId: string;
  name: string;
  phone: string | null;
  ordersCount: number;
  lastOrderAt: string;
  daysSinceLast: number;
  status: ClientStatus;
}

const STATUS_META: Record<ClientStatus, { label: string; className: string }> = {
  new: { label: "Новый", className: "bg-blue-100 text-blue-700" },
  regular: { label: "Постоянный", className: "bg-success/10 text-success" },
  lost: { label: "Пропавший", className: "bg-destructive/10 text-destructive" },
};

const FILTERS: Array<{ key: "all" | ClientStatus; label: string }> = [
  { key: "all", label: "Все" },
  { key: "new", label: "Новые" },
  { key: "regular", label: "Постоянные" },
  { key: "lost", label: "Пропавшие" },
];

/** Дата в минском времени, формат ДД.ММ.ГГГГ */
function formatMinskDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    timeZone: "Europe/Minsk",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function pluralOrders(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "заказ";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "заказа";
  return "заказов";
}

export default function SellerClients() {
  const { user, role, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | ClientStatus>("all");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    if (role !== "seller" && role !== "admin") { navigate("/"); return; }

    const fetchClients = async () => {
      const { data: farmer } = await supabase
        .from("farmers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!farmer) { setIsLoading(false); return; }

      const { data: items, error } = await supabase
        .from("order_items")
        .select("id, order:orders(id, created_at, status, buyer_id)")
        .eq("farmer_id", farmer.id);

      if (error || !items) {
        console.error("Error fetching seller clients:", error);
        setIsLoading(false);
        return;
      }

      // Уникальные заказы (без отменённых), сгруппированные по покупателю
      const seenOrders = new Set<string>();
      const agg = new Map<string, { count: number; last: string }>();

      for (const item of items as any[]) {
        const o = item.order;
        if (!o?.id || !o.buyer_id) continue;
        if (o.status === "cancelled") continue;
        if (seenOrders.has(o.id)) continue;
        seenOrders.add(o.id);

        const entry = agg.get(o.buyer_id);
        if (!entry) {
          agg.set(o.buyer_id, { count: 1, last: o.created_at });
        } else {
          entry.count += 1;
          if (new Date(o.created_at) > new Date(entry.last)) entry.last = o.created_at;
        }
      }

      const buyerIds = Array.from(agg.keys());
      if (buyerIds.length === 0) {
        setClients([]);
        setIsLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .rpc("get_buyer_profiles_for_seller", { _buyer_ids: buyerIds });
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      const now = Date.now();
      const list: Client[] = buyerIds.map((id) => {
        const { count, last } = agg.get(id)!;
        const profile: any = profileMap.get(id);
        const daysSinceLast = Math.floor((now - new Date(last).getTime()) / 86_400_000);
        const status: ClientStatus =
          daysSinceLast > 60 ? "lost" : count === 1 ? "new" : "regular";
        return {
          userId: id,
          name: profile?.full_name || "Без имени",
          phone: profile?.phone || null,
          ordersCount: count,
          lastOrderAt: last,
          daysSinceLast,
          status,
        };
      });

      list.sort((a, b) => new Date(b.lastOrderAt).getTime() - new Date(a.lastOrderAt).getTime());
      setClients(list);
      setIsLoading(false);
    };

    fetchClients();
  }, [user, role, authLoading]);

  const counts = useMemo(() => ({
    all: clients.length,
    new: clients.filter((c) => c.status === "new").length,
    regular: clients.filter((c) => c.status === "regular").length,
    lost: clients.filter((c) => c.status === "lost").length,
  }), [clients]);

  const visible = useMemo(() => {
    if (filter === "all") return clients;
    const filtered = clients.filter((c) => c.status === filter);
    if (filter === "lost") {
      // Самые давние — сверху
      return [...filtered].sort(
        (a, b) => new Date(a.lastOrderAt).getTime() - new Date(b.lastOrderAt).getTime()
      );
    }
    return filtered;
  }, [clients, filter]);

  if (authLoading || isLoading || planState.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!planState.canUseClients) {
    return (
      <div className="min-h-screen pb-20 md:pb-0 bg-[#faf5ea]">
        <Header />
        <main className="container mx-auto px-4 py-6">
          <Link to="/seller" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            Панель продавца
          </Link>
          <div className="rounded-xl bg-card p-6 text-center">
            <Lock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <h1 className="text-xl font-bold mb-2">База клиентов доступна на Standard</h1>
            <p className="mb-4 text-sm text-muted-foreground">
              Подключите тариф Standard или запустите бесплатный пробный период на 14 дней —
              вся история заказов уже сохранена.
            </p>
            <Button onClick={() => navigate("/seller/tariffs")}>Посмотреть тарифы</Button>
          </div>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0 bg-[#faf5ea]">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <Link to="/seller" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          Панель продавца
        </Link>

        <h1 className="text-2xl font-bold mb-4">Клиенты</h1>

        <div className="mb-4 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground"
              }`}
            >
              {f.label} ({counts[f.key]})
            </button>
          ))}
        </div>

        {clients.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">Пока нет клиентов</p>
        ) : visible.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">В этой категории никого нет</p>
        ) : (
          <div className="space-y-2">
            {visible.map((c) => {
              const meta = STATUS_META[c.status];
              return (
                <div key={c.userId} className="rounded-xl bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-foreground">{c.name}</h3>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${meta.className}`}>
                      {meta.label}
                    </span>
                  </div>

                  {c.phone && (
                    <a
                      href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}
                      className="mt-1 inline-flex items-center gap-1.5 text-sm text-primary"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {c.phone}
                    </a>
                  )}

                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.ordersCount} {pluralOrders(c.ordersCount)} · последний {formatMinskDate(c.lastOrderAt)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <BottomNavigation />
    </div>
  );
}
