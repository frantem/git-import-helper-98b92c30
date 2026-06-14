import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2 } from "lucide-react";
import { trackMetaEvent } from "@/lib/metaPixel";
import { formatBYPhone, isValidBYPhone } from "@/lib/phone";

interface PhoneAuthFormProps {
  onSuccess: () => void;
  /**
   * login    — обычный вход/регистрация (текущее поведение, по умолчанию)
   * register — перед отправкой кода проверяем check-account-exists;
   *            если номер занят — вызываем onAccountExists вместо отправки SMS
   * recovery — отправляем код на существующий номер; после verify-otp вызываем onSuccess
   */
  mode?: "login" | "register" | "recovery";
  /** Вызывается, если в режиме register номер уже занят (вместо отправки SMS) */
  onAccountExists?: (phone: string) => void;
}

export function PhoneAuthForm({ onSuccess, mode = "login", onAccountExists }: PhoneAuthFormProps) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("+375");
  const [code, setCode] = useState(["", "", "", ""]);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const codeInputs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  // Auto-focus first code input on step change
  useEffect(() => {
    if (step === "code") {
      setTimeout(() => codeInputs.current[0]?.focus(), 100);
    }
  }, [step]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v.length < 4) {
      setPhone("+375");
      return;
    }
    setPhone(formatBYPhone(v));
  };

  const sendCode = async () => {
    if (!isValidBYPhone(phone)) {
      toast.error("Введите корректный номер: +375 (25/29/33/44) XXX-XX-XX");
      return;
    }
    // В режиме регистрации сначала проверяем, не занят ли номер
    if (mode === "register" && onAccountExists) {
      setIsSending(true);
      try {
        const { data, error } = await supabase.functions.invoke("check-account-exists", {
          body: { phone },
        });
        if (error) {
          toast.error("Не удалось проверить номер. Попробуйте позже.");
          return;
        }
        if ((data as { exists?: boolean } | null)?.exists) {
          onAccountExists(phone);
          return;
        }
      } catch (e) {
        toast.error("Ошибка сети: " + (e instanceof Error ? e.message : String(e)));
        return;
      } finally {
        setIsSending(false);
      }
    }
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { phone },
      });
      if (error) {
        // Edge function returns non-2xx for errors; supabase-js wraps them
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
      setStep("code");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Ошибка сети: " + msg);
    } finally {
      setIsSending(false);
    }
  };

  const verifyCode = async (fullCode: string) => {
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { phone, code: fullCode },
      });
      if (error) {
        const msg = (data as { error?: string } | null)?.error
          || (error as { message?: string }).message
          || "Неверный код";
        toast.error(msg);
        // Clear code so user can retry
        setCode(["", "", "", ""]);
        setTimeout(() => codeInputs.current[0]?.focus(), 50);
        return;
      }
      const respData = data as {
        success?: boolean;
        access_token?: string;
        refresh_token?: string;
        error?: string;
      };
      if (!respData?.success || !respData.access_token || !respData.refresh_token) {
        toast.error(respData?.error || "Ошибка авторизации");
        setCode(["", "", "", ""]);
        return;
      }
      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: respData.access_token,
        refresh_token: respData.refresh_token,
      });
      if (setSessionError) {
        toast.error("Не удалось установить сессию: " + setSessionError.message);
        return;
      }
      trackMetaEvent("CompleteRegistration", { method: "phone", status: true });
      toast.success("Вход выполнен!");
      onSuccess();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Ошибка сети: " + msg);
    } finally {
      setIsVerifying(false);
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

    // Multi-digit input (SMS autofill from iOS/Android) — distribute across cells
    if (digits.length > 1) {
      const next = ["", "", "", ""];
      // Preserve already-entered digits before idx
      for (let i = 0; i < idx; i++) next[i] = code[i] || "";
      for (let i = 0; i < digits.length && idx + i < 4; i++) {
        next[idx + i] = digits[i];
      }
      setCode(next);
      const lastFilled = Math.min(idx + digits.length - 1, 3);
      codeInputs.current[lastFilled]?.focus();
      if (next.every((c) => c.length === 1)) {
        void verifyCode(next.join(""));
      }
      return;
    }

    // Single digit — original behavior
    const digit = digits.slice(-1);
    const next = [...code];
    next[idx] = digit;
    setCode(next);

    if (digit && idx < 3) {
      codeInputs.current[idx + 1]?.focus();
    }

    if (next.every((c) => c.length === 1)) {
      void verifyCode(next.join(""));
    }
  };

  const handleCodeKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[idx] && idx > 0) {
      codeInputs.current[idx - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (pasted.length === 0) return;
    const next = ["", "", "", ""];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setCode(next);
    if (pasted.length === 4) {
      void verifyCode(pasted);
    } else {
      codeInputs.current[Math.min(pasted.length, 3)]?.focus();
    }
  };

  if (step === "phone") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone-auth">Номер телефона</Label>
          <Input
            id="phone-auth"
            type="tel"
            value={phone}
            onChange={handlePhoneChange}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void sendCode();
              }
            }}
            placeholder="+375 (XX) XXX-XX-XX"
            autoComplete="tel"
            inputMode="tel"
          />
          <p className="text-xs text-muted-foreground">
            Мы отправим SMS с 4-значным кодом
          </p>
        </div>
        <Button
          type="button"
          className="w-full"
          onClick={sendCode}
          disabled={isSending || !isValidBYPhone(phone)}
        >
          {isSending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Отправка...
            </>
          ) : (
            "Получить код"
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => {
          setStep("phone");
          setCode(["", "", "", ""]);
        }}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        disabled={isVerifying}
      >
        <ArrowLeft className="h-4 w-4" />
        Изменить номер
      </button>

      <div className="text-center text-sm text-muted-foreground">
        Введите код, отправленный на<br />
        <span className="font-medium text-foreground">{phone}</span>
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
            disabled={isVerifying}
            className="h-14 w-12 rounded-md border border-input bg-background text-center text-2xl font-semibold ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
          />
        ))}
      </div>

      {isVerifying && (
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
            disabled={isSending}
            className="text-sm text-primary hover:underline disabled:opacity-50"
          >
            {isSending ? "Отправка..." : "Отправить код повторно"}
          </button>
        )}
      </div>
    </div>
  );
}
