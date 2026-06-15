import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
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
import { useDraftState, clearDraft } from "@/hooks/useDraftState";
import { trackMetaEvent } from "@/lib/metaPixel";
import { PhoneAuthForm } from "@/components/PhoneAuthForm";
import { formatBYPhone, isValidBYPhone } from "@/lib/phone";

type AuthMode = "login" | "register" | "recovery" | "forgot" | "reset";

const isNetworkError = (msg: string) =>
  msg.includes("Load failed") || msg.includes("Failed to fetch") || msg.includes("NetworkError");

// Email regex (basic)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Decide whether the user is typing a phone or an email
const looksLikePhone = (v: string) => /^[+\d\s()\-]+$/.test(v.trim()) && /\d/.test(v);

export default function Auth() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") as AuthMode | null;

  const [mode, setMode] = useState<AuthMode>(initialMode === "reset" ? "reset" : "login");

  // Login form: single identifier field (email OR phone) + password
  const [formState, setFormState] = useState({ identifier: "", email: "" });
  useDraftState("auth-form-draft", formState, setFormState);
  const identifier = formState.identifier;
  const setIdentifier = (v: string) => setFormState((s) => ({ ...s, identifier: v }));
  const email = formState.email;
  const setEmail = (v: string) => setFormState((s) => ({ ...s, email: v }));

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecoveryReady, setIsRecoveryReady] = useState(false);
  const [isCheckingRecovery, setIsCheckingRecovery] = useState(initialMode === "reset");

  // "Аккаунт уже есть — восстановить?" dialog
  const [recoveryPromptOpen, setRecoveryPromptOpen] = useState(false);
  const [recoveryPhone, setRecoveryPhone] = useState<string>("");

  const { signIn, resetPassword, updatePassword, user } = useAuth();
  const navigate = useNavigate();

  // Auto-format identifier as phone when user is clearly typing a phone.
  // Не форматируем короткие строки, чтобы пользователь мог полностью стереть
  // "+375" и начать вводить Email.
  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    const digits = v.replace(/\D/g, "");
    const looksLikePhone = v.startsWith("+") || /^[\d\s()\-]+$/.test(v);
    if (looksLikePhone && digits.length >= 3) {
      setIdentifier(formatBYPhone(v));
    } else {
      setIdentifier(v);
    }
  };

  const goAfterAuth = (fallback = "/profile") => {
    clearDraft("auth-form-draft");
    const returnTo = localStorage.getItem("locus-return-to");
    localStorage.removeItem("locus-return-to");
    navigate(returnTo || fallback);
  };

  // Redirect if already logged in (and not resetting password / recovering)
  useEffect(() => {
    if (user && mode !== "reset" && mode !== "recovery") {
      const returnTo = localStorage.getItem("locus-return-to");
      localStorage.removeItem("locus-return-to");
      navigate(returnTo || "/profile");
    }
  }, [user, navigate, mode]);

  // Handle password recovery session
  useEffect(() => {
    if (mode !== "reset") return;
    setIsCheckingRecovery(true);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setIsRecoveryReady(true);
        setIsCheckingRecovery(false);
      }
    });

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsRecoveryReady(true);
        setIsCheckingRecovery(false);
      } else {
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession) {
            setIsRecoveryReady(true);
          } else {
            toast.error("Ссылка восстановления недействительна или истекла");
            setMode("forgot");
          }
          setIsCheckingRecovery(false);
        }, 1500);
      }
    };
    checkSession();
    return () => subscription.unsubscribe();
  }, [mode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const trimmed = identifier.trim();

      if (looksLikePhone(trimmed)) {
        // ---- Login by phone via edge function ----
        if (!isValidBYPhone(trimmed)) {
          toast.error("Введите корректный номер: +375 (25/29/33/44) XXX-XX-XX");
          return;
        }
        const { data, error } = await supabase.functions.invoke("phone-password-login", {
          body: { phone: trimmed, password },
        });
        const resp = data as { success?: boolean; access_token?: string; refresh_token?: string; error?: string } | null;
        if (error || !resp?.success) {
          const code = resp?.error || (error as { message?: string } | null)?.message || "";
          if (code === "no_password") {
            // Show recovery prompt
            setRecoveryPhone(trimmed);
            setRecoveryPromptOpen(true);
          } else if (code === "Аккаунт не найден") {
            toast.error("Аккаунт с таким номером не найден");
          } else if (code === "Неверный пароль") {
            toast.error("Неверный пароль");
          } else {
            toast.error(code || "Ошибка входа");
          }
          return;
        }
        const { error: setErr } = await supabase.auth.setSession({
          access_token: resp.access_token!,
          refresh_token: resp.refresh_token!,
        });
        if (setErr) {
          toast.error("Не удалось установить сессию");
          return;
        }
        toast.success("Вы успешно вошли!");
        goAfterAuth();
        return;
      }

      // ---- Login by email ----
      if (!EMAIL_RE.test(trimmed)) {
        toast.error("Введите Email или номер телефона");
        return;
      }
      let { error } = await signIn(trimmed, password);
      if (error && isNetworkError(error.message)) {
        await new Promise((r) => setTimeout(r, 1500));
        const retry = await signIn(trimmed, password);
        error = retry.error;
      }
      if (error) {
        if (isNetworkError(error.message)) {
          toast.error("Ошибка сети. Проверьте интернет и попробуйте ещё раз.");
        } else if (error.message.includes("Invalid login credentials")) {
          toast.error("Неверный email или пароль");
        } else {
          toast.error("Ошибка входа: " + error.message);
        }
      } else {
        toast.success("Вы успешно вошли!");
        goAfterAuth();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const trimmed = email.trim();
      if (!EMAIL_RE.test(trimmed)) {
        toast.error("Введите корректный Email");
        return;
      }
      const { error } = await resetPassword(trimmed);
      if (error) {
        toast.error("Ошибка: " + error.message);
      } else {
        toast.success("Письмо для восстановления отправлено на " + trimmed);
        setMode("login");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Пароли не совпадают");
      return;
    }
    if (password.length < 6) {
      toast.error("Пароль должен быть минимум 6 символов");
      return;
    }
    setIsLoading(true);
    const { error } = await updatePassword(password);
    if (error) {
      toast.error("Ошибка: " + error.message);
      setIsLoading(false);
      return;
    }
    // Mark has_password=true for this user
    if (user) {
      await supabase.from("profiles").update({ has_password: true } as any).eq("user_id", user.id);
    }
    toast.success("Пароль успешно изменён!");
    setIsLoading(false);
    window.location.href = "/";
  };

  const handleGoogle = async () => {
    setIsLoading(true);
    trackMetaEvent("Lead", { method: "google", mode });
    const isCustomDomain =
      !window.location.hostname.includes("lovable.app") &&
      !window.location.hostname.includes("lovableproject.com");

    if (isCustomDomain) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/auth", skipBrowserRedirect: true },
      });
      if (error) {
        toast.error("Ошибка входа через Google: " + error.message);
        setIsLoading(false);
        return;
      }
      if (data?.url) {
        const oauthUrl = new URL(data.url);
        if (oauthUrl.hostname !== "accounts.google.com" && !oauthUrl.hostname.endsWith(".supabase.co")) {
          toast.error("Invalid OAuth redirect URL");
          setIsLoading(false);
          return;
        }
        window.location.href = data.url;
      }
    } else {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/auth" },
      });
      if (error) {
        toast.error("Ошибка входа через Google: " + error.message);
        setIsLoading(false);
      }
    }
  };

  const getTitle = () => {
    switch (mode) {
      case "login": return "Вход";
      case "register": return "Регистрация";
      case "recovery": return "Восстановление доступа";
      case "forgot": return "Восстановление пароля";
      case "reset": return "Новый пароль";
    }
  };

  const handlePhoneRegisterSuccess = () => {
    clearDraft("auth-form-draft");
    goAfterAuth();
  };

  const handleRecoverySuccess = () => {
    clearDraft("auth-form-draft");
    // After phone OTP verified — user is logged in. Force them to set a new password.
    localStorage.removeItem("locus-return-to");
    navigate("/settings?reset=password");
  };

  return (
    <div className="min-h-screen pb-20 md:pb-0 border-[#faf5ea] bg-[#faf5ea]">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-md">
          <div className="rounded-2xl bg-card p-6 shadow-lg">
            {(mode === "forgot" || mode === "reset" || mode === "register" || mode === "recovery") && (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                Назад ко входу
              </button>
            )}

            <h1 className="mb-6 text-center text-2xl font-bold text-foreground">
              {getTitle()}
            </h1>

            {/* ---- LOGIN: single field (email or phone) + password ---- */}
            {mode === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identifier">Email или телефон *</Label>
                  <Input
                    id="identifier"
                    type="text"
                    value={identifier}
                    onChange={handleIdentifierChange}
                    placeholder="example@mail.com или +375XXXXXXXXX"
                    autoComplete="username"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Email или номер телефона в формате +375…
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Пароль *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Минимум 6 символов"
                    minLength={6}
                    autoComplete="current-password"
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Загрузка..." : "Войти"}
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">или</span>
                  </div>
                </div>

                <Button type="button" variant="outline" className="w-full gap-2" onClick={handleGoogle} disabled={isLoading}>
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Войти через Google
                </Button>

                <div className="mt-4 space-y-3 text-center">
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="block w-full text-sm text-muted-foreground hover:text-primary hover:underline"
                  >
                    Забыли пароль?
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("register")}
                    className="block w-full text-sm text-primary hover:underline"
                  >
                    Нет аккаунта? Зарегистрируйтесь
                  </button>
                </div>
              </form>
            )}

            {/* ---- REGISTER: single phone-OTP screen ---- */}
            {mode === "register" && (
              <>
                <PhoneAuthForm
                  mode="register"
                  onSuccess={handlePhoneRegisterSuccess}
                  onAccountExists={(phone) => {
                    setRecoveryPhone(phone);
                    setRecoveryPromptOpen(true);
                  }}
                />
                <p className="mt-4 text-center text-xs text-muted-foreground">
                  Регистрируясь, вы соглашаетесь с{" "}
                  <a href="/privacy-policy" className="text-primary hover:underline">
                    политикой конфиденциальности
                  </a>
                </p>
              </>
            )}

            {/* ---- RECOVERY by phone: send OTP → verify → set new password ---- */}
            {mode === "recovery" && (
              <>
                <p className="mb-4 text-sm text-muted-foreground text-center">
                  Мы отправим SMS-код на <span className="font-medium text-foreground">{recoveryPhone}</span>.
                  После подтверждения вы зададите новый пароль в настройках.
                </p>
                <PhoneAuthForm
                  mode="recovery"
                  onSuccess={handleRecoverySuccess}
                />
              </>
            )}

            {/* ---- FORGOT password (email) ---- */}
            {mode === "forgot" && (
              <form onSubmit={handleForgot} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-forgot">Email *</Label>
                  <Input
                    id="email-forgot"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@mail.com"
                    required
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Введите email, на который зарегистрирован ваш аккаунт. Мы отправим ссылку для восстановления пароля.
                  Если вы регистрировались по номеру телефона — используйте «Назад» → «Нет аккаунта? Зарегистрируйтесь»
                  и введите свой номер, мы предложим восстановить доступ по SMS.
                </p>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Загрузка..." : "Отправить"}
                </Button>
              </form>
            )}

            {/* ---- RESET password (from email link) ---- */}
            {mode === "reset" && (
              <form onSubmit={handleReset} className="space-y-4">
                {isCheckingRecovery ? (
                  <p className="text-center text-muted-foreground py-4">
                    Проверка ссылки восстановления...
                  </p>
                ) : !isRecoveryReady ? (
                  <p className="text-center text-muted-foreground py-4">
                    Ссылка недействительна.{" "}
                    <button type="button" onClick={() => setMode("forgot")} className="text-primary underline">
                      Запросить новую
                    </button>
                  </p>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="password-reset">Новый пароль *</Label>
                      <Input
                        id="password-reset"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Минимум 6 символов"
                        minLength={6}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-reset">Подтвердите пароль *</Label>
                      <Input
                        id="confirm-reset"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Повторите пароль"
                        minLength={6}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading || !isRecoveryReady}>
                      {isLoading ? "Загрузка..." : "Сохранить пароль"}
                    </Button>
                  </>
                )}
              </form>
            )}
          </div>
        </div>
      </main>

      <BottomNavigation />

      {/* Confirm: account exists → восстановить доступ */}
      <AlertDialog open={recoveryPromptOpen} onOpenChange={setRecoveryPromptOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Аккаунт уже существует</AlertDialogTitle>
            <AlertDialogDescription>
              На номер <span className="font-medium">{recoveryPhone}</span> уже зарегистрирован аккаунт.
              Хотите восстановить доступ? Мы отправим SMS-код, после подтверждения вы зададите новый пароль.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setRecoveryPromptOpen(false);
                setMode("recovery");
              }}
            >
              Да, восстановить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
