import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Navigate, Link } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2, MapPin, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

interface PickupPoint {
  id: string;
  name: string;
  address: string;
  working_hours: string | null;
  is_active: boolean;
}

export default function AdminPickupPoints() {
  const { user, role, isLoading: isAuthLoading } = useAuth();
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState<PickupPoint | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [workingHours, setWorkingHours] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!isAuthLoading && role === "admin") {
      fetchPickupPoints();
    }
  }, [isAuthLoading, role]);

  const fetchPickupPoints = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("pickup_points")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Ошибка загрузки");
      console.error(error);
    } else {
      setPickupPoints(data || []);
    }
    setIsLoading(false);
  };

  const resetForm = () => {
    setName("");
    setAddress("");
    setWorkingHours("");
    setIsActive(true);
    setEditingPoint(null);
  };

  const openEditDialog = (point: PickupPoint) => {
    setEditingPoint(point);
    setName(point.name);
    setAddress(point.address);
    setWorkingHours(point.working_hours || "");
    setIsActive(point.is_active);
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !address.trim()) {
      toast.error("Заполните название и адрес");
      return;
    }

    setIsSaving(true);

    const pointData = {
      name: name.trim(),
      address: address.trim(),
      working_hours: workingHours.trim() || null,
      is_active: isActive,
    };

    let error;

    if (editingPoint) {
      const { error: updateError } = await supabase
        .from("pickup_points")
        .update(pointData)
        .eq("id", editingPoint.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("pickup_points")
        .insert(pointData);
      error = insertError;
    }

    if (error) {
      toast.error("Ошибка сохранения");
      console.error(error);
    } else {
      toast.success(editingPoint ? "Пункт обновлён" : "Пункт добавлен");
      setIsDialogOpen(false);
      resetForm();
      fetchPickupPoints();
    }

    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("pickup_points")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Ошибка удаления");
      console.error(error);
    } else {
      toast.success("Пункт удалён");
      fetchPickupPoints();
    }
  };

  const toggleActive = async (point: PickupPoint) => {
    const { error } = await supabase
      .from("pickup_points")
      .update({ is_active: !point.is_active })
      .eq("id", point.id);

    if (error) {
      toast.error("Ошибка обновления");
    } else {
      fetchPickupPoints();
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

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
        <div className="flex items-center gap-3 mb-6">
          <Link to="/admin" className="text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Пункты выдачи</h1>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="mb-6">
              <Plus className="h-4 w-4 mr-2" />
              Добавить пункт
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingPoint ? "Редактировать пункт" : "Новый пункт выдачи"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Название *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Витебск, Центр"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Адрес *</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="ул. Ленина, 15"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workingHours">Время работы</Label>
                <Input
                  id="workingHours"
                  value={workingHours}
                  onChange={(e) => setWorkingHours(e.target.value)}
                  placeholder="Сб 10:00-18:00"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Активен</Label>
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
              <Button onClick={handleSave} className="w-full" disabled={isSaving}>
                {isSaving ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {isLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          </div>
        ) : pickupPoints.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Нет пунктов выдачи</p>
            <p className="text-sm">Добавьте первый пункт выдачи</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pickupPoints.map((point) => (
              <div
                key={point.id}
                className="flex items-start gap-4 rounded-xl bg-card p-4 shadow-sm"
              >
                <MapPin className={`h-5 w-5 mt-1 ${point.is_active ? "text-primary" : "text-muted-foreground"}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{point.name}</h3>
                    {!point.is_active && (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                        Неактивен
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{point.address}</p>
                  {point.working_hours && (
                    <p className="text-xs text-primary mt-1">{point.working_hours}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={point.is_active}
                    onCheckedChange={() => toggleActive(point)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(point)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Удалить пункт выдачи?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Это действие нельзя отменить. Пункт "{point.name}" будет удалён.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(point.id)}>
                          Удалить
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
