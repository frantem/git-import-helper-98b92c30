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

const VIRTUAL_EMAIL_SUFFIX = "@phone.locusfood.by";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Settings() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromCart = searchParams.get("from") === "cart";
  const forceReset = searchParams.get("reset") === "password";

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

  // ---- cart-completion / password-reset flow ----
  const [hasPassword, setHasPassword] = useState<boolean>(true);
  const [emailStep, setEmailStep] = useState<"idle" | "sent" | "verified">("idle");
  const [emailCode, setEmailCode] = useState<string>("");
  const [isSendingEmailCode, setIsSendingEmailCode] = useState(false);
  const [isVerifyingEmailCode, setIsVerifyingEmailCode] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Real (non-virtual) confirmed email currently in auth.users
  const authEmail = user?.email || "";
  const isVirtualEmail = authEmail.toLowerCase().endsWith(VIRTUAL_EMAIL_SUFFIX);
  const hasRealEmail = !!authEmail && !isVirtualEmail;

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

    // If user has virtual phone email — leave field blank so they enter a real one
    setEmail(isVirtualEmail ? "" : (user.email || ""));
    fetchProfile();

    if (fromCart) {
      toast.info("Заполните имя, телефон и адрес доставки для оформления заказа");
    } else if (forceReset) {
      toast.info("Задайте новый пароль для входа");
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, phone, avatar_url, delivery_address, has_password")
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
      setHasPassword(!!(data as any).has_password);
      // If real email already set in auth, mark email step as already verified
      if (!isVirtualEmail && user.email) {
        setEmailStep("verified");
      }
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

  // Saves all non-phone profile fields. Returns true on success.
  const saveProfileFields = async (): Promise<boolean> => {
    if (!user) return false;
    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: user.id,
          full_name: profile.full_name || null,
          avatar_url: profile.avatar_url || null,
          delivery_address: profile.delivery_address || null,
          phone: profile.phone && profile.phone !== "+375" ? profile.phone : null,
          email: email || (user.email || null),
        } as any,
        { onConflict: "user_id" },
      );

    if (error) {
      const msg = (error as { message?: string })?.message || "";
      if (msg.includes("idx_profiles_phone_unique") || (error as { code?: string }).code === "23505") {
        toast.error("Этот номер уже привязан к другому аккаунту");
      } else {
        toast.error(msg || "Ошибка сохранения");
      }
      return false;
    }
    return true;
  };


  // Когда checkout-данные полностью готовы — возвращаемся в корзину
  const tryNavigateAfterCart = (latestPhone: string) => {
    if (!fromCart) return;
    if (profile.full_name && latestPhone && profile.delivery_address) {
      navigate("/cart");
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    const currentPhone = (profile.phone || "").trim();
    const phoneChanged = currentPhone !== (savedPhone || "");

    // If user typed a phone but it's invalid → stop.
    if (currentPhone && currentPhone !== "+375" && !isValidBYPhone(currentPhone)) {
      toast.error("Введите корректный номер: +375 (25/29/33/44) XXX-XX-XX");
      return;
    }

    // Cart-completion required fields: name + phone + delivery address
    if (fromCart) {
      if (!profile.full_name?.trim()) {
        toast.error("Введите имя");
        return;
      }
      if (!currentPhone || currentPhone === "+375") {
        toast.error("Введите номер телефона");
        return;
      }
      if (!profile.delivery_address?.trim()) {
        toast.error("Введите адрес доставки");
        return;
      }
    }

    // If phone changed and is non-empty → require OTP verification first.
    if (phoneChanged && currentPhone && currentPhone !== "+375") {
      setPendingPhone(currentPhone);
      setPhoneVerifyOpen(true);
      return;
    }

    setIsSaving(true);
    const ok = await saveProfileFields();
    if (!ok) { setIsSaving(false); return; }
    setIsSaving(false);

    toast.success("Профиль сохранён");
    tryNavigateAfterCart(savedPhone || currentPhone);
  };

  const handlePhoneVerified = async (verifiedPhone: string) => {
    setPhoneVerifyOpen(false);
    setSavedPhone(verifiedPhone);
    setProfile((p) => ({ ...p, phone: verifiedPhone }));

    setIsSaving(true);
    const ok = await saveProfileFields();
    if (!ok) { setIsSaving(false); return; }
    setIsSaving(false);

    toast.success("Профиль сохранён");
    tryNavigateAfterCart(verifiedPhone);
  };

  // ---- Email OTP (для cart-completion и для смены email с виртуального) ----
  const handleSendEmailCode = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmed)) {
      toast.error("Введите корректный Email");
      return;
    }
    if (trimmed === authEmail.toLowerCase()) {
      toast.info("Этот email уже используется");
      return;
    }
    setIsSendingEmailCode(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-email-change-code", {
        body: { new_email: trimmed },
      });
      if (error || !(data as any)?.success) {
        toast.error((data as any)?.error || "Не удалось отправить код");
        return;
      }
      toast.success("Код отправлен на " + trimmed);
      setEmail(trimmed);
      setEmailStep("sent");
    } catch (e) {
      toast.error("Ошибка сети: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsSendingEmailCode(false);
    }
  };

  const handleVerifyEmailCode = async () => {
    if (!/^\d{6}$/.test(emailCode.trim())) {
      toast.error("Код должен состоять из 6 цифр");
      return;
    }
    setIsVerifyingEmailCode(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-email-change-code", {
        body: { new_email: email, code: emailCode.trim() },
      });
      if (error || !(data as any)?.success) {
        toast.error((data as any)?.error || "Неверный код");
        return;
      }
      toast.success("Email подтверждён");
      await supabase.auth.refreshSession();
      setEmailStep("verified");
      setEmailCode("");
    } catch (e) {
      toast.error("Ошибка сети: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsVerifyingEmailCode(false);
    }
  };

  // Legacy: standalone email change (вне cart-flow) — оставляем для обычного использования
  const handleUpdateEmail = handleSendEmailCode;

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
    setIsSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error("Ошибка изменения пароля");
      setIsSavingPassword(false);
      return;
    }
    if (user) {
      await supabase.from("profiles").update({ has_password: true } as any).eq("user_id", user.id);
    }
    setHasPassword(true);
    toast.success("Пароль изменён");
    setNewPassword("");
    setConfirmPassword("");
    setIsSavingPassword(false);

    if (forceReset) {
      // После сброса пароля (вход по SMS) → редирект в профиль / returnTo
      const returnTo = localStorage.getItem("locus-return-to");
      localStorage.removeItem("locus-return-to");
      navigate(returnTo || "/profile");
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
          {(fromCart || forceReset) && (
            <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 text-sm text-foreground">
              {fromCart ? (
                <>
                  <p className="font-medium mb-1">Завершите профиль, чтобы оформить заказ</p>
                  <p className="text-muted-foreground">
                    Заполните: Имя, Телефон и Адрес доставки — после сохранения
                    вернёмся в корзину. Email и пароль можно задать позже.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium mb-1">Задайте новый пароль для входа</p>
                  <p className="text-muted-foreground">
                    Вы вошли по SMS-коду. Чтобы дальше входить с паролем, задайте его в блоке «Пароль» ниже.
                  </p>
                </>
              )}
            </div>
          )}

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
                onChange={(e) => {
                  const v = e.target.value;
                  setProfile({ ...profile, phone: v.length < 4 ? "+375" : formatBYPhone(v) });
                }}
                placeholder="+375 (29) XXX-XX-XX"
                inputMode="tel"
              />
              {profile.phone && profile.phone !== savedPhone && profile.phone !== "+375" && (
                <p className="text-xs text-muted-foreground">
                  При сохранении мы отправим код для подтверждения номера.
                </p>
              )}
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
            <h3 className="font-medium text-foreground">
              Email <span className="text-muted-foreground font-normal text-xs">(по желанию)</span>
            </h3>

            {hasRealEmail && emailStep === "verified" ? (
              <p className="text-sm text-muted-foreground">
                Текущий email: <span className="text-foreground font-medium">{authEmail}</span>
              </p>
            ) : null}

            <div className="space-y-2">
              <Label>{hasRealEmail ? "Новый email" : "Email"}</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (emailStep === "verified") setEmailStep("idle"); }}
                placeholder="email@example.com"
                disabled={emailStep === "sent"}
              />
            </div>

            {emailStep === "sent" && (
              <div className="space-y-2">
                <Label>Код подтверждения</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="6-значный код"
                  autoComplete="one-time-code"
                />
                <div className="flex gap-2">
                  <Button onClick={handleVerifyEmailCode} disabled={isVerifyingEmailCode} className="flex-1">
                    {isVerifyingEmailCode ? "Проверка..." : "Подтвердить код"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => { setEmailStep("idle"); setEmailCode(""); }}
                    disabled={isVerifyingEmailCode}
                  >
                    Назад
                  </Button>
                </div>
              </div>
            )}

            {emailStep !== "sent" && (
              <Button onClick={handleSendEmailCode} variant="outline" className="w-full" disabled={isSendingEmailCode}>
                {isSendingEmailCode
                  ? "Отправка..."
                  : hasRealEmail ? "Изменить email" : "Получить код подтверждения"}
              </Button>
            )}
          </div>

          {/* Password */}
          <div className="rounded-xl bg-card p-4 space-y-4">
            <h3 className="font-medium text-foreground">
              Пароль <span className="text-muted-foreground font-normal text-xs">(по желанию)</span>
            </h3>

            {!hasPassword && (
              <p className="text-sm text-muted-foreground">
                У вас ещё не задан пароль. Задайте его, чтобы входить по Email/телефону + паролю.
              </p>
            )}

            <div className="space-y-2">
              <Label>{hasPassword ? "Новый пароль" : "Пароль"}</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                autoFocus={forceReset}
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

            <Button onClick={handleUpdatePassword} variant="outline" className="w-full" disabled={isSavingPassword}>
              {isSavingPassword ? "Сохранение..." : hasPassword ? "Изменить пароль" : "Сохранить пароль"}
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

      <PhoneVerifyDialog
        open={phoneVerifyOpen}
        phone={pendingPhone}
        onOpenChange={setPhoneVerifyOpen}
        onVerified={handlePhoneVerified}
      />

      <BottomNavigation />
    </div>
  );
}
