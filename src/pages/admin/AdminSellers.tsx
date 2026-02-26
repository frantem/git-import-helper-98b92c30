import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Ban, CheckCircle, Store, FileText } from "lucide-react";

interface Farmer {
  id: string;
  name: string;
  district: string;
  village: string | null;
  rating: number | null;
  is_blocked: boolean | null;
  user_id: string | null;
}

export default function AdminSellers() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || role !== "admin") {
      navigate("/");
      return;
    }
    fetchFarmers();
  }, [user, role]);

  const fetchFarmers = async () => {
    const { data, error } = await supabase
      .from("farmers")
      .select("*")
      .order("name");

    if (!error && data) {
      setFarmers(data);
    }
    setIsLoading(false);
  };

  const toggleBlock = async (farmerId: string, currentlyBlocked: boolean | null) => {
    const { error } = await supabase
      .from("farmers")
      .update({ is_blocked: !currentlyBlocked })
      .eq("id", farmerId);

    if (error) {
      toast.error("Ошибка при обновлении статуса");
    } else {
      toast.success(currentlyBlocked ? "Продавец разблокирован" : "Продавец заблокирован");
      fetchFarmers();
    }
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
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-foreground">Продавцы</h1>
        </div>

        {/* Link to applications */}
        <Link
          to="/admin/applications"
          className="mb-4 flex items-center gap-3 rounded-xl bg-primary/10 p-4"
        >
          <FileText className="h-6 w-6 text-primary" />
          <div className="flex-1">
            <h3 className="font-medium text-foreground">Заявки на продавца</h3>
            <p className="text-xs text-muted-foreground">Рассмотрение новых заявок</p>
          </div>
          <ChevronRight className="h-5 w-5 text-primary" />
        </Link>

        {farmers.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            Нет зарегистрированных продавцов
          </div>
        ) : (
          <div className="space-y-2">
            {farmers.map((farmer) => (
              <div key={farmer.id} className="flex items-center gap-3 rounded-xl bg-card p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Store className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground truncate">{farmer.name}</h3>
                    {farmer.is_blocked && (
                      <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                        Заблокирован
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {farmer.district}{farmer.village ? `, ${farmer.village}` : ""}
                  </p>
                  {farmer.rating && (
                    <p className="text-xs text-muted-foreground">
                      ⭐ {farmer.rating}
                    </p>
                  )}
                </div>
                <Button
                  variant={farmer.is_blocked ? "outline" : "destructive"}
                  size="sm"
                  onClick={() => toggleBlock(farmer.id, farmer.is_blocked)}
                >
                  {farmer.is_blocked ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Разблокировать
                    </>
                  ) : (
                    <>
                      <Ban className="h-4 w-4 mr-1" />
                      Заблокировать
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
