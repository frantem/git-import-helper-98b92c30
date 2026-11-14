import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MapPin, Plus, Store, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SellerTopBar } from "@/components/seller/SellerTopBar";
import { SellerBottomNav } from "@/components/seller/SellerBottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

/**
 * Получение заказов — по модели Shopify: две карточки.
 * Самовывоз: включён/выключен, список адресов (у кого несколько магазинов — несколько строк).
 * Доставка: включена/выключена, свободное описание условий.
 */
export default function SellerDelivery() {
  const { user, role, isLoading: authLoading } = useAuth();
  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [pickupEnabled, setPickupEnabled] = useState(true);
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [deliveryTerms, setDeliveryTerms] = useState("");
  const [city, setCity] = useState("");
  const [addresses, setAddresses] = useState<string[]>([""]);
  const [isApparel, setIsApparel] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    const fetchData = async () => {
      const { data: farmer } = await supabase
        .from("farmers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!farmer) {
        setIsLoading(false);
        return;
      }

      const f = farmer as Record<string, unknown>;
      setFarmerId(farmer.id);
      setIsApparel(f.store_type === "apparel" || f.store_type === "craft");
      setPickupEnabled((f.pickup_enabled as boolean | null) ?? true);
      setDeliveryEnabled((f.delivery_enabled as boolean | null) ?? false);
      setDeliveryTerms((f.delivery_terms as string | null) ?? "");
      setCity((f.city as string | null) ?? "");

      const details = ((f.address_details as string | null) ?? "").trim();
      const lines = details
        ? details.split("\n").map((line) => line.trim()).filter(Boolean)
        : [];
      setAddresses(lines.length > 0 ? lines : [""]);
      setIsLoading(false);
    };

    void fetchData();
  }, [user, authLoading]);

  const updateAddress = (index: number, value: string) => {
    setAddresses((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const addAddress = () => setAddresses((prev) => (prev.length >= 10 ? prev : [...prev, ""]));

  const removeAddress = (index: number) => {
    setAddresses((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [""];
    });
  };

  const handleSave = async () => {
    if (!farmerId) return;
    if (!pickupEnabled && !deliveryEnabled) {
      toast.error("Включите хотя бы один способ получения заказа");
      return;
    }

    const cleanedAddresses = addresses.map((line) => line.trim()).filter(Boolean);
    if (pickupEnabled && cleanedAddresses.length === 0) {
      toast.error("Укажите адрес, где покупатель заберёт заказ");
      return;
    }
    if (deliveryEnabled && !deliveryTerms.trim()) {
      toast.error("Опишите условия доставки");
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from("farmers")
      .update({
        city: city.trim() || null,
        address_details: cleanedAddresses.length > 0 ? cleanedAddresses.join("\n") : null,
        pickup_enabled: pickupEnabled,
        delivery_enabled: deliveryEnabled,
        delivery_terms: deliveryEnabled ? deliveryTerms.trim() : null,
      } as never)
      .eq("id", farmerId);
    setIsSaving(false);

    if (error) {
      toast.error("Не удалось сохранить");
      return;
    }
    toast.success("Сохранено");
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!farmerId || (role !== "seller" && role !== "admin")) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <Store className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Нужен аккаунт продавца</p>
        <Link to="/seller-application">
          <Button>Создать витрину</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <SellerTopBar />
      <main className="mx-auto w-full max-w-xl px-3 py-4">
        <div className="mb-4 flex items-center gap-2">
          <Link to="/seller">
            <Button variant="ghost" className="min-h-[44px] min-w-[44px] p-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Получение заказов</h1>
            <p className="text-xs text-muted-foreground">Как покупатель получит свой заказ</p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Самовывоз */}
          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <h2 className="font-semibold text-foreground">
                    {isApparel ? "Самовывоз и примерка" : "Самовывоз"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {isApparel
                      ? "Покупатель заберёт заказ или примерит его у вас"
                      : "Покупатель забирает заказ у вас"}
                  </p>
                </div>
              </div>
              <Switch checked={pickupEnabled} onCheckedChange={setPickupEnabled} />
            </div>

            {pickupEnabled && (
              <div className="mt-4 space-y-3 border-t border-border pt-4">
                <div className="space-y-2">
                  <Label>Город</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Витебск" />
                </div>

                <div className="space-y-2">
                  <Label>{addresses.length > 1 ? "Адреса и режим работы" : "Адрес и режим работы"}</Label>
                  {addresses.map((line, index) => (
                    <div key={index} className="flex items-start gap-1.5">
                      <Textarea
                        value={line}
                        onChange={(e) => updateAddress(index, e.target.value)}
                        placeholder="1. ТЦ «Марко-Сити», пав. 42 (ежедневно 10:00–20:00)"
                        rows={2}
                        className="min-h-[54px]"
                      />
                      {addresses.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAddress(index)}
                          aria-label="Удалить адрес"
                          className="mt-1 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addAddress} className="w-full">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Добавить ещё адрес
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Укажите каждую точку отдельно — покупатель увидит их при оформлении заказа.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Доставка */}
          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <Truck className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <h2 className="font-semibold text-foreground">Доставка</h2>
                  <p className="text-xs text-muted-foreground">
                    Почта или курьер по городу и Беларуси
                  </p>
                </div>
              </div>
              <Switch checked={deliveryEnabled} onCheckedChange={setDeliveryEnabled} />
            </div>

            {deliveryEnabled && (
              <div className="mt-4 space-y-2 border-t border-border pt-4">
                <Label htmlFor="delivery-terms">Условия и стоимость доставки</Label>
                <Textarea
                  id="delivery-terms"
                  value={deliveryTerms}
                  onChange={(e) => setDeliveryTerms(e.target.value)}
                  placeholder={
                    isApparel
                      ? "Европочта до отделения — 5 BYN (1-3 дня).\nПри заказе от 100 BYN — доставка бесплатная.\nТакже отправляем Белпочтой."
                      : "Например: курьер по Витебску — 5 BYN, бесплатно от 50 BYN. Европочта и Белпочта — по тарифам."
                  }
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Покупатель увидит этот текст при оформлении заказа.
                </p>
              </div>
            )}
          </section>

          <Button onClick={handleSave} className="w-full" disabled={isSaving}>
            {isSaving ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </main>
      <SellerBottomNav />
    </div>
  );
}
