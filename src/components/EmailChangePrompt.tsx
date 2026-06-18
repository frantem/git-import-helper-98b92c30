import { useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  onDone: () => void;
  orderId?: string;
  sellerTimes?: Record<string, string>;
}

export function EmailChangePrompt({ onDone, orderId, sellerTimes }: Props) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Введите корректный Email");
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("save-buyer-email", {
        body: { email: trimmed },
      });
      if (error) throw error;
      if (!data?.success) {
        toast.error(data?.error || "Не удалось сохранить Email");
        return;
      }
      // Refresh session so user.email-derived UI stays consistent (best-effort)
      await supabase.auth.refreshSession().catch(() => {});

      // Send order notification email if we have an order context
      if (orderId) {
        supabase.functions.invoke("send-buyer-order-email", {
          body: { order_id: orderId, seller_times: sellerTimes || {} },
        }).catch((err) => console.error("send-buyer-order-email failed:", err));
        toast.success("Email сохранён — уведомление отправлено");
      } else {
        toast.success("Email сохранён");
      }
      onDone();
    } catch (err: any) {
      toast.error(err?.message || "Ошибка сохранения");
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
            Укажите ваш Email — пришлём подтверждение заказа и попросим оставить отзыв после доставки.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-3">
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
            Сохранить
          </Button>
          <Button type="button" variant="ghost" onClick={onDone} disabled={isLoading}>
            Пропустить
          </Button>
        </div>
      </form>
    </div>
  );
}
