import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice, kopecksToRublesString, parseRublesToKopecks } from "@/lib/priceUtils";
import { BynSymbol } from "@/components/ui/byn-symbol";
import {
  ArrowLeft, Package, MapPin, Calendar, User, Truck, Check, Clock,
  CheckCircle2, Phone, MessageSquare, Pencil, Trash2, Plus, Save, X,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

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
  notes: string | null;
  estimated_delivery_time: string | null;
  payment_method: string | null;
  confirmation_method: string | null;
  referrer_farmer_name: string | null;
  pickup_point: { name: string; address: string; working_hours: string | null } | null;
  buyer: { full_name: string | null; phone: string | null } | null;
  items: SellerOrderItem[];
  itemsTotal: number;
}

interface SellerProductOption {
  id: string;
  title: string;
  price: number;
  unit: string | null;
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

  const [qtyEdits, setQtyEdits] = useState<Record<string, string>>({});
  const [labelEdits, setLabelEdits] = useState<Record<string, string>>({});
  const [priceEdits, setPriceEdits] = useState<Record<string, string>>({});
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const [editingSchedule, setEditingSchedule] = useState<{ id: string; date: string; time: string } | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);

  const [addingToOrderId, setAddingToOrderId] = useState<string | null>(null);
  const [myProducts, setMyProducts] = useState<SellerProductOption[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [addQty, setAddQty] = useState("1");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    if (role !== "seller" && role !== "admin") { navigate("/"); return; }
    fetchOrders();
  }, [user, role, authLoading]);

  const fetchOrders = async () => {
    const { data: farmer } = await supabase
      .from("farmers")
      .select("id")
      .eq("user_id", user!.id)
      .maybeSingle();

    if (!farmer) { setIsLoading(false); return; }
    setFarmerId(farmer.id);

    const { data: items, error } = await supabase
      .from("order_items")
      .select(`
        id, quantity, unit_price, status, confirmed_at, variant_label, custom_fields,
        product:products(id, title, slug),
        order:orders(id, created_at, status, delivery_type, delivery_address, delivery_date, notes, estimated_delivery_time, payment_method, confirmation_method, buyer_id, referrer_farmer_id,
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

    const buyerIds = [...new Set(Array.from(orderMap.values()).map(e => e.order.buyer_id))];
    const { data: profiles } = await supabase
      .rpc("get_buyer_profiles_for_seller", { _buyer_ids: buyerIds });
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

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
          notes: e.order.notes,
          estimated_delivery_time: e.order.estimated_delivery_time,
          payment_method: e.order.payment_method ?? null,
          confirmation_method: e.order.confirmation_method ?? null,
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

  const recalcOrderTotal = async (orderId: string) => {
    const { data: allItems } = await supabase
      .from("order_items")
      .select("unit_price, quantity")
      .eq("order_id", orderId);
    const { data: order } = await supabase
      .from("orders")
      .select("delivery_cost")
      .eq("id", orderId)
      .maybeSingle();
    const itemsSum = (allItems || []).reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
    const { error } = await supabase
      .from("orders")
      .update({ total_amount: itemsSum + (order?.delivery_cost || 0), updated_at: new Date().toISOString() })
      .eq("id", orderId);
    if (error) throw error;
  };

  const handleUpdateItem = async (orderId: string, item: SellerOrderItem) => {
    const update: { quantity?: number; unit_price?: number; variant_label?: string | null } = {};

    const qtyStr = qtyEdits[item.id];
    if (qtyStr !== undefined) {
      const qty = Math.floor(Number(qtyStr));
      if (!Number.isFinite(qty) || qty < 1) {
        toast.error("Количество должно быть не меньше 1");
        return;
      }
      update.quantity = qty;
    }

    const labelStr = labelEdits[item.id];
    if (labelStr !== undefined) {
      const trimmed = labelStr.trim();
      update.variant_label = trimmed === "" ? null : trimmed.slice(0, 100);
    }

    const priceStr = priceEdits[item.id];
    if (priceStr !== undefined) {
      const kopecks = parseRublesToKopecks(priceStr);
      if (!Number.isFinite(kopecks) || kopecks < 0) {
        toast.error("Укажите корректную цену");
        return;
      }
      update.unit_price = kopecks;
    }

    if (Object.keys(update).length === 0) { setEditingItemId(null); return; }

    setProcessingId(item.id);
    try {
      const { error } = await supabase.from("order_items").update(update).eq("id", item.id);
      if (error) throw error;
      await recalcOrderTotal(orderId);
      toast.success("Позиция обновлена");
      clearItemEdits(item.id);
      setEditingItemId(null);
      await fetchOrders();
    } catch (err) {
      console.error(err);
      toast.error("Не удалось обновить позицию");
    }
    setProcessingId(null);
  };

  const clearItemEdits = (itemId: string) => {
    setQtyEdits(prev => { const n = { ...prev }; delete n[itemId]; return n; });
    setLabelEdits(prev => { const n = { ...prev }; delete n[itemId]; return n; });
    setPriceEdits(prev => { const n = { ...prev }; delete n[itemId]; return n; });
  };

  const handleDeleteItem = async (orderId: string, itemId: string) => {
    setProcessingId(itemId);
    try {
      const { error } = await supabase.from("order_items").delete().eq("id", itemId);
      if (error) throw error;
      await recalcOrderTotal(orderId);
      toast.success("Товар удалён из заказа");
      clearItemEdits(itemId);
      await fetchOrders();
    } catch (err) {
      console.error(err);
      toast.error("Не удалось удалить товар");
    }
    setProcessingId(null);
  };

  const openAddProduct = async (orderId: string) => {
    setAddingToOrderId(orderId);
    setProductSearch("");
    setSelectedProductId(null);
    setAddQty("1");
    if (!farmerId) return;
    const { data } = await supabase
      .from("products")
      .select("id, title, price, unit")
      .eq("farmer_id", farmerId)
      .eq("is_active", true)
      .eq("is_deleted", false)
      .order("title");
    setMyProducts(data || []);
  };

  const handleAddItem = async () => {
    if (!addingToOrderId || !farmerId) return;
    const product = myProducts.find(p => p.id === selectedProductId);
    if (!product) { toast.error("Выберите товар"); return; }
    const qty = Math.floor(Number(addQty));
    if (!Number.isFinite(qty) || qty < 1) { toast.error("Количество должно быть не меньше 1"); return; }

    const orderId = addingToOrderId;
    setProcessingId(orderId);
    try {
      const { error } = await supabase.from("order_items").insert({
        order_id: orderId,
        product_id: product.id,
        farmer_id: farmerId,
        quantity: qty,
        unit_price: product.price,
        status: "pending",
        confirmed_at: new Date().toISOString(),
      });
      if (error) throw error;
      await recalcOrderTotal(orderId);
      toast.success(`Товар «${product.title}» добавлен`);
      setAddingToOrderId(null);
      await fetchOrders();
    } catch (err) {
      console.error(err);
      toast.error("Не удалось добавить товар");
    }
    setProcessingId(null);
  };

  const handleSaveSchedule = async () => {
    if (!editingSchedule) return;
    setSavingSchedule(true);
    const newDate = editingSchedule.date.trim() || null;
    const newTime = editingSchedule.time.trim() || null;
    const { error } = await supabase
      .from("orders")
      .update({ delivery_date: newDate, estimated_delivery_time: newTime })
      .eq("id", editingSchedule.id);
    setSavingSchedule(false);
    if (error) {
      toast.error("Не удалось сохранить изменения");
      return;
    }
    setOrders(prev => prev.map(o => o.id === editingSchedule.id
      ? { ...o, delivery_date: newDate, estimated_delivery_time: newTime }
      : o));
    setEditingSchedule(null);
    toast.success("Дата и время обновлены");
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

  const handleMarkCollected = async (order: SellerOrder) => {
    setProcessingId(order.id);
    const ids = order.items.map(i => i.id);
    const { error } = await supabase
      .from("order_items")
      .update({ status: "collected" })
      .in("id", ids);
    if (error) toast.error("Не удалось обновить статус");
    else { toast.success("Заказ собран"); await fetchOrders(); }
    setProcessingId(null);
  };

  const handleMarkDelivered = async (orderId: string) => {
    setProcessingId(orderId);
    const { error } = await supabase
      .from("orders")
      .update({ status: "delivered" })
      .eq("id", orderId);
    if (error) {
      toast.error("Не удалось обновить статус заказа");
      setProcessingId(null);
      return;
    }
    try {
      const resp = await supabase.functions.invoke("send-review-request", {
        body: { order_id: orderId },
      });
      if (resp.error) console.error("Review request error:", resp.error);
    } catch (err) {
      console.error("Review request failed:", err);
    }
    toast.success("Заказ доставлен");
    await fetchOrders();
    setProcessingId(null);
  };

  const handleCancelOrder = async (orderId: string) => {
    setProcessingId(orderId);
    const { error } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId);
    if (error) toast.error("Не удалось отменить заказ");
    else { toast.success("Заказ отменён"); await fetchOrders(); }
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

  const filteredProducts = myProducts.filter(p =>
    p.title.toLowerCase().includes(productSearch.trim().toLowerCase())
  );

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
              const isDelivered = order.status === "delivered";
              const isCancelled = order.status === "cancelled";
              const canEdit = !isDelivered && !isCancelled;
              const isBusy = processingId === order.id;

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
                      {allCollected && !isDelivered && (
                        <p className="text-xs text-success mt-1">✓ Заказ собран</p>
                      )}
                    </div>
                  </div>

                  {/* Buyer info */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <User className="h-4 w-4" />
                    <span>{order.buyer?.full_name || "Покупатель"}</span>
                  </div>

                  {order.buyer?.phone ? (
                    <a
                      href={`tel:${order.buyer.phone}`}
                      className="flex items-center gap-2 text-sm text-primary hover:underline mb-2"
                    >
                      <Phone className="h-4 w-4" />
                      <span>{order.buyer.phone}</span>
                    </a>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Phone className="h-4 w-4" />
                      <span>Телефон не указан</span>
                    </div>
                  )}

                  {order.confirmation_method && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>
                        Подтверждение заказа: {order.confirmation_method === "message" ? "Написать" : "Позвонить"}
                      </span>
                    </div>
                  )}

                  {/* Delivery info */}
                  <div className="flex items-start gap-2 text-sm text-muted-foreground mb-2">
                    <Truck className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>
                      {order.delivery_type === "self"
                        ? "Самовывоз"
                        : order.delivery_address
                          ? `Доставка: ${order.delivery_address}`
                          : "Доставка"}
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

                  {/* Date / time with edit */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>
                      {order.delivery_date
                        ? new Date(order.delivery_date).toLocaleDateString("ru-RU")
                        : "Дата не указана"}
                    </span>
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => setEditingSchedule({
                          id: order.id,
                          date: order.delivery_date ?? "",
                          time: order.estimated_delivery_time ?? "",
                        })}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  {order.estimated_delivery_time && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Clock className="h-4 w-4 shrink-0" />
                      <span>Время: {order.estimated_delivery_time}</span>
                    </div>
                  )}

                  {order.notes && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground mb-3">
                      <Package className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{order.notes}</span>
                    </div>
                  )}

                  {/* Items */}
                  <div className="border-t border-border pt-3 space-y-2">
                    <p className="text-sm font-medium text-foreground">Мои товары:</p>

                    {order.items.map((item) => {
                      const itemTotal = formatPrice(item.unit_price * item.quantity);
                      const isCollected = item.status === "collected";
                      const isEditing = editingItemId === item.id;

                      if (isEditing) {
                        return (
                          <div key={item.id} className="rounded-lg border border-border p-2 space-y-2">
                            <p className="text-sm font-medium text-foreground">{item.product?.title}</p>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <Label className="text-xs">Кол-во</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  className="h-9"
                                  value={qtyEdits[item.id] ?? String(item.quantity)}
                                  onChange={(e) => setQtyEdits(p => ({ ...p, [item.id]: e.target.value }))}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Вес / вариант</Label>
                                <Input
                                  className="h-9"
                                  placeholder="1,5 кг"
                                  value={labelEdits[item.id] ?? (item.variant_label ?? "")}
                                  onChange={(e) => setLabelEdits(p => ({ ...p, [item.id]: e.target.value }))}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Цена</Label>
                                <Input
                                  className="h-9"
                                  inputMode="decimal"
                                  value={priceEdits[item.id] ?? kopecksToRublesString(item.unit_price)}
                                  onChange={(e) => setPriceEdits(p => ({ ...p, [item.id]: e.target.value }))}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                disabled={processingId === item.id}
                                onClick={() => handleUpdateItem(order.id, item)}
                              >
                                <Save className="h-3.5 w-3.5 mr-1" />
                                Сохранить
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { clearItemEdits(item.id); setEditingItemId(null); }}
                              >
                                <X className="h-3.5 w-3.5 mr-1" />
                                Отмена
                              </Button>
                              <AlertDialog>
                                <Button
                                  asChild
                                  size="sm"
                                  variant="outline"
                                  className="ml-auto text-destructive"
                                >
                                  <span>
                                    <AlertDialogTriggerInner />
                                  </span>
                                </Button>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Удалить товар из заказа?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Позиция «{item.product?.title}» будет удалена, сумма заказа пересчитается.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteItem(order.id, item.id)}>
                                      Удалить
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        );
                      }

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
                            {canEdit && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2"
                                onClick={() => setEditingItemId(item.id)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Custom fields / addons */}
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

                    {canEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => openAddProduct(order.id)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Добавить товар
                      </Button>
                    )}
                  </div>

                  {/* Action buttons */}
                  {canEdit && (
                    <div className="mt-4 pt-3 border-t border-border space-y-2">
                      {!allConfirmed ? (
                        <Button
                          onClick={() => handleConfirmOrder(order.id)}
                          disabled={isBusy}
                          className="w-full"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Подтвердить заказ
                        </Button>
                      ) : !allCollected ? (
                        <Button
                          onClick={() => handleMarkCollected(order)}
                          disabled={isBusy}
                          className="w-full"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Собран
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleMarkDelivered(order.id)}
                          disabled={isBusy}
                          className="w-full"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Доставлен
                        </Button>
                      )}

                      <AlertDialog>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Отменить заказ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Заказ будет помечен как отменённый. Отменить это действие нельзя.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Нет</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleCancelOrder(order.id)}>
                              Отменить заказ
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Schedule dialog */}
      <Dialog open={!!editingSchedule} onOpenChange={(open) => !open && setEditingSchedule(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Дата и время</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Дата</Label>
              <Input
                type="date"
                value={editingSchedule?.date ?? ""}
                onChange={(e) => setEditingSchedule(s => s ? { ...s, date: e.target.value } : s)}
              />
            </div>
            <div>
              <Label className="text-xs">Время</Label>
              <Input
                placeholder="например: 14:00–16:00"
                value={editingSchedule?.time ?? ""}
                onChange={(e) => setEditingSchedule(s => s ? { ...s, time: e.target.value } : s)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSchedule(null)}>Отмена</Button>
            <Button onClick={handleSaveSchedule} disabled={savingSchedule}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add product dialog */}
      <Dialog open={!!addingToOrderId} onOpenChange={(open) => !open && setAddingToOrderId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Добавить товар в заказ</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Поиск по названию"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
            <div className="max-h-64 overflow-y-auto rounded-lg border border-border divide-y divide-border">
              {filteredProducts.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">Товары не найдены</p>
              ) : filteredProducts.map((p) => {
                const pp = formatPrice(p.price);
                const selected = selectedProductId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProductId(p.id)}
                    className={`w-full text-left p-3 text-sm flex items-center justify-between gap-2 ${selected ? "bg-primary/10" : ""}`}
                  >
                    <span className="truncate text-foreground">{p.title}</span>
                    <span className="text-muted-foreground whitespace-nowrap">
                      {pp.formatted}<BynSymbol />{p.unit ? ` / ${p.unit}` : ""}
                    </span>
                  </button>
                );
              })}
            </div>
            <div>
              <Label className="text-xs">Количество</Label>
              <Input
                type="number"
                min={1}
                value={addQty}
                onChange={(e) => setAddQty(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddingToOrderId(null)}>Отмена</Button>
            <Button onClick={handleAddItem} disabled={!selectedProductId || processingId === addingToOrderId}>
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>
  );
}
