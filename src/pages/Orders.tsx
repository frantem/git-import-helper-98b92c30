import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/priceUtils";
import { Package, ChevronRight, Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Order {
  id: string;
  total_amount: number;
  status: string;
  delivery_date: string | null;
  created_at: string;
  pickup_point: {
    name: string;
    address: string;
  } | null;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "Ожидает", color: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Подтверждён", color: "bg-blue-100 text-blue-700" },
  processing: { label: "В обработке", color: "bg-blue-100 text-blue-700" },
  collected: { label: "Собран", color: "bg-primary/10 text-primary" },
  delivered: { label: "Доставлен", color: "bg-success/10 text-success" },
  cancelled: { label: "Отменён", color: "bg-destructive/10 text-destructive" },
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
        created_at,
        pickup_point:pickup_points(name, address)
      `)
      .eq("buyer_id", user?.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setOrders(data as Order[]);
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

                  {order.pickup_point && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <MapPin className="h-4 w-4" />
                      <span>{order.pickup_point.name}</span>
                    </div>
                  )}

                  {order.delivery_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Доставка: {formatDate(order.delivery_date)}</span>
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
