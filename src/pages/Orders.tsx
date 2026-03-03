import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/priceUtils";
import { Package, Calendar, MapPin, Truck, Store } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  variant_label: string | null;
  product: { title: string } | null;
}

interface Order {
  id: string;
  total_amount: number;
  status: string;
  delivery_date: string | null;
  delivery_type: string;
  delivery_address: string | null;
  notes: string | null;
  created_at: string;
  pickup_point: {
    name: string;
    address: string;
  } | null;
  items: OrderItem[];
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "Ожидает", color: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Подтверждён", color: "bg-blue-100 text-blue-700" },
  processing: { label: "В обработке", color: "bg-blue-100 text-blue-700" },
  collected: { label: "Собран", color: "bg-primary/10 text-primary" },
  delivered: { label: "Доставлен", color: "bg-success/10 text-success" },
  cancelled: { label: "Отменён", color: "bg-destructive/10 text-destructive" },
};

const deliveryTypeLabels: Record<string, { label: string; icon: typeof MapPin }> = {
  pickup: { label: "Пункт выдачи", icon: MapPin },
  courier: { label: "Доставка курьером", icon: Truck },
  self: { label: "Самовывоз у фермера", icon: Store },
};

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOrders();
    } else {
      setIsLoading(false);
    }
  }, [user]);

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
        notes,
        created_at,
        pickup_point:pickup_points(name, address),
        items:order_items(id, quantity, unit_price, variant_label, product:products(title))
      `)
      .eq("buyer_id", user?.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setOrders(data as unknown as Order[]);
    }
    setIsLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Header />
        <main className="container mx-auto px-4 py-16 text-center">
          <Package className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">Войдите в аккаунт</h1>
          <p className="text-muted-foreground mb-4">
            Чтобы просматривать заказы, необходимо авторизоваться
          </p>
          <Link to="/auth">
            <Button>Войти</Button>
          </Link>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />

      <main className="container mx-auto px-3 py-4">
        <PageHeader title="Мои заказы" />

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center">
            <Package className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium text-foreground mb-2">У вас пока нет заказов</h2>
            <p className="text-muted-foreground mb-4">
              Перейдите в каталог и выберите свежие продукты
            </p>
            <Link to="/catalog">
              <Button>Перейти в каталог</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const price = formatPrice(order.total_amount);
              const status = statusLabels[order.status] || statusLabels.pending;
              const deliveryInfo = deliveryTypeLabels[order.delivery_type] || deliveryTypeLabels.pickup;
              const DeliveryIcon = deliveryInfo.icon;

              return (
                <div
                  key={order.id}
                  className="rounded-2xl bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-sm text-muted-foreground">
                        Заказ от {formatDate(order.created_at)}
                      </span>
                      <p className="text-lg font-bold text-foreground">
                        {price.rubles} р. {price.kopecks > 0 && `${price.kopecks} к.`}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.color}`}>
                      {status.label}
                    </span>
                  </div>

                  {/* Delivery type */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <DeliveryIcon className="h-4 w-4 shrink-0" />
                    <span>{deliveryInfo.label}</span>
                  </div>

                  {/* Pickup point or delivery address */}
                  {order.delivery_type === "pickup" && order.pickup_point && (
                    <p className="ml-6 text-sm text-muted-foreground mb-1">
                      {order.pickup_point.name}, {order.pickup_point.address}
                    </p>
                  )}
                  {order.delivery_type === "courier" && order.delivery_address && (
                    <p className="ml-6 text-sm text-muted-foreground mb-1">
                      {order.delivery_address}
                    </p>
                  )}

                  {/* Delivery date */}
                  {order.delivery_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span>
                        {order.delivery_type === "self" ? "Забрать" : "Доставка"}:{" "}
                        {formatDate(order.delivery_date)}
                      </span>
                    </div>
                  )}

                  {/* Items list */}
                  {order.items && order.items.length > 0 && (
                    <div className="mt-2 border-t border-border pt-2 space-y-1">
                      {order.items.map((item) => {
                        const itemPrice = formatPrice(item.unit_price * item.quantity);
                        const title = item.product?.title || "Товар";
                        const label = item.variant_label ? `${title} (${item.variant_label})` : title;

                        return (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-foreground">
                              {label} × {item.quantity}
                            </span>
                            <span className="text-muted-foreground whitespace-nowrap ml-2">
                              {itemPrice.rubles} р.
                            </span>
                          </div>
                        );
                      })}
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
