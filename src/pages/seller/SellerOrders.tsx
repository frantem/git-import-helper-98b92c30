import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/priceUtils";
import { BynSymbol } from "@/components/ui/byn-symbol";
import { ArrowLeft, Package, MapPin, Calendar, User, Truck, Check, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface SellerOrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  status: string;
  confirmed_at: string | null;
  variant_label: string | null;
  custom_fields: {
    fields?: Array<{ fieldId: string; label: string; value: string; fieldType: string }>;
    addons?: Array<{ addonId: string; name: string; price: number }>;
  } | null;
  product: { id: string; title: string; slug: string | null } | null;
}

interface SellerOrder {
  id: string;
  created_at: string;
  status: string;
  delivery_type: string;
  delivery_address: string | null;
  delivery_date: string | null;
  delivery_cost: number;
  notes: string | null;
  estimated_delivery_time: string | null;
  payment_method: string | null;
  referrer_farmer_name: string | null;
  pickup_point: { name: string; address: string; working_hours: string | null } | null;
  buyer: { full_name: string | null; phone: string | null } | null;
  items: SellerOrderItem[];
  itemsTotal: number;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "Ожидает", color: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Подтверждён", color: "bg-blue-100 text-blue-700" },
  processing: { label: "В обработке", color: "bg-blue-100 text-blue-700" },
  collected: { label: "Собран", color: "bg-primary/10 text-primary" },
  delivered: { label: "Доставлен", color: "bg-success/10 text-success" },
  cancelled: { label: "Отменён", color: "bg-destructive/10 text-destructive" },
};

