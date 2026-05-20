import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice, kopecksToRublesString, parseRublesToKopecks } from "@/lib/priceUtils";
import { BynSymbol } from "@/components/ui/byn-symbol";
import { ArrowLeft, Package, MapPin, Calendar, User, Phone, Mail, Check, Truck, Trash2, Clock, Plus, Save, Banknote, Pencil } from "lucide-react";
import { OrderItemCustomFields } from "@/components/OrderItemCustomFields";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  status: string;
  variant_label: string | null;
  custom_fields: {
    fields?: Array<{ fieldId: string; label: string; value: string; fieldType: string }>;
    addons?: Array<{ addonId: string; name: string; price: number }>;
  } | null;
  farmer_id: string;
  product: { title: string } | null;
  farmer: { name: string; user_id: string | null } | null;
}

interface Order {
  id: string;
  total_amount: number;
  status: string;
  delivery_date: string | null;
  delivery_type: string;
  delivery_address: string | null;
  delivery_cost: number;
  notes: string | null;
  estimated_delivery_time: string | null;
  created_at: string;
  buyer_id: string;
  payment_method: string | null;
  confirmation_method: string | null;
  referrer_farmer_id: string | null;
  referrer_farmer_name: string | null;
  pickup_point: {
    name: string;
    address: string;
    working_hours: string | null;
  } | null;
  buyer: {
    phone: string | null;
    full_name: string | null;
    email: string | null;
  } | null;
  order_items: OrderItem[];
}

type FarmerPhoneMap = Map<string, string>;

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "Ожидает", color: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Подтверждён", color: "bg-blue-100 text-blue-700" },
  processing: { label: "В обработке", color: "bg-blue-100 text-blue-700" },
  collected: { label: "Собран", color: "bg-primary/10 text-primary" },
  delivered: { label: "Доставлен", color: "bg-success/10 text-success" },
  cancelled: { label: "Отменён", color: "bg-destructive/10 text-destructive" },
};

