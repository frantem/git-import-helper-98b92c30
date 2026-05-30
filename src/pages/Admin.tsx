import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Link, Navigate } from "react-router-dom";
import { LayoutDashboard, MapPin, Users, Loader2, ShoppingBag, Image, Settings, Package, Wallet } from "lucide-react";
import { usePendingOrdersCount } from "@/hooks/usePendingOrdersCount";


export default function Admin() {
  const { user, role, isLoading } = useAuth();
  const { adminPendingCount } = usePendingOrdersCount();
  

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (role !== "admin") {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Header />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-xl font-bold mb-2">Доступ запрещён</h1>
          <p className="text-muted-foreground mb-4">Эта страница доступна только администраторам</p>
          <Link to="/"><Button>На главную</Button></Link>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Админ-панель</h1>

        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link to="/admin/orders" className="flex items-center gap-4 rounded-xl bg-card p-6 relative">
            <ShoppingBag className="h-8 w-8 text-primary" />
            <div className="flex-1">
              <h3 className="font-bold">Заказы</h3>
              <p className="text-sm text-muted-foreground">Все заказы пользователей</p>
            </div>
            {adminPendingCount > 0 && (
              <span className="bg-destructive text-destructive-foreground text-sm font-bold px-2.5 py-1 rounded-full">
                {adminPendingCount}
              </span>
            )}
          </Link>
          
          <Link to="/admin/products" className="flex items-center gap-4 rounded-xl bg-card p-6">
            <Package className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-bold">Товары</h3>
              <p className="text-sm text-muted-foreground">Все товары на сайте</p>
            </div>
          </Link>
          
          <Link to="/admin/banners" className="flex items-center gap-4 rounded-xl bg-card p-6">
            <Image className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-bold">Баннеры</h3>
              <p className="text-sm text-muted-foreground">Карусель на главной</p>
            </div>
          </Link>
          
          <Link to="/admin/blocks" className="flex items-center gap-4 rounded-xl bg-card p-6">
            <LayoutDashboard className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-bold">Блоки главной</h3>
              <p className="text-sm text-muted-foreground">Категории и товары</p>
            </div>
          </Link>
          
          <Link to="/admin/pickup-points" className="flex items-center gap-4 rounded-xl bg-card p-6">
            <MapPin className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-bold">Пункты выдачи</h3>
              <p className="text-sm text-muted-foreground">Управление пунктами</p>
            </div>
          </Link>
          
          <Link to="/admin/sellers" className="flex items-center gap-4 rounded-xl bg-card p-6">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-bold">Продавцы</h3>
              <p className="text-sm text-muted-foreground">Управление продавцами</p>
            </div>
          </Link>
          
          <Link to="/admin/settings" className="flex items-center gap-4 rounded-xl bg-card p-6">
            <Settings className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-bold">Настройки</h3>
              <p className="text-sm text-muted-foreground">Время развоза и др.</p>
            </div>
          </Link>
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
}
