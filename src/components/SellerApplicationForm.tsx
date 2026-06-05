import { useState, useEffect, useRef } from "react";
import { useDraftState, clearDraft } from "@/hooks/useDraftState";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { formatBYPhone, isValidBYPhone } from "@/lib/phone";

interface SellerApplicationFormProps {
  onSuccess?: () => void;
}

const DRAFT_KEY = "seller-application-draft";

interface DraftState {
  name: string;
  phone: string;
  description: string;
  email: string;
}

type PhoneStep = "input" | "code" | "verified";
type EmailStep = "input" | "code" | "verified";
const PLACEHOLDER_EMAIL_DOMAIN = "@phone.locusfood.by";
const isPlaceholderEmail = (e?: string | null) =>
  !e || e.toLowerCase().endsWith(PLACEHOLDER_EMAIL_DOMAIN);

// Extract human-readable error text from a supabase.functions.invoke error
async function extractFnError(error: unknown, data: unknown, fallback: string): Promise<string> {
  const fromData = (data as { error?: string } | null)?.error;
  if (fromData) return fromData;
  const ctx = (error as { context?: Response } | null)?.context;
  if (ctx && typeof ctx.json === "function") {
    try {
      const body = await ctx.clone().json();
      if (body?.error) return String(body.error);
    } catch {
      try {
        const txt = await ctx.clone().text();
        if (txt) return txt;
      } catch {
        // ignore
      }
    }
  }
  const msg = (error as { message?: string } | null)?.message;
  return msg || fallback;
}