export default function AdminOrders() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [farmerPhones, setFarmerPhones] = useState<FarmerPhoneMap>(new Map());
  const [qtyEdits, setQtyEdits] = useState<Record<string, number>>({});
  const [labelEdits, setLabelEdits] = useState<Record<string, string>>({});
  const [priceEdits, setPriceEdits] = useState<Record<string, string>>({});
  const [addProductInputs, setAddProductInputs] = useState<Record<string, { productId: string; qty: number }>>({});

  useEffect(() => {
    if (!user || role !== "admin") {
      navigate("/");
      return;
    }
    fetchOrders();
  }, [user, role]);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        total_amount,
        status,
        delivery_date,
        delivery_type,
        delivery_address,
        delivery_cost,
        notes,
        estimated_delivery_time,
        created_at,
        buyer_id,
        payment_method,
        confirmation_method,
        referrer_farmer_id,
        pickup_point:pickup_points(name, address, working_hours),
        order_items(
          id,
          quantity,
          unit_price,
          status,
          variant_label,
          custom_fields,
          farmer_id,
          product:products(title),
          farmer:farmers(name, user_id)
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error);
      setIsLoading(false);
      return;
    }

    // Fetch buyer profiles separately
    if (data && data.length > 0) {
      const buyerIds = [...new Set(data.map(order => order.buyer_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, phone, full_name, email")
        .in("user_id", buyerIds);

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Fetch farmer phones
      const farmerUserIds = [...new Set(
        data.flatMap(order => 
          order.order_items
            .map((item: any) => item.farmer?.user_id)
            .filter(Boolean)
        )
      )];
      
      if (farmerUserIds.length > 0) {
        const { data: farmerProfiles } = await supabase
          .from("profiles")
          .select("user_id, phone")
          .in("user_id", farmerUserIds);
        
        const phoneMap = new Map<string, string>();
        farmerProfiles?.forEach(p => {
          if (p.phone) phoneMap.set(p.user_id, p.phone);
        });
        setFarmerPhones(phoneMap);
      }

      // Fetch referrer farmer names
      const referrerIds = [...new Set(data.map(o => (o as any).referrer_farmer_id).filter(Boolean))];
      let referrerMap = new Map<string, string>();
      if (referrerIds.length > 0) {
        const { data: referrerFarmers } = await supabase
          .from("farmers")
          .select("id, name")
          .in("id", referrerIds);
        referrerFarmers?.forEach(f => referrerMap.set(f.id, f.name));
      }

      const ordersWithBuyers = data.map(order => ({
        ...order,
        buyer: profilesMap.get(order.buyer_id) || null,
        referrer_farmer_name: (order as any).referrer_farmer_id ? referrerMap.get((order as any).referrer_farmer_id) || null : null,
      }));

      setOrders(ordersWithBuyers as Order[]);
    } else {
      setOrders([]);
    }
    setIsLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleConfirmOrder = async (orderId: string) => {
    setProcessingOrderId(orderId);
    const { error } = await supabase
      .from("orders")
      .update({ status: "confirmed" })
      .eq("id", orderId);

    if (error) {
      toast.error("Ошибка при подтверждении заказа");
      console.error(error);
    } else {
      toast.success("Заказ подтверждён");
      fetchOrders();
    }
    setProcessingOrderId(null);
  };

  const handleDeliverOrder = async (order: Order) => {
    setProcessingOrderId(order.id);

    // Update order status
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: "delivered" })
      .eq("id", order.id);

    if (updateError) {
      toast.error("Ошибка при обновлении статуса заказа");
      console.error(updateError);
      setProcessingOrderId(null);
      return;
    }

    // Send email notification only for pickup orders
    if (order.delivery_type === "pickup") {
      if (order.buyer?.email) {
        try {
          const response = await supabase.functions.invoke("send-delivery-notification", {
            body: { order_id: order.id },
          });

          if (response.error) {
            console.error("Email notification error:", response.error);
            toast.warning("Статус обновлён, но email не отправлен");
          } else {
            toast.success("Заказ прибыл в ПВЗ, покупатель уведомлён");
          }
        } catch (err) {
          console.error("Failed to send notification:", err);
          toast.success("Статус обновлён");
        }
      } else {
        toast.success("Статус обновлён (email покупателя не найден)");
      }
    } else {
      const label = order.delivery_type === "self" ? "Заказ выдан" : "Заказ доставлен";
      toast.success(label);
    }

    // Send review request email for ALL delivery types
    if (order.buyer?.email) {
      try {
        const reviewResp = await supabase.functions.invoke("send-review-request", {
          body: { order_id: order.id },
        });
        if (reviewResp.error) {
          console.error("Review request email error:", reviewResp.error);
          toast.warning("Письмо с просьбой об отзыве не отправлено");
        }
      } catch (err) {
        console.error("Failed to send review request:", err);
      }
    }

    fetchOrders();
    setProcessingOrderId(null);
  };

  const handleDeleteOrder = async (orderId: string) => {
    setProcessingOrderId(orderId);

    // First delete order items
    const { error: itemsError } = await supabase
      .from("order_items")
      .delete()
      .eq("order_id", orderId);

    if (itemsError) {
      toast.error("Ошибка при удалении товаров заказа");
      console.error(itemsError);
      setProcessingOrderId(null);
      return;
    }

    // Then delete the order
    const { error: orderError } = await supabase
      .from("orders")
      .delete()
      .eq("id", orderId);

    if (orderError) {
      toast.error("Ошибка при удалении заказа");
      console.error(orderError);
    } else {
      toast.success("Заказ удалён");
      fetchOrders();
    }
    setProcessingOrderId(null);
  };

  const recalcOrderTotal = async (orderId: string) => {
    const { data: items } = await supabase
      .from("order_items")
      .select("unit_price, quantity")
      .eq("order_id", orderId);
    const { data: order } = await supabase
      .from("orders")
      .select("delivery_cost")
      .eq("id", orderId)
      .single();
    const itemsSum = (items || []).reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
    const deliveryCost = order?.delivery_cost || 0;
    const { error } = await supabase
      .from("orders")
      .update({ total_amount: itemsSum + deliveryCost, updated_at: new Date().toISOString() })
      .eq("id", orderId);
    if (error) {
      console.error("recalcOrderTotal error:", error);
      throw error;
    }
  };

  const handleUpdateItem = async (orderId: string, itemId: string) => {
    const update: { quantity?: number; unit_price?: number; variant_label?: string | null } = {};

    const editedQty = qtyEdits[itemId];
    if (editedQty !== undefined) {
      if (editedQty < 1 || !Number.isFinite(editedQty)) {
        toast.error("Количество должно быть не меньше 1");
        return;
      }
      update.quantity = Math.floor(editedQty);
    }

    const editedLabel = labelEdits[itemId];
    if (editedLabel !== undefined) {
      const trimmed = editedLabel.trim();
      update.variant_label = trimmed === "" ? null : trimmed.slice(0, 100);
    }

    const editedPriceStr = priceEdits[itemId];
    if (editedPriceStr !== undefined) {
      const kopecks = parseRublesToKopecks(editedPriceStr);
      if (kopecks < 0 || !Number.isFinite(kopecks)) {
        toast.error("Цена должна быть положительным числом");
        return;
      }
      update.unit_price = kopecks;
    }

    if (Object.keys(update).length === 0) return;

    setProcessingOrderId(orderId);
    try {
      const { error } = await supabase
        .from("order_items")
        .update(update)
        .eq("id", itemId);
      if (error) throw error;
      await recalcOrderTotal(orderId);
      toast.success("Позиция обновлена");
      setQtyEdits(prev => { const n = { ...prev }; delete n[itemId]; return n; });
      setLabelEdits(prev => { const n = { ...prev }; delete n[itemId]; return n; });
      setPriceEdits(prev => { const n = { ...prev }; delete n[itemId]; return n; });
      await fetchOrders();
    } catch (err) {
      console.error(err);
      toast.error("Ошибка при обновлении позиции");
    }
    setProcessingOrderId(null);
  };

  const handleDeleteItem = async (orderId: string, itemId: string) => {
    setProcessingOrderId(orderId);
    try {
      const { error } = await supabase
        .from("order_items")
        .delete()
        .eq("id", itemId);
      if (error) throw error;
      await recalcOrderTotal(orderId);
      toast.success("Товар удалён из заказа");
      await fetchOrders();
    } catch (err) {
      console.error(err);
      toast.error("Ошибка при удалении товара");
    }
    setProcessingOrderId(null);
  };

  const handleAddItem = async (orderId: string) => {
    const input = addProductInputs[orderId];
    if (!input || !input.productId.trim()) {
      toast.error("Введите ID товара");
      return;
    }
    const qty = input.qty || 1;
    if (qty < 1) {
      toast.error("Количество должно быть не меньше 1");
      return;
    }
    setProcessingOrderId(orderId);
    try {
      const { data: product, error: prodErr } = await supabase
        .from("products")
        .select("id, title, price, farmer_id")
        .eq("id", input.productId.trim())
        .maybeSingle();
      if (prodErr) throw prodErr;
      if (!product) {
        toast.error("Товар с таким ID не найден");
        setProcessingOrderId(null);
        return;
      }
      if (!product.farmer_id) {
        toast.error("У товара не указан продавец");
        setProcessingOrderId(null);
        return;
      }
      const { error: insertErr } = await supabase
        .from("order_items")
        .insert({
          order_id: orderId,
          product_id: product.id,
          farmer_id: product.farmer_id,
          quantity: qty,
          unit_price: product.price,
          status: "pending",
        });
      if (insertErr) throw insertErr;
      await recalcOrderTotal(orderId);
      toast.success(`Товар "${product.title}" добавлен`);
      setAddProductInputs(prev => ({ ...prev, [orderId]: { productId: "", qty: 1 } }));
      await fetchOrders();
    } catch (err) {
      console.error(err);
      toast.error("Ошибка при добавлении товара");
    }
    setProcessingOrderId(null);
  };

  if (isLoading) {
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

      <main className="container mx-auto px-3 py-4">
        <div className="flex items-center gap-2 mb-4">
          <Link to="/admin">
            <Button variant="ghost" className="p-2 min-h-[44px] min-w-[44px]">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-foreground">Все заказы</h1>
        </div>

        {orders.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            Нет заказов
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const price = formatPrice(order.total_amount);
              const status = statusLabels[order.status] || statusLabels.pending;
              const allItemsCollected = order.order_items.length > 0 && order.order_items.every(item => item.status === "collected");
              const isProcessing = processingOrderId === order.id;

              return (
                <div key={order.id} className="rounded-xl bg-card p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(order.created_at)}
                      </span>
                      <p className="text-lg font-bold text-foreground">
                        {price.formatted}<BynSymbol />
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                      {allItemsCollected && (
                        <p className="text-xs text-success mt-1">✓ Все товары собраны</p>
                      )}
                    </div>
                  </div>

                  {/* Buyer info with phone */}
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
                      <span>Не указан</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Mail className="h-4 w-4" />
                    <span>{order.buyer?.email || "Не указан"}</span>
                  </div>

                  {/* Delivery type info */}
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

                  {/* Payment method on delivery */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Banknote className="h-4 w-4" />
                    <span>
                      Оплата при получении: {order.payment_method === "card" ? "Карта" : "Наличные"}
                    </span>
                  </div>

                  {/* Confirmation method */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Phone className="h-4 w-4" />
                    <span>
                      Подтверждение заказа: {order.confirmation_method === "message" ? "Написать" : "Позвонить"}
                    </span>
                  </div>

                  {order.delivery_type === "courier" && order.delivery_address && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <MapPin className="h-4 w-4" />
                      <span>{order.delivery_address}</span>
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

                  {order.referrer_farmer_name && (
                    <div className="flex items-center gap-2 text-sm text-primary mb-3">
                      <User className="h-4 w-4" />
                      <span>Пришёл от: {order.referrer_farmer_name}</span>
                    </div>
                  )}

                  {/* Order items grouped by farmer */}
                  <div className="border-t border-border pt-3 space-y-3">
                    <p className="text-sm font-medium text-foreground">Товары:</p>
                    {(() => {
                      // Group items by farmer
                      const groups = new Map<string, { name: string; phone: string | null; items: typeof order.order_items; total: number }>();
                      order.order_items.forEach(item => {
                        const key = item.farmer?.name || "Неизвестный";
                        if (!groups.has(key)) {
                          const farmerUserId = item.farmer?.user_id;
                          const phone = farmerUserId ? farmerPhones.get(farmerUserId) || null : null;
                          groups.set(key, { name: key, phone, items: [], total: 0 });
                        }
                        const group = groups.get(key)!;
                        group.items.push(item);
                        group.total += item.unit_price * item.quantity;
                      });
                      
                      return Array.from(groups.values()).map((group, gi) => {
                        const groupPrice = formatPrice(group.total);
                        const last4 = group.phone ? group.phone.slice(-5) : null;
                        return (
                          <div key={gi} className="space-y-1">
                            <div className="flex items-center justify-between text-sm font-medium">
                              <span className="text-foreground">
                                {group.name}
                                {last4 && <span className="text-muted-foreground ml-1">••{last4}</span>}
                              </span>
                              <span className="text-foreground">
                                {groupPrice.formatted}<BynSymbol />
                              </span>
                            </div>
                            {group.items.map(item => {
                              const itemTotal = formatPrice(item.unit_price * item.quantity);
                              const editedQty = qtyEdits[item.id];
                              const currentQty = editedQty ?? item.quantity;
                              const editedLabel = labelEdits[item.id];
                              const currentLabel = editedLabel ?? (item.variant_label ?? "");
                              const editedPrice = priceEdits[item.id];
                              const currentPrice = editedPrice ?? kopecksToRublesString(item.unit_price);
                              const hasChange =
                                (editedQty !== undefined && editedQty !== item.quantity) ||
                                (editedLabel !== undefined && editedLabel.trim() !== (item.variant_label ?? "")) ||
                                (editedPrice !== undefined && parseRublesToKopecks(editedPrice) !== item.unit_price);
                              return (
                                <div key={item.id} className="border-l-2 border-border pl-2 py-1">
                                  <div className="flex items-center justify-between text-sm gap-2 flex-wrap">
                                    <div className="flex items-center gap-1 min-w-0 flex-1">
                                      <span className={item.status === "collected" ? "text-success" : "text-muted-foreground"}>
                                        {item.status === "collected" ? "✓" : "○"}
                                      </span>
                                      <span className="text-foreground truncate">
                                        {item.product?.title}
                                        {item.variant_label && <span className="text-muted-foreground">({item.variant_label})</span>}
                                      </span>
                                    </div>
                                    <span className="text-muted-foreground whitespace-nowrap text-xs">
                                      = {itemTotal.formatted}<BynSymbol />
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-end gap-2 mt-1 pl-5">
                                    <div className="flex flex-col">
                                      <label className="text-[10px] text-muted-foreground">Кол-во</label>
                                      <Input
                                        type="number"
                                        min={1}
                                        value={currentQty}
                                        onChange={(e) => {
                                          const v = parseInt(e.target.value, 10);
                                          setQtyEdits(prev => ({ ...prev, [item.id]: isNaN(v) ? 1 : v }));
                                        }}
                                        className="h-8 w-16 text-sm"
                                        disabled={isProcessing}
                                      />
                                    </div>
                                    <div className="flex flex-col">
                                      <label className="text-[10px] text-muted-foreground">Вес/вариант</label>
                                      <Input
                                        type="text"
                                        value={currentLabel}
                                        placeholder="напр. 958"
                                        onChange={(e) => {
                                          setLabelEdits(prev => ({ ...prev, [item.id]: e.target.value }));
                                        }}
                                        className="h-8 w-24 text-sm"
                                        disabled={isProcessing}
                                      />
                                    </div>
                                    <div className="flex flex-col">
                                      <label className="text-[10px] text-muted-foreground">Цена, BYN</label>
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        value={currentPrice}
                                        onChange={(e) => {
                                          setPriceEdits(prev => ({ ...prev, [item.id]: e.target.value }));
                                        }}
                                        className="h-8 w-20 text-sm"
                                        disabled={isProcessing}
                                      />
                                    </div>
                                    {hasChange && (
                                      <Button
                                        size="sm"
                                        onClick={() => handleUpdateItem(order.id, item.id)}
                                        disabled={isProcessing}
                                        className="h-8 px-2"
                                      >
                                        <Save className="h-3 w-3 mr-1" />
                                        Сохранить
                                      </Button>
                                    )}
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          disabled={isProcessing}
                                          className="h-8 px-2 ml-auto"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Удалить товар из заказа?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            "{item.product?.title}" будет удалён из заказа. Сумма пересчитается автоматически.
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
                                  <OrderItemCustomFields customFields={item.custom_fields} className="pl-5 space-y-0.5 mt-1" />
                                </div>
                              );
                            })}
                          </div>
                        );
                      });
                    })()}

                    {/* Add product by ID */}
                    <div className="border-t border-border pt-3 mt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Добавить товар по ID:</p>
                      <div className="flex flex-wrap gap-2">
                        <Input
                          placeholder="UUID товара"
                          value={addProductInputs[order.id]?.productId || ""}
                          onChange={(e) => setAddProductInputs(prev => ({
                            ...prev,
                            [order.id]: { productId: e.target.value, qty: prev[order.id]?.qty || 1 }
                          }))}
                          className="h-9 flex-1 min-w-[200px] text-xs font-mono"
                          disabled={isProcessing}
                        />
                        <Input
                          type="number"
                          min={1}
                          placeholder="Кол-во"
                          value={addProductInputs[order.id]?.qty || 1}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            setAddProductInputs(prev => ({
                              ...prev,
                              [order.id]: { productId: prev[order.id]?.productId || "", qty: isNaN(v) ? 1 : v }
                            }));
                          }}
                          className="h-9 w-20"
                          disabled={isProcessing}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleAddItem(order.id)}
                          disabled={isProcessing}
                          className="h-9"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Добавить
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border">
                    {order.status === "pending" && (
                      <>
                        <Button
                          onClick={() => handleConfirmOrder(order.id)}
                          disabled={isProcessing}
                          className="flex items-center gap-1"
                        >
                          <Check className="h-4 w-4" />
                          Подтвердить
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              disabled={isProcessing}
                              className="flex items-center gap-1"
                            >
                              <Trash2 className="h-4 w-4" />
                              Удалить
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Удалить заказ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Это действие нельзя отменить. Заказ будет полностью удалён.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteOrder(order.id)}>
                                Удалить
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}

                    {order.status === "confirmed" && order.delivery_type !== "self" && (
                      <Button
                        onClick={() => handleDeliverOrder(order)}
                        disabled={isProcessing}
                        className="flex items-center gap-1"
                      >
                        <Truck className="h-4 w-4" />
                        {order.delivery_type === "pickup" ? "Прибыл в ПВЗ" : "Доставлен"}
                      </Button>
                    )}
                  </div>
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
