import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BynSymbol } from "@/components/ui/byn-symbol";
import { useAuth } from "@/contexts/AuthContext";
import { useCommission, useSettleItem, type CommissionItem } from "@/hooks/useCommission";
import { formatPriceString } from "@/lib/priceUtils";
import { Loader2, ChevronDown, ChevronRight, Wallet } from "lucide-react";
import { toast } from "@/hooks/use-toast";

function fmt(kopecks: number) {
  return (
    <>
      {formatPriceString(kopecks)}
      <BynSymbol />
    </>
  );
}

function dateLabel(iso: string | null) {
  if (!iso) return "Без даты";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "long",
      weekday: "short",
      timeZone: "Europe/Minsk",
    }).format(d);
  } catch {
    return iso;
  }
}

function ItemRow({ item, mode }: { item: CommissionItem; mode: "payout" | "debt" }) {
  const settle = useSettleItem();
  const value = mode === "payout" ? item.payout : item.commission;
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-t first:border-t-0">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">
          {item.product_title}
          {item.variant_label ? <span className="text-muted-foreground"> · {item.variant_label}</span> : null}
        </div>
        <div className="text-xs text-muted-foreground">
          {item.quantity} × {fmt(item.unit_price)} = {fmt(item.subtotal)}
          {" · "}
          <span className={item.is_referral ? "text-primary font-medium" : ""}>
            {item.is_referral ? "реф. 5%" : "10%"}
          </span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-bold text-sm whitespace-nowrap">{fmt(value)}</div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 mt-1 text-xs"
          disabled={settle.isPending}
          onClick={() =>
            settle.mutate(
              { itemId: item.item_id, settled: true },
              {
                onSuccess: () => toast({ title: "Отмечено как рассчитано" }),
                onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
              }
            )
          }
        >
          Рассчитано
        </Button>
      </div>
    </div>
  );
}

function SellerGroup({
  farmerName,
  items,
  mode,
}: {
  farmerName: string;
  items: CommissionItem[];
  mode: "payout" | "debt";
}) {
  const [open, setOpen] = useState(true);
  const total = items.reduce((s, i) => s + (mode === "payout" ? i.payout : i.commission), 0);
  return (
    <div className="rounded-xl bg-card p-3 mb-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2 min-w-0">
          {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
          <span className="font-semibold truncate">{farmerName}</span>
          <Badge variant="secondary" className="shrink-0">{items.length}</Badge>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-muted-foreground">
            {mode === "payout" ? "к выплате" : "забрать"}
          </div>
          <div className="font-bold">{fmt(total)}</div>
        </div>
      </button>
      {open && (
        <div className="mt-2">
          {items.map((it) => (
            <ItemRow key={it.item_id} item={it} mode={mode} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminCommission() {
  const { user, role, isLoading } = useAuth();
  const { data: items, isLoading: itemsLoading } = useCommission();

  const { byDay, debtByFarmer, totals } = useMemo(() => {
    const list = items ?? [];
    const pickup = list.filter((i) => i.delivery_type === "pickup");
    const self = list.filter((i) => i.delivery_type === "self");

    // Группировка моей доставки по дню → продавцу
    const byDayMap = new Map<string, Map<string, CommissionItem[]>>();
    for (const it of pickup) {
      const day = it.delivery_date ?? "";
      if (!byDayMap.has(day)) byDayMap.set(day, new Map());
      const m = byDayMap.get(day)!;
      if (!m.has(it.farmer_id)) m.set(it.farmer_id, []);
      m.get(it.farmer_id)!.push(it);
    }
    const byDay = Array.from(byDayMap.entries())
      .sort((a, b) => (a[0] || "9999").localeCompare(b[0] || "9999"))
      .map(([day, sellers]) => ({
        day,
        sellers: Array.from(sellers.entries()).map(([fid, items]) => ({
          farmer_id: fid,
          farmer_name: items[0].farmer_name,
          items,
        })),
      }));

    // Долги продавцов за самовывоз
    const debtMap = new Map<string, CommissionItem[]>();
    for (const it of self) {
      if (!debtMap.has(it.farmer_id)) debtMap.set(it.farmer_id, []);
      debtMap.get(it.farmer_id)!.push(it);
    }
    const debtByFarmer = Array.from(debtMap.entries())
      .map(([fid, items]) => ({
        farmer_id: fid,
        farmer_name: items[0].farmer_name,
        items,
        total: items.reduce((s, i) => s + i.commission, 0),
      }))
      .sort((a, b) => b.total - a.total);

    const totalPayout = pickup.reduce((s, i) => s + i.payout, 0);
    const totalMyCommissionPickup = pickup.reduce((s, i) => s + i.commission, 0);
    const totalDebt = self.reduce((s, i) => s + i.commission, 0);

    return {
      byDay,
      debtByFarmer,
      totals: { totalPayout, totalMyCommissionPickup, totalDebt },
    };
  }, [items]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (role !== "admin") return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Комиссия</h1>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-xl bg-card p-3">
            <div className="text-[11px] text-muted-foreground">Отдать продавцам</div>
            <div className="font-bold">{fmt(totals.totalPayout)}</div>
          </div>
          <div className="rounded-xl bg-card p-3">
            <div className="text-[11px] text-muted-foreground">Моя комиссия (доставка)</div>
            <div className="font-bold">{fmt(totals.totalMyCommissionPickup)}</div>
          </div>
          <div className="rounded-xl bg-card p-3">
            <div className="text-[11px] text-muted-foreground">Долги (самовывоз)</div>
            <div className="font-bold">{fmt(totals.totalDebt)}</div>
          </div>
        </div>

        <Tabs defaultValue="payouts">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="payouts">К расчёту по дням</TabsTrigger>
            <TabsTrigger value="debts">Долги (самовывоз)</TabsTrigger>
          </TabsList>

          <TabsContent value="payouts" className="mt-4">
            {itemsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : byDay.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Нет активных заказов с доставкой</p>
            ) : (
              byDay.map(({ day, sellers }) => {
                const dayTotalPayout = sellers.reduce(
                  (s, sg) => s + sg.items.reduce((a, i) => a + i.payout, 0),
                  0,
                );
                return (
                  <div key={day} className="mb-5">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <h2 className="font-bold text-lg">{dateLabel(day)}</h2>
                      <div className="text-sm text-muted-foreground">
                        итого: <span className="font-bold text-foreground">{fmt(dayTotalPayout)}</span>
                      </div>
                    </div>
                    {sellers.map((sg) => (
                      <SellerGroup
                        key={sg.farmer_id + day}
                        farmerName={sg.farmer_name}
                        items={sg.items}
                        mode="payout"
                      />
                    ))}
                  </div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="debts" className="mt-4">
            {itemsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : debtByFarmer.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Нет долгов за самовывозы</p>
            ) : (
              debtByFarmer.map((sg) => (
                <SellerGroup
                  key={sg.farmer_id}
                  farmerName={sg.farmer_name}
                  items={sg.items}
                  mode="debt"
                />
              ))
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-6 text-center">
          <Link to="/admin">
            <Button variant="ghost" size="sm">← В админ-панель</Button>
          </Link>
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
}