export default function SellerOrders() {
  const { user, role, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    if (role !== "seller" && role !== "admin") { navigate("/"); return; }
    fetchOrders();
  }, [user, role, authLoading]);

  const fetchOrders = async () => {
    // Get farmer id
    const { data: farmer } = await supabase
      .from("farmers")
      .select("id")
      .eq("user_id", user!.id)
      .maybeSingle();

    if (!farmer) { setIsLoading(false); return; }
    setFarmerId(farmer.id);

    // Fetch order items for this farmer, with order + product info
    const { data: items, error } = await supabase
      .from("order_items")
      .select(`
        id, quantity, unit_price, status, confirmed_at, variant_label, custom_fields,
        product:products(id, title, slug),
        order:orders(id, created_at, status, delivery_type, delivery_address, delivery_date, delivery_cost, notes, estimated_delivery_time, payment_method, buyer_id, referrer_farmer_id,
          pickup_point:pickup_points(name, address, working_hours)
        )
      `)
      .eq("farmer_id", farmer.id)
      .order("created_at", { ascending: false });

    if (error || !items) {
      console.error("Error fetching seller orders:", error);
      setIsLoading(false);
      return;
    }

    const farmerId = farmer.id;

    // Group by order
    const orderMap = new Map<string, { order: any; items: SellerOrderItem[]; total: number }>();
    for (const item of items as any[]) {
      const o = item.order;
      if (!o?.id) continue;
      if (!orderMap.has(o.id)) {
        orderMap.set(o.id, { order: o, items: [], total: 0 });
      }
      const entry = orderMap.get(o.id)!;
      entry.items.push({
        id: item.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        status: item.status,
        confirmed_at: item.confirmed_at ?? null,
        variant_label: item.variant_label,
        custom_fields: item.custom_fields,
        product: item.product,
      });
      entry.total += item.unit_price * item.quantity;
    }


    // Fetch buyer profiles
    const buyerIds = [...new Set(Array.from(orderMap.values()).map(e => e.order.buyer_id))];
    const { data: profiles } = await supabase
      .rpc("get_buyer_profiles_for_seller", { _buyer_ids: buyerIds });
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    // Fetch referrer farmer names
    const referrerIds = [...new Set(
      Array.from(orderMap.values()).map(e => e.order.referrer_farmer_id).filter(Boolean)
    )] as string[];
    const referrerMap = new Map<string, string>();
    if (referrerIds.length > 0) {
      const { data: referrerFarmers } = await supabase
        .from("farmers")
        .select("id, name")
        .in("id", referrerIds);
      referrerFarmers?.forEach(f => referrerMap.set(f.id, f.name));
    }

    // Build final list sorted by date desc
    const result: SellerOrder[] = Array.from(orderMap.values())
      .map(e => {
        const buyer = profileMap.get(e.order.buyer_id) || null;
        return {
          id: e.order.id,
          created_at: e.order.created_at,
          status: e.order.status,
          delivery_type: e.order.delivery_type,
          delivery_address: e.order.delivery_address,
          delivery_date: e.order.delivery_date,
          delivery_cost: e.order.delivery_cost,
          notes: e.order.notes,
          estimated_delivery_time: e.order.estimated_delivery_time,
          payment_method: e.order.payment_method ?? null,
          referrer_farmer_name: e.order.referrer_farmer_id ? (referrerMap.get(e.order.referrer_farmer_id) || null) : null,
          pickup_point: e.order.pickup_point,
          buyer: buyer ? { full_name: buyer.full_name, phone: buyer.phone } : null,
          items: e.items,
          itemsTotal: e.total,
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setOrders(result);
    setIsLoading(false);
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("ru-RU", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

  const handleMarkCollected = async (itemId: string) => {
    setProcessingId(itemId);
    const { error } = await supabase
      .from("order_items")
      .update({ status: "collected" })
      .eq("id", itemId);
    if (error) toast.error("Ошибка при обновлении статуса");
    else { toast.success("Товар собран"); fetchOrders(); }
    setProcessingId(null);
  };

  const handleMarkDelivered = async (orderId: string) => {
    setProcessingId(orderId);
    const { error } = await supabase
      .from("orders")
      .update({ status: "delivered" })
      .eq("id", orderId);
    if (error) toast.error("Ошибка при обновлении статуса заказа");
    else { toast.success("Заказ выдан"); fetchOrders(); }
    setProcessingId(null);
  };

  const handleConfirmOrder = async (orderId: string) => {
    if (!farmerId) return;
    setProcessingId(orderId);
    const { error } = await supabase.rpc("confirm_order_items_for_farmer", {
      _order_id: orderId, _farmer_id: farmerId,
    });
    if (error) {
      toast.error("Не удалось подтвердить заказ");
    } else {
      await supabase.rpc("mark_order_confirmed_if_all", { _order_id: orderId });
      toast.success("Заказ подтверждён");
      fetchOrders();
    }
    setProcessingId(null);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Header />
        <main className="container mx-auto px-4 py-16 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />
      <main className="container mx-auto px-3 py-4 bg-[#faf5ea]">
        <div className="flex items-center gap-2 mb-4">
          <Link to="/seller">
            <Button variant="ghost" className="p-2 min-h-[44px] min-w-[44px]">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-foreground">Мои заказы</h1>
        </div>

        {orders.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">Нет заказов</div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const price = formatPrice(order.itemsTotal);
              const status = statusLabels[order.status] || statusLabels.pending;
              const allCollected = order.items.length > 0 && order.items.every(i => i.status === "collected");
              const allConfirmed = order.items.length > 0 && order.items.every(i => !!i.confirmed_at);
              const isSelfPickup = order.delivery_type === "self";
              const canMarkDelivered = isSelfPickup && allCollected && order.status !== "delivered";

              return (
                <div key={order.id} className="rounded-xl bg-card p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-sm text-muted-foreground">{formatDate(order.created_at)}</span>
                      <p className="text-lg font-bold text-foreground">
                        {price.formatted}<BynSymbol />
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                      {allCollected && (
                        <p className="text-xs text-success mt-1">✓ Все товары собраны</p>
                      )}
                    </div>
                  </div>

                  {/* Buyer info */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <User className="h-4 w-4" />
                    <span>{order.buyer?.full_name || "Покупатель"}</span>
                  </div>

                  {/* Delivery info */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Truck className="h-4 w-4" />
                    <span>
                    {order.delivery_type === "courier"
                      ? `Курьер (${order.delivery_cost ? (order.delivery_cost / 100) + " бел.руб." : "бесплатно"})`
                      : order.delivery_type === "pickup"
                        ? "Пункт выдачи"
                        : "Самовывоз"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Package className="h-4 w-4" />
                    <span>Оплата: {order.payment_method === "card" ? "Карта" : "Наличные"}</span>
                  </div>

                  {order.referrer_farmer_name && (
                    <div className="flex items-center gap-2 text-sm text-primary mb-2">
                      <User className="h-4 w-4" />
                      <span>Пришёл от: {order.referrer_farmer_name}</span>
                    </div>
                  )}

                  {order.pickup_point && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <MapPin className="h-4 w-4" />
                      <span>{order.pickup_point.name}</span>
                      {order.pickup_point.working_hours && (
                        <span className="text-xs">({order.pickup_point.working_hours})</span>
                      )}
                    </div>
                  )}

                  {order.delivery_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Calendar className="h-4 w-4" />
                      <span>Доставка: {new Date(order.delivery_date).toLocaleDateString("ru-RU")}</span>
                    </div>
                  )}

                  {order.notes && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <Package className="h-4 w-4" />
                      <span>{order.notes}</span>
                    </div>
                  )}

                  {order.estimated_delivery_time && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <Clock className="h-4 w-4 shrink-0" />
                      <span>Ожидаемое время: {order.estimated_delivery_time}</span>
                    </div>
                  )}

                  {/* Items */}
                  <div className="border-t border-border pt-3 space-y-1">
                    <p className="text-sm font-medium text-foreground mb-2">Мои товары:</p>

                    {!allConfirmed && (
                      <div className="mb-3">
                        <Button
                          onClick={() => handleConfirmOrder(order.id)}
                          disabled={processingId === order.id}
                          size="sm"
                          className="w-full"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Подтвердить заказ
                        </Button>
                      </div>
                    )}

                    {order.items.map((item) => {
                      const itemTotal = formatPrice(item.unit_price * item.quantity);
                      const isCollected = item.status === "collected";
                      const isConfirmed = !!item.confirmed_at;
                      return (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1 flex-1 min-w-0">
                            <span className={isCollected ? "text-success" : "text-muted-foreground"}>
                              {isCollected ? "✓" : "○"}
                            </span>
                            <Link
                              to={`/product/${item.product?.slug || item.product?.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-foreground truncate hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {item.product?.title}
                              {item.variant_label && <span className="text-muted-foreground"> ({item.variant_label})</span>}
                            </Link>
                            <span className="text-muted-foreground shrink-0">×{item.quantity}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-muted-foreground whitespace-nowrap">
                              {itemTotal.formatted}<BynSymbol />
                            </span>
                            {!isCollected && isConfirmed && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={processingId === item.id}
                                onClick={() => handleMarkCollected(item.id)}
                                className="h-7 px-2 text-xs"
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Собран
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}


                    {/* Custom fields / addons detail for each item */}
                    {order.items.map((item) => {
                      const hasFields = item.custom_fields?.fields && item.custom_fields.fields.length > 0;
                      const hasAddons = item.custom_fields?.addons && item.custom_fields.addons.length > 0;
                      if (!hasFields && !hasAddons) return null;
                      return (
                        <div key={`cf-${item.id}`} className="pl-5 space-y-0.5">
                          {item.custom_fields?.fields?.map((f, i) => (
                            <p key={i} className="text-xs text-muted-foreground">
                              {f.label}: <span className="font-medium">«{f.value}»</span>
                            </p>
                          ))}
                          {item.custom_fields?.addons?.map((a, i) => {
                            const ap = formatPrice(a.price);
                            return (
                              <p key={i} className="text-xs text-muted-foreground">
                                + {a.name}{a.price > 0 && <> ({ap.formatted}<BynSymbol />)</>}
                              </p>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>

                  {/* Выдан button for self-pickup */}
                  {canMarkDelivered && (
                    <div className="mt-4 pt-3 border-t border-border">
                      <Button
                        onClick={() => handleMarkDelivered(order.id)}
                        disabled={processingId === order.id}
                        className="w-full"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Выдан
                      </Button>
                    </div>
                  )}
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
