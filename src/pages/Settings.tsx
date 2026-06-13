import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { compressImage } from "@/lib/imageUtils";
import { formatBYPhone, isValidBYPhone } from "@/lib/phone";
import { PhoneVerifyDialog } from "@/components/PhoneVerifyDialog";
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

interface Profile {
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  delivery_address: string | null;
}

export default function Settings() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromCart = searchParams.get("from") === "cart";
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    phone: "",
    avatar_url: "",
    delivery_address: "",
  });
  
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [removeSellerOpen, setRemoveSellerOpen] = useState(false);
  const [isRemovingSeller, setIsRemovingSeller] = useState(false);
  const [savedPhone, setSavedPhone] = useState<string>("");
  const [phoneVerifyOpen, setPhoneVerifyOpen] = useState(false);
  const [pendingPhone, setPendingPhone] = useState<string>("");

  const handleRemoveSeller = async () => {
    if (!user) return;
    setIsRemovingSeller(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast.error("Не удалось получить сессию");
      setIsRemovingSeller(false);
      return;
    }
    const res = await supabase.functions.invoke("delete-seller-account", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.error || (res.data as { error?: string })?.error) {
      toast.error("Ошибка при удалении профиля продавца");
      setIsRemovingSeller(false);
      return;
    }
    toast.success("Профиль продавца удалён");
    setRemoveSellerOpen(false);
    window.location.href = "/";
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeleting(true);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast.error("Не удалось получить сессию");
      setIsDeleting(false);
      return;
    }

    const res = await supabase.functions.invoke("delete-account", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.error || res.data?.error) {
      toast.error("Ошибка удаления аккаунта");
      setIsDeleting(false);
      return;
    }

    await supabase.auth.signOut();
    toast.success("Аккаунт удалён");
    navigate("/");
  };

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    
    setEmail(user.email || "");
    fetchProfile();

    if (fromCart) {
      toast.info("Заполните имя и телефон для оформления заказа");
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, phone, avatar_url, delivery_address")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      const phoneVal = data.phone || "";
      setProfile({
        full_name: data.full_name || "",
        phone: phoneVal,
        avatar_url: data.avatar_url || "",
        delivery_address: (data as any).delivery_address || "",
      });
      setSavedPhone(phoneVal);
    }
    
    setIsLoading(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    
    const compressed = await compressImage(file, 400, 400);
    const fileExt = compressed.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, compressed);

    if (uploadError) {
      toast.error("Ошибка загрузки фото");
      setUploadingAvatar(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    setProfile({ ...profile, avatar_url: publicUrl });
    setUploadingAvatar(false);
    toast.success("Фото загружено");
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsSaving(true);
    
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name || null,
        phone: profile.phone || null,
        avatar_url: profile.avatar_url || null,
        delivery_address: profile.delivery_address || null,
        email: email || null,
      } as any)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Ошибка сохранения");
    } else {
      toast.success("Профиль сохранён");
      
      // If came from cart and required fields are filled, redirect back
      if (fromCart && profile.full_name && profile.phone) {
        navigate("/cart");
      }
    }
    
    setIsSaving(false);
  };

  const handleUpdateEmail = async () => {
    if (!email) {
      toast.error("Введите email");
      return;
    }

    if (email.trim().toLowerCase() === user?.email?.toLowerCase()) {
      toast.info("Этот email уже используется");
      return;
    }

    const { error } = await supabase.auth.updateUser({ email });

    if (error) {
      if (error.message?.includes("already been registered")) {
        toast.error("Этот email уже зарегистрирован в системе");
      } else {
        toast.error("Ошибка изменения email");
      }
    } else {
      toast.success(`Письмо для подтверждения отправлено на ${email}. Проверьте папку «Спам».`);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword) {
      toast.error("Введите новый пароль");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error("Пароли не совпадают");
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error("Пароль должен быть минимум 6 символов");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      toast.error("Ошибка изменения пароля");
    } else {
      toast.success("Пароль изменён");
      setNewPassword("");
      setConfirmPassword("");
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

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />

      <main className="container mx-auto px-4 py-4">
        <PageHeader title="Настройки" backPath="/profile" />

        <div className="max-w-md mx-auto space-y-6">
          {/* Avatar section */}
          <div className="flex flex-col items-center rounded-xl bg-card p-6">
            <div className="relative mb-4">
              {profile.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt="Аватар" 
                  className="h-24 w-24 rounded-full object-cover"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-secondary flex items-center justify-center">
                  <span className="text-4xl">👤</span>
                </div>
              )}
              <label className="absolute -bottom-1 -right-1 cursor-pointer">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90">
                  <Camera className="h-4 w-4 text-primary-foreground" />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                />
              </label>
            </div>
            <p className="text-sm text-muted-foreground">
              {uploadingAvatar ? "Загрузка..." : "Нажмите на камеру для изменения аватара"}
            </p>
          </div>

          {/* Profile info */}
          <div className="rounded-xl bg-card p-4 space-y-4">
            <h3 className="font-medium text-foreground">
              Личные данные <span className="text-muted-foreground font-normal text-sm">для доставки</span>
            </h3>
            
            <div className="space-y-2">
              <Label>Имя</Label>
              <Input
                value={profile.full_name || ""}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                placeholder="Ваше имя"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Телефон</Label>
              <Input
                value={profile.phone || ""}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="+375..."
              />
            </div>

            <div className="space-y-2">
              <Label>Адрес доставки</Label>
              <Input
                value={profile.delivery_address || ""}
                onChange={(e) => setProfile({ ...profile, delivery_address: e.target.value })}
                placeholder="Город, улица, дом, квартира"
              />
            </div>
            
            <Button onClick={handleSaveProfile} className="w-full" disabled={isSaving}>
              {isSaving ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>

          {/* Email */}
          <div className="rounded-xl bg-card p-4 space-y-4">
            <h3 className="font-medium text-foreground">Email</h3>
            
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            
            <Button onClick={handleUpdateEmail} variant="outline" className="w-full">
              Изменить email
            </Button>
          </div>

          {/* Password */}
          <div className="rounded-xl bg-card p-4 space-y-4">
            <h3 className="font-medium text-foreground">Пароль</h3>
            
            <div className="space-y-2">
              <Label>Новый пароль</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Минимум 6 символов"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Подтвердите пароль</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Повторите пароль"
              />
            </div>
            
            <Button onClick={handleUpdatePassword} variant="outline" className="w-full">
              Изменить пароль
            </Button>
          </div>

          {/* Delete account */}
          <div className="rounded-xl bg-card p-4 space-y-4 border border-destructive/30">
            <h3 className="font-medium text-destructive">Удалить аккаунт</h3>
            <p className="text-sm text-muted-foreground">
              Все ваши данные, заказы и отзывы будут удалены безвозвратно.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full" disabled={isDeleting}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting ? "Удаление..." : "Удалить аккаунт"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Удалить аккаунт?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Вы уверены? Все данные будут удалены безвозвратно. Это действие нельзя отменить.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Да, удалить
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>


        {role === "seller" && (
          <div className="pt-6 pb-2 text-center">
            <button
              type="button"
              onClick={() => setRemoveSellerOpen(true)}
              className="text-[11px] text-muted-foreground/70 underline underline-offset-2 hover:text-muted-foreground"
            >
              Перестать быть продавцом
            </button>
            <AlertDialog open={removeSellerOpen} onOpenChange={setRemoveSellerOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Перестать быть продавцом?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Будут удалены ваш профиль продавца и все товары. История заказов сохранится. Аккаунт покупателя останется активным. Это действие нельзя отменить.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isRemovingSeller}>Отмена</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleRemoveSeller}
                    disabled={isRemovingSeller}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isRemovingSeller ? "Удаление..." : "Да, удалить"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