export function SellerApplicationForm({ onSuccess }: SellerApplicationFormProps) {
  const { user, signUp } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [draft, setDraft] = useState<DraftState>({
    name: "",
    phone: "+375",
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

  // Email verification state (for logged-in users with placeholder @phone.locusfood.by email)
  const [emailStep, setEmailStep] = useState<EmailStep>("verified");
  const [emailFromAuth, setEmailFromAuth] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [emailCode, setEmailCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [isSendingEmailCode, setIsSendingEmailCode] = useState(false);
  const [isVerifyingEmailCode, setIsVerifyingEmailCode] = useState(false);
  const [emailResendCountdown, setEmailResendCountdown] = useState(0);
  const emailCodeInputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!user) {
      setEmailFromAuth(false);
      setEmailStep("verified"); // guest branch handles its own email field
      setVerifiedEmail(null);
      return;
    }
    const email = user.email || "";
    if (!isPlaceholderEmail(email)) {
      setEmailFromAuth(true);
      setEmailStep("verified");
      setVerifiedEmail(email);
    } else {
      setEmailFromAuth(false);
      setEmailStep("input");
      setVerifiedEmail(null);
    }
  }, [user]);

  useEffect(() => {
    if (emailResendCountdown <= 0) return;
    const t = setTimeout(() => setEmailResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [emailResendCountdown]);

  useEffect(() => {
    if (emailStep === "code") {
      setTimeout(() => emailCodeInputs.current[0]?.focus(), 100);
    }
  }, [emailStep]);

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
        toast.error(await extractFnError(error, data, "Не удалось отправить код"));
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
      toast.error(await extractFnError(error, data, "Не удалось привязать телефон"));
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
        const ok = await linkPhoneForUser(fullCode);
        if (!ok) {
          setCode(["", "", "", ""]);
          setTimeout(() => codeInputs.current[0]?.focus(), 50);
          return;
        }
        toast.success("Телефон подтверждён");
        setPhoneStep("verified");
      } else {
        if (!draft.email.trim() || password.length < 6 || !draft.name.trim()) {
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
        await submitApplication(userId);
      }
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const sendEmailCode = async () => {
    const e = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      toast.error("Введите корректный Email");
      return;
    }
    if (e.endsWith(PLACEHOLDER_EMAIL_DOMAIN)) {
      toast.error("Введите ваш реальный Email");
      return;
    }
    setIsSendingEmailCode(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-email-change-code", {
        body: { new_email: e },
      });
      if (error) {
        toast.error(await extractFnError(error, data, "Не удалось отправить код"));
        return;
      }
      const r = data as { success?: boolean; error?: string };
      if (!r?.success) {
        toast.error(r?.error || "Не удалось отправить код");
        return;
      }
      toast.success("Код отправлен на " + e);
      setEmailCode(["", "", "", "", "", ""]);
      setEmailStep("code");
      setEmailResendCountdown(60);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Ошибка сети: " + msg);
    } finally {
      setIsSendingEmailCode(false);
    }
  };

  const verifyEmailCode = async (full: string) => {
    setIsVerifyingEmailCode(true);
    try {
      const e = newEmail.trim().toLowerCase();
      const { data, error } = await supabase.functions.invoke("verify-email-change-code", {
        body: { new_email: e, code: full },
      });
      if (error) {
        toast.error(await extractFnError(error, data, "Неверный код"));
        setEmailCode(["", "", "", "", "", ""]);
        setTimeout(() => emailCodeInputs.current[0]?.focus(), 50);
        return;
      }
      const r = data as { success?: boolean; error?: string };
      if (!r?.success) {
        toast.error(r?.error || "Неверный код");
        setEmailCode(["", "", "", "", "", ""]);
        setTimeout(() => emailCodeInputs.current[0]?.focus(), 50);
        return;
      }
      toast.success("Email подтверждён");
      setVerifiedEmail(e);
      setEmailStep("verified");
      // Refresh local session so user.email reflects the new email
      try { await supabase.auth.refreshSession(); } catch { /* non-fatal */ }
    } finally {
      setIsVerifyingEmailCode(false);
    }
  };

  const handleEmailCodeChange = (idx: number, value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length === 0) {
      const n = [...emailCode]; n[idx] = ""; setEmailCode(n); return;
    }
    if (digits.length > 1) {
      const n = ["", "", "", "", "", ""];
      for (let i = 0; i < idx; i++) n[i] = emailCode[i] || "";
      for (let i = 0; i < digits.length && idx + i < 6; i++) n[idx + i] = digits[i];
      setEmailCode(n);
      const last = Math.min(idx + digits.length - 1, 5);
      emailCodeInputs.current[last]?.focus();
      if (n.every((c) => c.length === 1)) void verifyEmailCode(n.join(""));
      return;
    }
    const d = digits.slice(-1);
    const n = [...emailCode]; n[idx] = d; setEmailCode(n);
    if (d && idx < 5) emailCodeInputs.current[idx + 1]?.focus();
    if (n.every((c) => c.length === 1)) void verifyEmailCode(n.join(""));
  };

  const handleEmailCodeKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !emailCode[idx] && idx > 0) emailCodeInputs.current[idx - 1]?.focus();
  };

  const handleEmailCodePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 0) return;
    const n = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) n[i] = pasted[i];
    setEmailCode(n);
    if (pasted.length === 6) void verifyEmailCode(pasted);
    else emailCodeInputs.current[Math.min(pasted.length, 5)]?.focus();
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
          district: null,
          village: null,
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

    if (phoneStep !== "verified") {
      toast.error("Подтвердите номер телефона");
      return;
    }

    if (user && emailStep !== "verified") {
      toast.error("Подтвердите Email");
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
    isVerifyingEmailCode ||
    phoneStep !== "verified" ||
    (!!user && emailStep !== "verified") ||
    !draft.name.trim() ||
    !isValidBYPhone(draft.phone) ||
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

      {user && (
        <div className="space-y-2">
          <Label htmlFor="real-email">Email *</Label>
          {emailFromAuth || emailStep === "verified" ? (
            <>
              <Input
                id="real-email"
                type="email"
                value={verifiedEmail || ""}
                readOnly
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-600" />
                {emailFromAuth ? "Используется Email из вашего аккаунта" : "Email подтверждён"}
              </p>
            </>
          ) : emailStep === "input" ? (
            <>
              <Input
                id="real-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@example.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                Укажите ваш реальный Email — на него мы отправим код подтверждения, и он будет привязан к вашему аккаунту.
              </p>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={isSendingEmailCode || !newEmail.trim()}
                onClick={sendEmailCode}
              >
                {isSendingEmailCode ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Отправка...
                  </>
                ) : (
                  "Получить код"
                )}
              </Button>
            </>
          ) : (
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => { setEmailStep("input"); setEmailCode(["","","","","",""]); }}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                disabled={isVerifyingEmailCode}
              >
                <ArrowLeft className="h-4 w-4" />
                Изменить Email
              </button>
              <div className="text-center text-sm text-muted-foreground">
                Введите 6-значный код, отправленный на<br />
                <span className="font-medium text-foreground">{newEmail}</span>
              </div>
              <div className="flex justify-center gap-2" onPaste={handleEmailCodePaste}>
                {emailCode.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (emailCodeInputs.current[idx] = el)}
                    type="tel"
                    inputMode="numeric"
                    autoComplete={idx === 0 ? "one-time-code" : "off"}
                    value={digit}
                    onChange={(e) => handleEmailCodeChange(idx, e.target.value)}
                    onKeyDown={(e) => handleEmailCodeKeyDown(idx, e)}
                    disabled={isVerifyingEmailCode}
                    className="h-12 w-10 rounded-md border border-input bg-background text-center text-xl font-semibold ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                  />
                ))}
              </div>
              {isVerifyingEmailCode && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Проверка кода...
                </div>
              )}
              <div className="text-center">
                {emailResendCountdown > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Отправить код повторно через {Math.floor(emailResendCountdown / 60)}:{(emailResendCountdown % 60).toString().padStart(2, "0")}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={sendEmailCode}
                    disabled={isSendingEmailCode}
                    className="text-sm text-primary hover:underline disabled:opacity-50"
                  >
                    {isSendingEmailCode ? "Отправка..." : "Отправить код повторно"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
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
