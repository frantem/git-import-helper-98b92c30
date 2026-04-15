import { useState, useEffect } from "react";
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
import { Loader2 } from "lucide-react";

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

  // Load profile data (only if draft doesn't have them)
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("user_id", user.id)
        .single();
      
      if (data) {
        setDraft(s => ({
          ...s,
          name: s.name || data.full_name || "",
          phone: s.phone === "+375" ? (data.phone || "+375") : s.phone,
        }));
      }
    };
    
    loadProfile();
  }, [user]);

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
      setDraft(s => ({ ...s, phone: "+375" }));
      return;
    }
    setDraft(s => ({ ...s, phone: formatPhoneNumber(value) }));
  };

  const validatePhone = (phoneNumber: string) => {
    const digits = phoneNumber.replace(/\D/g, "");
    return digits.length === 12;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      if (!draft.email.trim()) {
        toast.error("Введите email");
        return;
      }
      if (password.length < 6) {
        toast.error("Пароль должен быть минимум 6 символов");
        return;
      }
    }

    if (!draft.name.trim()) {
      toast.error("Введите имя");
      return;
    }

    if (!validatePhone(draft.phone)) {
      toast.error("Введите корректный номер телефона");
      return;
    }

    if (!draft.district) {
      toast.error("Выберите район");
      return;
    }

    setIsLoading(true);

    try {
      let userId = user?.id;

      if (!user) {
        const { error: signUpError } = await signUp(draft.email, password, "buyer", draft.name.trim());
        
        if (signUpError) {
          if (signUpError.message.includes("already registered")) {
            toast.error("Этот email уже зарегистрирован. Войдите в аккаунт.");
          } else {
            toast.error("Ошибка регистрации: " + signUpError.message);
          }
          return;
        }

        const { data: { user: newUser } } = await supabase.auth.getUser();
        if (!newUser) {
          toast.error("Ошибка получения данных пользователя");
          return;
        }
        userId = newUser.id;
      }

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

      // Send email notification to admin (non-blocking)
      if (inserted?.id) {
        supabase.functions.invoke("send-seller-application-notification", {
          body: { application_id: inserted.id },
        }).catch((e) => console.error("Email notification error:", e));
      }

      clearDraft(DRAFT_KEY);

      if (!user) {
        toast.success("Мы отправили письмо на ваш email. Подтвердите email, затем войдите и ваша заявка будет отправлена.");
      } else {
        toast.success("Ваши данные получены, ожидайте звонка менеджера");
      }
      onSuccess?.();
    } catch (err) {
      toast.error("Произошла ошибка");
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: keyof DraftState, value: string) => {
    setDraft(s => ({ ...s, [field]: value }));
  };

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
        />
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

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Отправка...
          </>
        ) : (
          "Отправить заявку"
        )}
      </Button>
    </form>
  );
}