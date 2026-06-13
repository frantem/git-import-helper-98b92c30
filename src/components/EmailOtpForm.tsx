import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2 } from "lucide-react";
import { trackMetaEvent } from "@/lib/metaPixel";

interface EmailOtpFormProps {
  onSuccess: () => void;
}

const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export function EmailOtpForm({ onSuccess }: EmailOtpFormProps) {
  const [step, setStep] = useState<"form" | "code">("form");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const codeInputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  useEffect(() => {
    if (step === "code") {
      setTimeout(() => codeInputs.current[0]?.focus(), 100);
    }
  }, [step]);

  const sendCode = async () => {
    if (!fullName.trim()) { toast.error("Введите имя"); return; }
    if (!isValidEmail(email)) { toast.error("Введите корректный Email"); return; }
    if (password.length < 6) { toast.error("Пароль минимум 6 символов"); return; }
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-email-otp", {
        body: { email: email.trim().toLowerCase() },
      });
      const resp = data as { success?: boolean; retry_after?: number; error?: string } | null;
      if (error || !resp?.success) {
        const msg = resp?.error || (error as { message?: string })?.message || "Не удалось отправить код";
        toast.error(msg);
        return;
      }
      toast.success("Код отправлен на " + email);
      setResendCountdown(resp.retry_after ?? 60);
      setCode(["", "", "", "", "", ""]);
      setStep("code");
    } catch (e) {
      toast.error("Ошибка сети: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsSending(false);
    }
  };

  const verifyCode = async (full: string) => {
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-email-otp", {
        body: {
          email: email.trim().toLowerCase(),
          code: full,
          password,
          full_name: fullName.trim(),
        },
      });
      const resp = data as { success?: boolean; access_token?: string; refresh_token?: string; error?: string } | null;
      if (error || !resp?.success || !resp.access_token || !resp.refresh_token) {
        const msg = resp?.error || (error as { message?: string })?.message || "Неверный код";
        toast.error(msg);
        setCode(["", "", "", "", "", ""]);
        setTimeout(() => codeInputs.current[0]?.focus(), 50);
        return;
      }
      const { error: setErr } = await supabase.auth.setSession({
        access_token: resp.access_token,
        refresh_token: resp.refresh_token,
      });
      if (setErr) { toast.error("Не удалось войти: " + setErr.message); return; }
      trackMetaEvent("CompleteRegistration", { method: "email", status: true });
      toast.success("Регистрация завершена!");
      onSuccess();
    } catch (e) {
      toast.error("Ошибка сети: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCodeChange = (idx: number, value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length === 0) {
      const next = [...code]; next[idx] = ""; setCode(next); return;
    }
    if (digits.length > 1) {
      const next = ["", "", "", "", "", ""];
      for (let i = 0; i < idx; i++) next[i] = code[i] || "";
      for (let i = 0; i < digits.length && idx + i < 6; i++) next[idx + i] = digits[i];
      setCode(next);
      const lastFilled = Math.min(idx + digits.length - 1, 5);
      codeInputs.current[lastFilled]?.focus();
      if (next.every((c) => c.length === 1)) void verifyCode(next.join(""));
      return;
    }
    const digit = digits.slice(-1);
    const next = [...code]; next[idx] = digit; setCode(next);
    if (digit && idx < 5) codeInputs.current[idx + 1]?.focus();
    if (next.every((c) => c.length === 1)) void verifyCode(next.join(""));
  };

  const handleCodeKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[idx] && idx > 0) codeInputs.current[idx - 1]?.focus();
  };

  const handleCodePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setCode(next);
    if (pasted.length === 6) void verifyCode(pasted);
    else codeInputs.current[Math.min(pasted.length, 5)]?.focus();
  };

  if (step === "form") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email-otp-name">Имя *</Label>
          <Input id="email-otp-name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Введите ваше имя" autoComplete="name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email-otp-email">Email *</Label>
          <Input id="email-otp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@mail.com" autoComplete="email" inputMode="email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email-otp-password">Пароль *</Label>
          <Input id="email-otp-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Минимум 6 символов" minLength={6} autoComplete="new-password" />
        </div>
        <Button type="button" className="w-full" onClick={sendCode} disabled={isSending}>
          {isSending ? (<><Loader2 className="h-4 w-4 animate-spin" /> Отправка...</>) : "Получить код на Email"}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Мы отправим 6-значный код на ваш Email для подтверждения
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button type="button" onClick={() => { setStep("form"); setCode(["", "", "", "", "", ""]); }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary" disabled={isVerifying}>
        <ArrowLeft className="h-4 w-4" /> Изменить данные
      </button>
      <div className="text-center text-sm text-muted-foreground">
        Введите код, отправленный на<br />
        <span className="font-medium text-foreground">{email}</span>
      </div>
      <div className="flex justify-center gap-1.5" onPaste={handleCodePaste}>
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
            disabled={isVerifying}
            className="h-14 w-11 rounded-md border border-input bg-background text-center text-2xl font-semibold ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
          />
        ))}
      </div>
      {isVerifying && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Проверка кода...
        </div>
      )}
      <div className="text-center">
        {resendCountdown > 0 ? (
          <p className="text-sm text-muted-foreground">
            Отправить код повторно через {Math.floor(resendCountdown / 60)}:{(resendCountdown % 60).toString().padStart(2, "0")}
          </p>
        ) : (
          <button type="button" onClick={sendCode} disabled={isSending} className="text-sm text-primary hover:underline disabled:opacity-50">
            {isSending ? "Отправка..." : "Отправить код повторно"}
          </button>
        )}
      </div>
    </div>
  );
}
