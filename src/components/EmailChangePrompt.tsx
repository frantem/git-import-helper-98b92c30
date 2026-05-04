import { useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  onDone: () => void;
}

export function EmailChangePrompt({ onDone }: Props) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Введите корректный Email");
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-email-change-code", {
        body: { new_email: trimmed },
      });
      if (error) throw error;
      if (!data?.success) {
        toast.error(data?.error || "Не удалось отправить код");
        return;
      }
      toast.success("Код отправлен на " + trimmed);
      setEmail(trimmed);
      setStep("code");
    } catch (err: any) {
      toast.error(err?.message || "Ошибка отправки");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) {
      toast.error("Код должен состоять из 6 цифр");
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-email-change-code", {
        body: { new_email: email, code: code.trim() },
      });
      if (error) throw error;
      if (!data?.success) {
        toast.error(data?.error || "Неверный код");
        return;
      }
      toast.success("Email подтверждён");
      await supabase.auth.refreshSession();
      onDone();
    } catch (err: any) {
      toast.error(err?.message || "Ошибка проверки");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mt-6 rounded-2xl bg-card p-5 shadow-sm border border-border text-left">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">
            Хотите получать уведомления о заказах на почту?
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {step === "email"
              ? "Введите ваш Email — мы пришлём код подтверждения."
              : `Введите код, отправленный на ${email}`}
          </p>
        </div>
      </div>

      {step === "email" ? (
        <form onSubmit={handleSendCode} className="space-y-3">
          <div>
            <Label htmlFor="email-prompt" className="sr-only">Email</Label>
            <Input
              id="email-prompt"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Получить код
            </Button>
            <Button type="button" variant="ghost" onClick={onDone} disabled={isLoading}>
              Пропустить
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-3">
          <div>
            <Label htmlFor="code-prompt" className="sr-only">Код</Label>
            <Input
              id="code-prompt"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              placeholder="6-значный код"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              autoComplete="one-time-code"
              required
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Подтвердить
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setStep("email"); setCode(""); }} disabled={isLoading}>
              Назад
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
