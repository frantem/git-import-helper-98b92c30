import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { trackMetaEvent } from "@/lib/metaPixel";
import { PhoneAuthForm } from "@/components/PhoneAuthForm";
import { EmailOtpForm } from "@/components/EmailOtpForm";

type Tab = "phone" | "email";
type EmailMode = "login" | "register" | "forgot";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isNetworkError = (msg: string) =>
  msg.includes("Load failed") || msg.includes("Failed to fetch") || msg.includes("NetworkError");

export default function Auth() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode");
  const isReset = initialMode === "reset";

  const [tab, setTab] = useState<Tab>("phone");
  const [emailMode, setEmailMode] = useState<EmailMode>("login");

  // Phone flow state
  const [phoneRegisterMode, setPhoneRegisterMode] = useState<"login" | "register">("login");
  const [pendingPhone, setPendingPhone] = useState<string>("");
  const [notFoundDialogOpen, setNotFoundDialogOpen] = useState(false);
  const [existsDialogOpen, setExistsDialogOpen] = useState(false);
  const [autoSendKey, setAutoSendKey] = useState(0); // remount key to trigger auto-send

  // Email login
  const [emailLogin, setEmailLogin] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);

  // Reset (from email link — kept for backward compat with old reset links)
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [isRecoveryReady, setIsRecoveryReady] = useState(false);
  const [isCheckingRecovery, setIsCheckingRecovery] = useState(isReset);

  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  const goAfterAuth = (fallback = "/profile") => {
    const returnTo = localStorage.getItem("locus-return-to");
    localStorage.removeItem("locus-return-to");
    navigate(returnTo || fallback);
  };

  useEffect(() => {
    if (user && !isReset) {
      const returnTo = localStorage.getItem("locus-return-to");
      localStorage.removeItem("locus-return-to");
      navigate(returnTo || "/profile");
    }
  }, [user, navigate, isReset]);

  // Recovery session detection (для совместимости со старыми ссылками)
  useEffect(() => {
    if (!isReset) return;
    setIsCheckingRecovery(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setIsRecoveryReady(true);
        setIsCheckingRecovery(false);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsRecoveryReady(true);
        setIsCheckingRecovery(false);
      } else {
        setTimeout(async () => {
          const { data: { session: retry } } = await supabase.auth.getSession();
          if (retry) setIsRecoveryReady(true);
          else toast.error("Ссылка восстановления недействительна или истекла");
          setIsCheckingRecovery(false);
        }, 1500);
      }
    });
    return () => subscription.unsubscribe();
  }, [isReset]);

  // ---- Phone callbacks ----
  const handlePhoneNotFound = (phone: string) => {
    setPendingPhone(phone);
    setNotFoundDialogOpen(true);
  };

  const handlePhoneExists = (phone: string) => {
    setPendingPhone(phone);
    setExistsDialogOpen(true);
  };

  const confirmRegister = () => {
    setNotFoundDialogOpen(false);
    setPhoneRegisterMode("register");
    setAutoSendKey((k) => k + 1);
  };

  const confirmLoginInstead = () => {
    setExistsDialogOpen(false);
    setPhoneRegisterMode("login");
    setAutoSendKey((k) => k + 1);
  };

  // ---- Email login ----
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = emailLogin.email.trim();
    if (!EMAIL_RE.test(em)) { toast.error("Введите корректный Email"); return; }
    if (emailLogin.password.length < 6) { toast.error("Пароль минимум 6 символов"); return; }
    setIsLoading(true);
    try {
      let { error } = await signIn(em, emailLogin.password);
      if (error && isNetworkError(error.message)) {
        await new Promise((r) => setTimeout(r, 1500));
        const retry = await signIn(em, emailLogin.password);
        error = retry.error;
      }
      if (error) {
        if (isNetworkError(error.message)) toast.error("Ошибка сети. Попробуйте ещё раз.");
        else if (error.message.includes("Invalid login credentials")) toast.error("Неверный Email или пароль");
        else toast.error("Ошибка входа: " + error.message);
        return;
      }
      toast.success("Вы вошли!");
      goAfterAuth();
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Reset password (legacy email link) ----
  const handleLegacyReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetPassword !== resetConfirm) { toast.error("Пароли не совпадают"); return; }
    if (resetPassword.length < 6) { toast.error("Пароль минимум 6 символов"); return; }
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: resetPassword });
    if (error) { toast.error("Ошибка: " + error.message); setIsLoading(false); return; }
    if (user) {
      await supabase.from("profiles").update({ has_password: true } as never).eq("user_id", user.id);
    }
    toast.success("Пароль изменён!");
    setIsLoading(false);
    window.location.href = "/";
  };

  // ---- Google ----
  const handleGoogle = async () => {
    setIsLoading(true);
    trackMetaEvent("Lead", { method: "google" });
    const isCustomDomain =
      !window.location.hostname.includes("lovable.app") &&
      !window.location.hostname.includes("lovableproject.com");
    if (isCustomDomain) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/auth", skipBrowserRedirect: true },
      });
      if (error) { toast.error("Ошибка: " + error.message); setIsLoading(false); return; }
      if (data?.url) window.location.href = data.url;
    } else {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/auth" },
      });
      if (error) { toast.error("Ошибка: " + error.message); setIsLoading(false); }
    }
  };

  // ---- RESET MODE (legacy) ----
  if (isReset) {
    return (
      <div className="min-h-screen pb-20 md:pb-0 bg-[#faf5ea]">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-md">
            <div className="rounded-2xl bg-card p-6 shadow-lg">
              <h1 className="mb-6 text-center text-2xl font-bold">Новый пароль</h1>
              {isCheckingRecovery ? (
                <p className="text-center text-muted-foreground">Проверка ссылки...</p>
              ) : !isRecoveryReady ? (
                <p className="text-center text-muted-foreground">
                  Ссылка недействительна.{" "}
                  <button onClick={() => navigate("/auth")} className="text-primary underline">
                    Вернуться ко входу
                  </button>
                </p>
              ) : (
                <form onSubmit={handleLegacyReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="rp">Новый пароль *</Label>
                    <Input id="rp" type="password" value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)} minLength={6} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rc">Подтвердите пароль *</Label>
                    <Input id="rc" type="password" value={resetConfirm}
                      onChange={(e) => setResetConfirm(e.target.value)} minLength={6} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "..." : "Сохранить"}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0 bg-[#faf5ea]">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-md">
          <div className="rounded-2xl bg-card p-6 shadow-lg">
            {/* Toggle */}
            <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => { setTab("phone"); setPhoneRegisterMode("login"); }}
                className={`rounded-md py-2 text-sm font-medium transition ${
                  tab === "phone" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                }`}
              >
                По телефону
              </button>
              <button
                type="button"
                onClick={() => { setTab("email"); setEmailMode("login"); }}
                className={`rounded-md py-2 text-sm font-medium transition ${
                  tab === "email" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                }`}
              >
                По Email
              </button>
            </div>

            {/* ---- PHONE TAB ---- */}
            {tab === "phone" && (
              <>
                <h1 className="mb-2 text-center text-2xl font-bold">
                  {phoneRegisterMode === "register" ? "Регистрация" : "Вход по телефону"}
                </h1>
                <p className="mb-6 text-center text-sm text-muted-foreground">
                  {phoneRegisterMode === "register"
                    ? "Создаём новый аккаунт"
                    : "Введите номер — пришлём SMS-код"}
                </p>
                <PhoneAuthForm
                  key={`phone-${phoneRegisterMode}-${autoSendKey}`}
                  mode={phoneRegisterMode}
                  initialPhone={pendingPhone || undefined}
                  autoSend={autoSendKey > 0 && !!pendingPhone}
                  onAccountNotFound={handlePhoneNotFound}
                  onAccountExists={handlePhoneExists}
                  onSuccess={goAfterAuth}
                />
                <p className="mt-6 text-center text-xs text-muted-foreground">
                  Продолжая, вы соглашаетесь с{" "}
                  <a href="/privacy-policy" className="text-primary hover:underline">
                    политикой конфиденциальности
                  </a>
                </p>
              </>
            )}

            {/* ---- EMAIL TAB ---- */}
            {tab === "email" && emailMode === "login" && (
              <>
                <h1 className="mb-6 text-center text-2xl font-bold">Вход по Email</h1>
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="el-email">Email *</Label>
                    <Input id="el-email" type="email" autoComplete="email"
                      value={emailLogin.email}
                      onChange={(e) => setEmailLogin((s) => ({ ...s, email: e.target.value }))}
                      placeholder="example@mail.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="el-pass">Пароль *</Label>
                    <Input id="el-pass" type="password" autoComplete="current-password"
                      value={emailLogin.password}
                      onChange={(e) => setEmailLogin((s) => ({ ...s, password: e.target.value }))}
                      minLength={6} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "..." : "Войти"}
                  </Button>
                  <div className="flex flex-col gap-2 text-center text-sm">
                    <button type="button" onClick={() => setEmailMode("forgot")}
                      className="text-muted-foreground hover:text-primary hover:underline">
                      Забыли пароль?
                    </button>
                    <button type="button" onClick={() => setEmailMode("register")}
                      className="text-primary hover:underline">
                      Нет аккаунта? Зарегистрируйтесь
                    </button>
                  </div>
                  <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">или</span>
                    </div>
                  </div>
                  <Button type="button" variant="outline" className="w-full gap-2"
                    onClick={handleGoogle} disabled={isLoading}>
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Войти через Google
                  </Button>
                </form>
              </>
            )}

            {tab === "email" && emailMode === "register" && (
              <>
                <button type="button" onClick={() => setEmailMode("login")}
                  className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
                  <ArrowLeft className="h-4 w-4" /> Назад
                </button>
                <h1 className="mb-6 text-center text-2xl font-bold">Регистрация по Email</h1>
                <EmailOtpForm onSuccess={goAfterAuth} />
              </>
            )}

            {tab === "email" && emailMode === "forgot" && (
              <>
                <button type="button" onClick={() => setEmailMode("login")}
                  className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
                  <ArrowLeft className="h-4 w-4" /> Назад
                </button>
                <h1 className="mb-6 text-center text-2xl font-bold">Восстановление пароля</h1>
                <EmailPasswordResetForm onSuccess={goAfterAuth} />
              </>
            )}
          </div>
        </div>
      </main>
      <BottomNavigation />

      {/* Phone not found → register? */}
      <AlertDialog open={notFoundDialogOpen} onOpenChange={setNotFoundDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Аккаунт не найден</AlertDialogTitle>
            <AlertDialogDescription>
              Номер <span className="font-medium">{pendingPhone}</span> ещё не зарегистрирован.
              Хотите создать новый аккаунт? Мы отправим SMS-код для подтверждения.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRegister}>Да, зарегистрироваться</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Phone exists when trying to register */}
      <AlertDialog open={existsDialogOpen} onOpenChange={setExistsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Аккаунт уже существует</AlertDialogTitle>
            <AlertDialogDescription>
              На номер <span className="font-medium">{pendingPhone}</span> уже зарегистрирован аккаунт.
              Хотите войти?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLoginInstead}>Да, войти</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ===== Email password reset by code =====
