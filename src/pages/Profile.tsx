import { User, Package, Heart, Settings, ChevronRight, Store, LogOut, Clock, Check, X, Shield } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePendingOrdersCount } from "@/hooks/usePendingOrdersCount";

const menuItems = [
{ icon: Package, label: "Мои заказы", path: "/orders" },
{ icon: Heart, label: "Избранное", path: "/favorites" },
{ icon: Settings, label: "Настройки", path: "/settings" }];


interface SellerApplication {
  id: string;
  status: string;
  created_at: string;
}

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
}

export default function Profile() {
  const { user, role, signOut, isSigningOut } = useAuth();
  const navigate = useNavigate();
  const [application, setApplication] = useState<SellerApplication | null>(null);
  const [isLoadingApplication, setIsLoadingApplication] = useState(false);
  const [isLoadingApplication, setIsLoadingApplication] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const { adminPendingCount, sellerPendingCount } = usePendingOrdersCount();

  // Fetch user's profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data } = await supabase.
      from("profiles").
      select("full_name, avatar_url").
      eq("user_id", user.id).
      maybeSingle();

      if (data) {
        setProfile(data);
      }
    };

    fetchProfile();
  }, [user]);

  // Fetch user's seller application status
  useEffect(() => {
    const fetchApplication = async () => {
      if (!user) return;

      setIsLoadingApplication(true);
      const { data } = await supabase.
      from("seller_applications").
      select("id, status, created_at").
      eq("user_id", user.id).
      order("created_at", { ascending: false }).
      limit(1).
      single();

      if (data) {
        setApplication(data);
      }
      setIsLoadingApplication(false);
    };

    fetchApplication();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
  };

  const renderApplicationStatus = () => {
    if (!application) return null;

    if (application.status === "pending") {
      return (
        <div className="mb-4 rounded-2xl bg-warning/10 p-4 flex items-center gap-3">
          <Clock className="h-6 w-6 text-warning" />
          <div className="flex-1">
            <h3 className="font-bold text-foreground">Заявка на рассмотрении</h3>
            <p className="text-xs text-muted-foreground">
              Ожидайте звонка менеджера для подтверждения
            </p>
          </div>
        </div>);

    }

    if (application.status === "rejected") {
      return (
        <div className="mb-4 rounded-2xl bg-destructive/10 p-4 flex items-center gap-3">
          <X className="h-6 w-6 text-destructive" />
          <div className="flex-1">
            <h3 className="font-bold text-foreground">Заявка отклонена</h3>
            <p className="text-xs text-muted-foreground">
              Вы можете подать новую заявку
            </p>
          </div>
        </div>);

    }

    return null;
  };

  // Check if user can apply (no pending application)
  const canApply = !application || application.status === "rejected";

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />

      <main className="container mx-auto px-3 py-4">
        {/* User info */}
        <div className="mb-4 flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary overflow-hidden">
            {profile?.avatar_url ?
            <img
              src={profile.avatar_url}
              alt="Аватар"
              className="h-full w-full object-cover" /> :


            <User className="h-7 w-7 text-muted-foreground" />
            }
          </div>
          <div className="flex-1">
            {user ?
            <>
                <h1 className="text-base font-bold text-foreground">
                  {profile?.full_name || user.email}
                </h1>
                <p className="text-sm text-muted-foreground capitalize">
                  {role === "seller" ? "Продавец" : role === "admin" ? "Администратор" : "Покупатель"}
                </p>
              </> :

            <>
                <h1 className="text-base font-bold text-foreground">Войти в аккаунт</h1>
                <p className="text-xs text-muted-foreground">
                  Для заказов и персональных предложений
                </p>
              </>
            }
          </div>
          {!user &&
          <Link to="/auth">
              <Button size="sm">Войти</Button>
            </Link>
          }
        </div>

        {/* Menu items */}
        <div className="space-y-2 mb-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={user ? item.path : "/auth"}
                className="flex items-center gap-3 rounded-2xl bg-card p-3.5 shadow-sm transition-shadow hover:shadow-md">

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <span className="flex-1 text-sm font-medium text-foreground">{item.label}</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Link>);

          })}
        </div>

        {/* Seller section - for approved sellers */}
        {user && role === "seller" &&
        <Link
          to="/seller"
          className="mb-4 flex items-center gap-3 rounded-2xl bg-primary/10 p-4">

            <Store className="h-6 w-6 text-primary" />
            <div className="flex-1">
              <h3 className="font-bold text-foreground">Панель продавца</h3>
              <p className="text-xs text-muted-foreground">Управление товарами и заказами</p>
            </div>
            {sellerPendingCount > 0 &&
          <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full mr-1">
                {sellerPendingCount}
              </span>
          }
            <ChevronRight className="h-5 w-5 text-primary" />
          </Link>
        }

        {/* Admin section */}
        {user && role === "admin" &&
        <Link
          to="/admin"
          className="mb-4 flex items-center gap-3 rounded-2xl bg-accent/20 p-4">

            <Shield className="h-6 w-6 text-accent-foreground" />
            <div className="flex-1">
              <h3 className="font-bold text-foreground">Админ-панель</h3>
              <p className="text-xs text-muted-foreground">Управление маркетплейсом</p>
            </div>
            {adminPendingCount > 0 &&
          <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full mr-1">
                {adminPendingCount}
              </span>
          }
            <ChevronRight className="h-5 w-5 text-accent-foreground" />
          </Link>
        }

        {/* Become seller - for buyers */}
        {user && role !== "seller" && role !== "admin" && !isLoadingApplication &&
        <div className="mb-4 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 p-4">
            <h2 className="mb-1 font-bold text-foreground">Стать продавцом</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Продавайте свои продукты на Locus
            </p>
            {canApply &&
              <Button size="sm" variant="default" onClick={() => navigate("/seller-application")}>
                Подать заявку
              </Button>
            }
          </div>
        }

        {/* Not logged in - become seller section */}
        {!user &&
        <div className="mb-4 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 p-4">
            <h2 className="mb-1 font-bold text-foreground">Стать продавцом</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Продавайте свои продукты на Locus 
            </p>
            <Button size="sm" variant="default" onClick={() => navigate("/seller-application")}>
              Подать заявку
            </Button>
          </div>
        }

        {/* Logout */}
        {user &&
        <button
          onClick={handleLogout}
          disabled={isSigningOut}
          className="flex w-full items-center gap-3 rounded-2xl bg-card p-3.5 text-destructive shadow-sm transition-shadow hover:shadow-md disabled:opacity-50">

            <LogOut className="h-5 w-5" />
            <span className="text-sm font-medium">
              {isSigningOut ? "Выход..." : "Выйти из аккаунта"}
            </span>
          </button>
        }

        {/* Privacy Policy link */}
        <div className="mt-4 text-center">
          <Link to="/privacy-policy" className="text-xs text-muted-foreground hover:text-primary hover:underline">
            Политика конфиденциальности
          </Link>
        </div>
      </main>

      <BottomNavigation />
    </div>);

}