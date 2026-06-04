import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Check, X, Clock, User, Phone, MapPin, FileText, Loader2 } from "lucide-react";

interface SellerApplication {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  district: string | null;
  village: string | null;
  description: string | null;
  status: string;
  admin_comment: string | null;
  created_at: string;
}

export default function AdminSellerApplications() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<SellerApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || role !== "admin") {
      navigate("/");
      return;
    }
    fetchApplications();
  }, [user, role]);

  const fetchApplications = async () => {
    const { data, error } = await supabase
      .from("seller_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setApplications(data);
    }
    setIsLoading(false);
  };

  const handleApprove = async (application: SellerApplication) => {
    setProcessingId(application.id);

    try {
      // 1. Add seller role to user_roles
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: application.user_id,
          role: "seller",
        });

      if (roleError && !roleError.message.includes("duplicate")) {
        throw roleError;
      }

      // 2. Create farmer profile
      const { error: farmerError } = await supabase
        .from("farmers")
        .insert({
          user_id: application.user_id,
          name: application.name,
          district: application.district,
          village: application.village,
          description: application.description,
        });

      if (farmerError && !farmerError.message.includes("duplicate")) {
        throw farmerError;
      }

      // 3. Update application status
      const { error: updateError } = await supabase
        .from("seller_applications")
        .update({ status: "approved" })
        .eq("id", application.id);

      if (updateError) {
        throw updateError;
      }

      toast.success("Продавец успешно одобрен!");
      fetchApplications();
    } catch (error: any) {
      toast.error("Ошибка при одобрении: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (applicationId: string) => {
    setProcessingId(applicationId);

    try {
      const { error } = await supabase
        .from("seller_applications")
        .update({ status: "rejected" })
        .eq("id", applicationId);

      if (error) {
        throw error;
      }

      toast.success("Заявка отклонена");
      fetchApplications();
    } catch (error: any) {
      toast.error("Ошибка: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="flex items-center gap-1 text-xs bg-warning/20 text-warning-foreground px-2 py-0.5 rounded">
            <Clock className="h-3 w-3" />
            На рассмотрении
          </span>
        );
      case "approved":
        return (
          <span className="flex items-center gap-1 text-xs bg-success/20 text-success px-2 py-0.5 rounded">
            <Check className="h-3 w-3" />
            Одобрено
          </span>
        );
      case "rejected":
        return (
          <span className="flex items-center gap-1 text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded">
            <X className="h-3 w-3" />
            Отклонено
          </span>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Header />
        <main className="container mx-auto px-4 py-16 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <BottomNavigation />
      </div>
    );
  }

  const pendingApplications = applications.filter(a => a.status === "pending");
  const processedApplications = applications.filter(a => a.status !== "pending");

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />

      <main className="container mx-auto px-3 py-4">
        <div className="flex items-center gap-2 mb-4">
          <Link to="/admin/sellers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-foreground">Заявки на продавца</h1>
        </div>

        {/* Pending applications */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-foreground">
            Новые заявки ({pendingApplications.length})
          </h2>
          
          {pendingApplications.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground bg-card rounded-xl">
              Нет новых заявок
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApplications.map((app) => (
                <div key={app.id} className="rounded-xl bg-card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{app.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {new Date(app.created_at).toLocaleDateString("ru-RU")}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(app.status)}
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <a href={`tel:${app.phone.replace(/\D/g, "")}`} className="text-primary hover:underline">
                        {app.phone}
                      </a>
                    </div>
                    {(app.district || app.village) && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{[app.district, app.village].filter(Boolean).join(", ")}</span>
                      </div>
                    )}
                    {app.description && (
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <FileText className="h-4 w-4 mt-0.5" />
                        <span>{app.description}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleApprove(app)}
                      disabled={processingId === app.id}
                      className="flex-1"
                    >
                      {processingId === app.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Одобрить
                        </>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleReject(app.id)}
                      disabled={processingId === app.id}
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Отклонить
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Processed applications */}
        {processedApplications.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 text-foreground">
              История ({processedApplications.length})
            </h2>
            <div className="space-y-2">
              {processedApplications.map((app) => (
                <div key={app.id} className="flex items-center justify-between rounded-xl bg-card p-3">
                  <div>
                    <h3 className="font-medium text-foreground">{app.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {app.district} • {new Date(app.created_at).toLocaleDateString("ru-RU")}
                    </p>
                  </div>
                  {getStatusBadge(app.status)}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}