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

type AuthMode = "login" | "register" | "forgot" | "reset";

export default function Auth() {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get("role") === "seller" ? "seller" : "buyer";
  const initialMode = searchParams.get("mode") as AuthMode | null;

  const [mode, setMode] = useState<AuthMode>(initialMode === "reset" ? "reset" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("+375");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecoveryReady, setIsRecoveryReady] = useState(false);
  const [isCheckingRecovery, setIsCheckingRecovery] = useState(initialMode === "reset");

  const { signIn, signUp, resetPassword, updatePassword, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in (and not resetting password)
  useEffect(() => {
    if (user && mode !== "reset") {
      const returnTo = localStorage.getItem('locus-return-to');
      localStorage.removeItem('locus-return-to');
      navigate(returnTo || "/profile");
    }
  }, [user, navigate, mode]);

  // Handle password recovery session
  useEffect(() => {
    if (mode === "reset") {
      setIsCheckingRecovery(true);
      
      // Listen for PASSWORD_RECOVERY event from Supabase
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log("Auth event:", event, !!session);
        
        if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
          setIsRecoveryReady(true);
          setIsCheckingRecovery(false);
        }
      });
      
      // Also check if session already exists
      const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setIsRecoveryReady(true);
          setIsCheckingRecovery(false);
        } else {
          // Wait a bit for tokens to be processed
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
    }
  }, [mode]);

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(3);
    
    if (digits.length === 0) return "+375";
    if (digits.length <= 2) return `+375 (${digits}`;
    if (digits.length <= 5) return `+375 (${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 7) return `+375 (${digits.slice(0, 2)}) ${digits.slice(2, 5)}-${digits.slice(5)}`;
    return `+375 (${digits.slice(0, 2)}) ${digits.slice(2, 5)}-${digits.slice(5, 7)}-${digits.slice(7, 9)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length < 4) {
      setPhone("+375");
      return;
    }
    setPhone(formatPhoneNumber(value));
  };

  const validatePhone = (phoneNumber: string) => {
    const digits = phoneNumber.replace(/\D/g, "");
    return digits.length === 12;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === "login") {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Неверный email или пароль");
          } else {
            toast.error("Ошибка входа: " + error.message);
          }
        } else {
          toast.success("Вы успешно вошли!");
          const returnTo = localStorage.getItem('locus-return-to');
          localStorage.removeItem('locus-return-to');
          navigate(returnTo || "/profile");
        }
      } else if (mode === "register") {
        if (!fullName.trim()) {
          toast.error("Введите имя");
          setIsLoading(false);
          return;
        }
        
        if (!validatePhone(phone)) {
          toast.error("Введите корректный номер телефона");
          setIsLoading(false);
          return;
        }

        // Always register as buyer - they can apply to become seller later
        const { error } = await signUp(email, password, "buyer", fullName);
        if (error) {
          if (error.message.includes("User already registered")) {
            toast.error("Этот email уже зарегистрирован. Войдите или восстановите пароль.");
          } else {
            toast.error("Ошибка регистрации: " + error.message);
          }
        } else {
          toast.success("Регистрация успешна!");
          const returnTo = localStorage.getItem('locus-return-to');
          localStorage.removeItem('locus-return-to');
          navigate(returnTo || "/profile");
        }
      } else if (mode === "forgot") {
        const { error } = await resetPassword(email);
        if (error) {
          toast.error("Ошибка: " + error.message);
        } else {
          toast.success("Письмо для восстановления отправлено на " + email);
          setMode("login");
        }
      } else if (mode === "reset") {
        if (password !== confirmPassword) {
          toast.error("Пароли не совпадают");
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          toast.error("Пароль должен быть минимум 6 символов");
          setIsLoading(false);
          return;
        }
        const { error } = await updatePassword(password);
        if (error) {
          toast.error("Ошибка: " + error.message);
          setIsLoading(false);
        } else {
          toast.success("Пароль успешно изменён!");
          setIsLoading(false);
          // Use window.location for guaranteed redirect after password change
          window.location.href = '/';
          return;
        }
      }
    } finally {
      // Only reset isLoading for non-reset modes (reset handles it manually)
      if (mode !== "reset") {
        setIsLoading(false);
      }
    }
  };

  const getTitle = () => {
    switch (mode) {
      case "login": return "Вход";
      case "register": return "Регистрация";
      case "forgot": return "Восстановление пароля";
      case "reset": return "Новый пароль";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-md">
          <div className="rounded-2xl bg-card p-6 shadow-lg">
            {(mode === "forgot" || mode === "reset") && (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                Назад
              </button>
            )}
            
            <h1 className="mb-6 text-center text-2xl font-bold text-foreground">
              {getTitle()}
            </h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Имя *</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Введите ваше имя"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Телефон *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={handlePhoneChange}
                      placeholder="+375 (XX) XXX-XX-XX"
                      required
                    />
                  </div>
                </>
              )}

              {mode !== "reset" && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@mail.com"
                    required
                  />
                </div>
              )}

              {(mode === "login" || mode === "register") && (
                <div className="space-y-2">
                  <Label htmlFor="password">Пароль *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Минимум 6 символов"
                    minLength={6}
                    required
                  />
                </div>
              )}

              {mode === "reset" && (
                <>
                  {isCheckingRecovery ? (
                    <p className="text-center text-muted-foreground py-4">
                      Проверка ссылки восстановления...
                    </p>
                  ) : !isRecoveryReady ? (
                    <p className="text-center text-muted-foreground py-4">
                      Ссылка недействительна.{" "}
                      <button 
                        type="button"
                        onClick={() => setMode("forgot")} 
                        className="text-primary underline"
                      >
                        Запросить новую
                      </button>
                    </p>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="password">Новый пароль *</Label>
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Минимум 6 символов"
                          minLength={6}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Подтвердите пароль *</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Повторите пароль"
                          minLength={6}
                          required
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              {mode === "register" && initialRole !== "seller" && (
                <p className="text-sm text-muted-foreground">
                  После регистрации вы сможете подать заявку на продавца в профиле.
                </p>
              )}

              {mode === "register" && initialRole === "seller" && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm text-muted-foreground">
                    Чтобы стать продавцом, зарегистрируйтесь и подайте заявку в профиле.
                    Менеджер свяжется с вами для подтверждения.
                  </p>
                </div>
              )}

              {mode === "forgot" && (
                <p className="text-sm text-muted-foreground">
                  Введите email, на который зарегистрирован ваш аккаунт. Мы отправим ссылку для восстановления пароля.
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || (mode === "reset" && (!isRecoveryReady || isCheckingRecovery))}
              >
                {isLoading
                  ? "Загрузка..."
                  : mode === "login"
                  ? "Войти"
                  : mode === "register"
                  ? "Зарегистрироваться"
                  : mode === "forgot"
                  ? "Отправить"
                  : "Сохранить пароль"}
              </Button>

              {(mode === "login" || mode === "register") && (
                <>
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">или</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={async () => {
                      setIsLoading(true);
                      const isCustomDomain =
                        !window.location.hostname.includes("lovable.app") &&
                        !window.location.hostname.includes("lovableproject.com");

                      if (isCustomDomain) {
                        const { data, error } = await supabase.auth.signInWithOAuth({
                          provider: 'google',
                          options: {
                            redirectTo: window.location.origin + '/auth',
                            skipBrowserRedirect: true,
                          },
                        });
                        if (error) {
                          toast.error("Ошибка входа через Google: " + error.message);
                          setIsLoading(false);
                          return;
                        }
                        if (data?.url) {
                          const oauthUrl = new URL(data.url);
                          if (oauthUrl.hostname !== "accounts.google.com" &&
                              !oauthUrl.hostname.endsWith(".supabase.co")) {
                            toast.error("Invalid OAuth redirect URL");
                            setIsLoading(false);
                            return;
                          }
                          window.location.href = data.url;
                        }
                      } else {
                        const { error } = await supabase.auth.signInWithOAuth({
                          provider: 'google',
                          options: {
                            redirectTo: window.location.origin + '/auth',
                          },
                        });
                        if (error) {
                          toast.error("Ошибка входа через Google: " + error.message);
                          setIsLoading(false);
                        }
                      }
                    }}
                    disabled={isLoading}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Войти через Google
                  </Button>
                </>
              )}
            </form>

            {mode === "login" && (
              <div className="mt-4 space-y-3 text-center">
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-sm text-muted-foreground hover:text-primary hover:underline"
                >
                  Забыли пароль?
                </button>
                <div>
                  <button
                    type="button"
                    onClick={() => setMode("register")}
                    className="text-sm text-primary hover:underline"
                  >
                    Нет аккаунта? Зарегистрируйтесь
                  </button>
                </div>
              </div>
            )}

            {mode === "register" && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-sm text-primary hover:underline"
                >
                  Уже есть аккаунт? Войдите
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
