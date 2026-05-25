import { useState, useEffect, useRef } from "react";
import { useDraftState, clearDraft } from "@/hooks/useDraftState";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { formatBYPhone, isValidBYPhone } from "@/lib/phone";

const DISTRICTS = [
  "Витебский район",
  "Бешенковичский район",
  "Браславский район",
  "Верхнедвинский район",
  "Глубокский район",
  "Городокский район",
  "Докшицкий район",
  "Дубровенский район",
  "Лепельский район",
  "Лиозненский район",
  "Миорский район",
  "Оршанский район",
  "Полоцкий район",
  "Поставский район",
  "Россонский район",
  "Сенненский район",
  "Толочинский район",
  "Ушачский район",
  "Чашникский район",
  "Шарковщинский район",
  "Шумилинский район",
];

interface SellerApplicationFormProps {
  onSuccess?: () => void;
}

const DRAFT_KEY = "seller-application-draft";

interface DraftState {
  name: string;
  phone: string;
  district: string;
  village: string;
  description: string;
  email: string;
}

type PhoneStep = "input" | "code" | "verified";

export function SellerApplicationForm({ onSuccess }: SellerApplicationFormProps) {
  const { user, signUp } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [draft, setDraft] = useState<DraftState>({
    name: "",
    phone: "+375",
    district: "",
    village: "",
    description: "",
    email: "",
  });
  useDraftState(DRAFT_KEY, draft, setDraft);

  const [password, setPassword] = useState("");

  // Phone verification state
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("input");
  const [phoneFromProfile, setPhoneFromProfile] = useState(false);
  const [code, setCode] = useState(["", "", "", ""]);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const codeInputs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("user_id", user.id)
        .single();
      if (!data) return;
      setDraft((s) => ({
        ...s,
        name: s.name || data.full_name || "",
      }));
      if (data.phone && data.phone.trim()) {
        setDraft((s) => ({ ...s, phone: data.phone! }));
        setPhoneFromProfile(true);
        setPhoneStep("verified");
      }
    };
    loadProfile();
  }, [user]);

  useEffect(() => {
    if (phoneStep === "code") {
      setTimeout(() => codeInputs.current[0]?.focus(), 100);
    }
  }, [phoneStep]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const next = value.length < 4 ? "+375" : formatBYPhone(value);
    setDraft((s) => ({ ...s, phone: next }));
    if (phoneStep === "verified" && !phoneFromProfile) {
      setPhoneStep("input");
    }
  };

  const sendCode = async () => {
    if (!isValidBYPhone(draft.phone)) {
      toast.error("Введите корректный номер: +375 (25/29/33/44) XXX-XX-XX");
      return;
    }
    setIsSendingCode(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { phone: draft.phone },
      });
      if (error) {
        const msg = (data as { error?: string } | null)?.error
          || (error as { message?: string }).message
          || "Не удалось отправить код";
        toast.error(msg);
        return;
      }
      const respData = data as { success?: boolean; retry_after?: number; error?: string };
      if (!respData?.success) {
        toast.error(respData?.error || "Не удалось отправить код");
        return;
      }
      toast.success("Код отправлен");
      setResendCountdown(respData.retry_after ?? 60);
      setCode(["", "", "", ""]);
      setPhoneStep("code");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Ошибка сети: " + msg);
    } finally {
      setIsSendingCode(false);
    }
  };

  const linkPhoneForUser = async (fullCode: string): Promise<boolean> => {
    const { data, error } = await supabase.functions.invoke("link-phone-to-account", {
      body: { phone: draft.phone, code: fullCode },
    });
    if (error) {
      const msg = (data as { error?: string } | null)?.error
        || (error as { message?: string }).message
        || "Не удалось привязать телефон";
      toast.error(msg);
      return false;
    }
    const respData = data as { success?: boolean; error?: string };
    if (!respData?.success) {
      toast.error(respData?.error || "Не удалось привязать телефон");
      return false;
    }
    return true;
  };

  const verifyCode = async (fullCode: string) => {
    setIsVerifyingCode(true);
    try {
      if (user) {
        // Logged-in: just bind phone to current account
        const ok = await linkPhoneForUser(fullCode);
        if (!ok) {
          setCode(["", "", "", ""]);
          setTimeout(() => codeInputs.current[0]?.focus(), 50);
          return;
        }
        toast.success("Телефон подтверждён");
        setPhoneStep("verified");
      } else {
        // Guest: sign up first, then link, then submit
        if (!draft.email.trim() || password.length < 6 || !draft.name.trim() || !draft.district) {
          toast.error("Заполните все обязательные поля");
          return;
        }
        const { error: signUpError } = await signUp(draft.email, password, "buyer", draft.name.trim());
        if (signUpError) {
          if (signUpError.message.includes("already registered")) {
            toast.error("Этот email уже зарегистрирован. Войдите в аккаунт.");
          } else {
            toast.error("Ошибка регистрации: " + signUpError.message);
          }
          setCode(["", "", "", ""]);
          return;
        }
        // Wait briefly for session to settle
        let userId: string | undefined;
        for (let i = 0; i < 10; i++) {
          const { data: { user: u } } = await supabase.auth.getUser();
          if (u) { userId = u.id; break; }
          await new Promise((r) => setTimeout(r, 200));
        }
        if (!userId) {
          toast.error("Не удалось войти после регистрации. Проверьте email и попробуйте снова.");
          return;
        }
        const ok = await linkPhoneForUser(fullCode);
        if (!ok) {
          setCode(["", "", "", ""]);
          setTimeout(() => codeInputs.current[0]?.focus(), 50);
          return;
        }
        toast.success("Телефон подтверждён");
        setPhoneStep("verified");
        // Continue automatically to submit
        await submitApplication(userId);
      }
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleCodeChange = (idx: number, value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length === 0) {
      const next = [...code];
      next[idx] = "";
      setCode(next);
      return;
    }
    if (digits.length > 1) {
      const next = ["", "", "", ""];
      for (let i = 0; i < idx; i++) next[i] = code[i] || "";
      for (let i = 0; i < digits.length && idx + i < 4; i++) next[idx + i] = digits[i];
      setCode(next);
      const lastFilled = Math.min(idx + digits.length - 1, 3);
      codeInputs.current[lastFilled]?.focus();
      if (next.every((c) => c.length === 1)) void verifyCode(next.join(""));
      return;
    }
    const digit = digits.slice(-1);
    const next = [...code];
    next[idx] = digit;
    setCode(next);
    if (digit && idx < 3) codeInputs.current[idx + 1]?.focus();
    if (next.every((c) => c.length === 1)) void verifyCode(next.join(""));
  };

  const handleCodeKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[idx] && idx > 0) codeInputs.current[idx - 1]?.focus();
  };

  const handleCodePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (pasted.length === 0) return;
    const next = ["", "", "", ""];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setCode(next);
    if (pasted.length === 4) void verifyCode(pasted);
    else codeInputs.current[Math.min(pasted.length, 3)]?.focus();
  };

  const submitApplication = async (userIdParam?: string) => {
    setIsLoading(true);
    try {
      const userId = userIdParam ?? user?.id;
      if (!userId) {
        toast.error("Ошибка авторизации");
        return;
      }
      const { data: inserted, error } = await supabase
        .from("seller_applications")
        .insert({
          user_id: userId,
          name: draft.name.trim(),
          phone: draft.phone,
          district: draft.district,
          village: draft.village.trim() || null,
          description: draft.description.trim() || null,
        })
        .select("id")
        .single();

      if (error) {
        if (error.message.includes("duplicate")) {
          toast.error("Вы уже подали заявку");
        } else {
          toast.error("Ошибка при отправке заявки: " + error.message);
        }
        return;
      }

      if (inserted?.id) {
        supabase.functions.invoke("send-seller-application-notification", {
          body: { application_id: inserted.id },
        }).catch((e) => console.error("Email notification error:", e));
      }

      clearDraft(DRAFT_KEY);
      toast.success("Ваши данные получены, ожидайте звонка менеджера");
      onSuccess?.();
    } catch {
      toast.error("Произошла ошибка");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      if (!draft.email.trim()) { toast.error("Введите email"); return; }
      if (password.length < 6) { toast.error("Пароль должен быть минимум 6 символов"); return; }
    }
    if (!draft.name.trim()) { toast.error("Введите имя"); return; }
    if (!isValidBYPhone(draft.phone)) { toast.error("Введите корректный номер телефона"); return; }
    if (!draft.district) { toast.error("Выберите район"); return; }

    if (phoneStep !== "verified") {
      toast.error("Подтвердите номер телефона");
      return;
    }

    await submitApplication();
  };

  const updateField = (field: keyof DraftState, value: string) => {
    setDraft((s) => ({ ...s, [field]: value }));
  };

  const submitDisabled =
    isLoading ||
    isVerifyingCode ||
    phoneStep !== "verified" ||
    !draft.name.trim() ||
    !isValidBYPhone(draft.phone) ||
    !draft.district ||
    (!user && (!draft.email.trim() || password.length < 6));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!user && (
        <>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={draft.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="email@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Пароль *</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 6 символов"
              required
              minLength={6}
            />
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Имя / Название хозяйства *</Label>
        <Input
          id="name"
          type="text"
          value={draft.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="Введите ваше имя"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Телефон *</Label>
        <Input
          id="phone"
          type="tel"
          value={draft.phone}
          onChange={handlePhoneChange}
          placeholder="+375 (XX) XXX-XX-XX"
          required
          readOnly={phoneFromProfile}
          disabled={phoneStep === "code"}
          className={phoneFromProfile ? "bg-muted" : undefined}
        />
        {phoneFromProfile && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-600" />
            Используется номер из вашего профиля
          </p>
        )}
        {!phoneFromProfile && phoneStep === "verified" && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-600" />
            Номер подтверждён
          </p>
        )}
        {!phoneFromProfile && phoneStep === "input" && (
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={isSendingCode || !isValidBYPhone(draft.phone)}
            onClick={sendCode}
          >
            {isSendingCode ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Отправка...
              </>
            ) : (
              "Получить код"
            )}
          </Button>
        )}
        {phoneStep === "code" && (
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setPhoneStep("input");
                setCode(["", "", "", ""]);
              }}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
              disabled={isVerifyingCode}
            >
              <ArrowLeft className="h-4 w-4" />
              Изменить номер
            </button>
            <div className="text-center text-sm text-muted-foreground">
              Введите код, отправленный на<br />
              <span className="font-medium text-foreground">{draft.phone}</span>
            </div>
            <div className="flex justify-center gap-2" onPaste={handleCodePaste}>
              {code.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (codeInputs.current[idx] = el)}
                  type="tel"
                  inputMode="numeric"
                  autoComplete={idx === 0 ? "one-time-code" : "off"}
                  value={digit}
                  onChange={(e) => handleCodeChange(idx, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(idx, e)}
                  disabled={isVerifyingCode}
                  className="h-14 w-12 rounded-md border border-input bg-background text-center text-2xl font-semibold ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                />
              ))}
            </div>
            {isVerifyingCode && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Проверка кода...
              </div>
            )}
            <div className="text-center">
              {resendCountdown > 0 ? (
                <p className="text-sm text-muted-foreground">
                  Отправить код повторно через {Math.floor(resendCountdown / 60)}:{(resendCountdown % 60).toString().padStart(2, "0")}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={sendCode}
                  disabled={isSendingCode}
                  className="text-sm text-primary hover:underline disabled:opacity-50"
                >
                  {isSendingCode ? "Отправка..." : "Отправить код повторно"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="district">Район *</Label>
        <Select value={draft.district} onValueChange={(v) => updateField("district", v)} required>
          <SelectTrigger>
            <SelectValue placeholder="Выберите район" />
          </SelectTrigger>
          <SelectContent>
            {DISTRICTS.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="village">Населенный пункт</Label>
        <Input
          id="village"
          type="text"
          value={draft.village}
          onChange={(e) => updateField("village", e.target.value)}
          placeholder="Название населённого пункта"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Описание деятельности</Label>
        <Textarea
          id="description"
          value={draft.description}
          onChange={(e) => updateField("description", e.target.value)}
          placeholder="Расскажите, что вы производите или продаёте"
          rows={3}
        />
      </div>

      <Button type="submit" className="w-full" disabled={submitDisabled}>
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Отправка...
          </>
        ) : (
          "Отправить заявку"
        )}
      </Button>

      <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
        Подавая заявку, вы соглашаетесь с{" "}
        <a href="/seller-terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Условиями для продавцов</a>{" "}
        и{" "}
        <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Политикой конфиденциальности</a>
      </p>
    </form>
  );
}
