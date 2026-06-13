import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PhoneVerifyDialogProps {
  open: boolean;
  phone: string; // already formatted/validated +375 (XX) XXX-XX-XX
  onOpenChange: (open: boolean) => void;
  onVerified: (phone: string) => void;
}

export function PhoneVerifyDialog({ open, phone, onOpenChange, onVerified }: PhoneVerifyDialogProps) {
  const [code, setCode] = useState(["", "", "", ""]);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // Send code when dialog opens
  useEffect(() => {
    if (!open) return;
    setCode(["", "", "", ""]);
    void sendCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  useEffect(() => {
    if (open) setTimeout(() => inputs.current[0]?.focus(), 150);
  }, [open]);

  const sendCode = async () => {
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { phone },
      });
      const respData = data as { success?: boolean; retry_after?: number; error?: string } | null;
      if (error || !respData?.success) {
        const msg = respData?.error || (error as { message?: string } | null)?.message || "Не удалось отправить код";
        toast.error(msg);
        return;
      }
      toast.success("Код отправлен");
      setCountdown(respData.retry_after ?? 60);
    } catch (e) {
      toast.error("Ошибка сети: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsSending(false);
    }
  };

  const handleDigit = (idx: number, v: string) => {
    const digit = v.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[idx] = digit;
    setCode(next);
    if (digit && idx < 3) inputs.current[idx + 1]?.focus();
    if (digit && idx === 3 && next.every((d) => d)) {
      void verify(next.join(""));
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (text.length === 0) return;
    e.preventDefault();
    const next = ["", "", "", ""];
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setCode(next);
    inputs.current[Math.min(text.length, 3)]?.focus();
    if (text.length === 4) void verify(text);
  };

  const verify = async (fullCode: string) => {
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("link-phone-to-account", {
        body: { phone, code: fullCode },
      });
      const respData = data as { success?: boolean; error?: string } | null;
      if (error || !respData?.success) {
        const msg = respData?.error || (error as { message?: string } | null)?.message || "Неверный код";
        toast.error(msg);
        setCode(["", "", "", ""]);
        setTimeout(() => inputs.current[0]?.focus(), 50);
        return;
      }
      toast.success("Номер подтверждён");
      onVerified(phone);
    } catch (e) {
      toast.error("Ошибка сети: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Подтверждение номера</DialogTitle>
          <DialogDescription>
            Мы отправили 4-значный код на {phone}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 justify-center py-2">
          {code.map((d, i) => (
            <Input
              key={i}
              ref={(el) => (inputs.current[i] = el)}
              value={d}
              onChange={(e) => handleDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              inputMode="numeric"
              maxLength={1}
              className="w-12 h-12 text-center text-xl font-semibold"
              disabled={isVerifying}
            />
          ))}
        </div>

        {isVerifying && (
          <div className="flex justify-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Проверяем код...
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            onClick={sendCode}
            disabled={isSending || countdown > 0 || isVerifying}
          >
            {isSending ? "Отправка..." : countdown > 0 ? `Повторить через ${countdown} сек` : "Отправить код повторно"}
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isVerifying}>
            Отмена
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