function EmailPasswordResetForm({ onSuccess }: { onSuccess: () => void }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const sendCode = async () => {
    const em = email.trim().toLowerCase();
    if (!EMAIL_RE.test(em)) { toast.error("Введите корректный Email"); return; }
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-email-otp", {
        body: { email: em, purpose: "password_reset" },
      });
      const resp = data as { success?: boolean; error?: string; retry_after?: number } | null;
      if (error || !resp?.success) {
        toast.error(resp?.error || "Не удалось отправить код");
        return;
      }
      toast.success("Код отправлен на " + em);
      setCountdown(resp.retry_after ?? 60);
      setStep("code");
    } finally {
      setIsSending(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) { toast.error("Код состоит из 6 цифр"); return; }
    if (newPassword.length < 6) { toast.error("Пароль минимум 6 символов"); return; }
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-email-otp", {
        body: {
          email: email.trim().toLowerCase(),
          code,
          purpose: "password_reset",
          new_password: newPassword,
        },
      });
      const resp = data as { success?: boolean; access_token?: string; refresh_token?: string; error?: string } | null;
      if (error || !resp?.success) {
        toast.error(resp?.error || "Неверный код");
        return;
      }
      if (resp.access_token && resp.refresh_token) {
        await supabase.auth.setSession({
          access_token: resp.access_token,
          refresh_token: resp.refresh_token,
        });
      }
      toast.success("Пароль обновлён, вы вошли!");
      onSuccess();
    } finally {
      setIsVerifying(false);
    }
  };

  if (step === "email") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fe">Email</Label>
          <Input id="fe" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@mail.com" autoComplete="email" />
          <p className="text-xs text-muted-foreground">
            Отправим 6-значный код на ваш Email для сброса пароля.
          </p>
        </div>
        <Button type="button" className="w-full" onClick={sendCode} disabled={isSending}>
          {isSending ? <><Loader2 className="h-4 w-4 animate-spin" /> Отправка...</> : "Получить код"}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={verify} className="space-y-4">
      <button type="button" onClick={() => setStep("email")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Изменить Email
      </button>
      <p className="text-sm text-muted-foreground text-center">
        Код отправлен на<br />
        <span className="font-medium text-foreground">{email}</span>
      </p>
      <div className="space-y-2">
        <Label htmlFor="fcode">Код из письма *</Label>
        <Input id="fcode" type="text" inputMode="numeric" autoComplete="one-time-code"
          maxLength={6} value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="fnp">Новый пароль *</Label>
        <Input id="fnp" type="password" autoComplete="new-password"
          value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
          minLength={6} placeholder="Минимум 6 символов" required />
      </div>
      <Button type="submit" className="w-full" disabled={isVerifying}>
        {isVerifying ? "..." : "Сохранить пароль и войти"}
      </Button>
      <div className="text-center">
        {countdown > 0 ? (
          <p className="text-sm text-muted-foreground">
            Отправить код повторно через {countdown} сек
          </p>
        ) : (
          <button type="button" onClick={sendCode} disabled={isSending}
            className="text-sm text-primary hover:underline">
            {isSending ? "Отправка..." : "Отправить код повторно"}
          </button>
        )}
      </div>
    </form>
  );
}
