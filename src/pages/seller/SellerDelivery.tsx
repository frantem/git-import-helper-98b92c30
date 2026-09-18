import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, MapPin, Truck } from "lucide-react";
import { toast } from "sonner";
import PickupSettingsSection, { PickupSlots, DEFAULT_PICKUP_SLOTS } from "@/components/PickupSettingsSection";

interface DeliveryDraft {
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryTerms: string;
  address: { city: string; street: string; address_details: string };
  pickupSlots: PickupSlots;
  maxOrdersPerDay: number;
  busyDates: string[];
  vacationDates: string[];
}


export default function SellerDelivery() {
  const { user, role, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [pickupEnabled, setPickupEnabled] = useState(true);
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [deliveryTerms, setDeliveryTerms] = useState("");
  const [address, setAddress] = useState({ city: "", street: "", address_details: "" });

  const [pickupSlots, setPickupSlots] = useState<PickupSlots>(DEFAULT_PICKUP_SLOTS);
  const [maxOrdersPerDay, setMaxOrdersPerDay] = useState(5);
  const [busyDates, setBusyDates] = useState<Date[]>([]);
  const [vacationDates, setVacationDates] = useState<Date[]>([]);

  const draftKey = user ? `seller_delivery_draft_${user.id}` : null;

  const saveDraft = useCallback(() => {
    if (!draftKey || !dataLoaded) return;
    const snapshot: DeliveryDraft = {
      pickupEnabled,
      deliveryEnabled,
      deliveryTerms,
      address,
      pickupSlots,
      maxOrdersPerDay,
      busyDates: busyDates.filter((d) => !isNaN(d.getTime())).map((d) => d.toISOString()),
      vacationDates: vacationDates.filter((d) => !isNaN(d.getTime())).map((d) => d.toISOString()),
    };
    localStorage.setItem(draftKey, JSON.stringify(snapshot));
  }, [draftKey, dataLoaded, pickupEnabled, deliveryEnabled, deliveryTerms, address, pickupSlots, maxOrdersPerDay, busyDates, vacationDates]);

  useEffect(() => {
    if (!dataLoaded || !draftKey) return;
    const onHide = () => saveDraft();
    const onVis = () => { if (document.visibilityState === "hidden") saveDraft(); };
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVis);
    saveDraft();
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [saveDraft, dataLoaded, draftKey]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    if (role !== "seller" && role !== "admin") { navigate("/"); return; }

    const fetchData = async () => {
      const { data: farmer } = await supabase
        .from("farmers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!farmer) { setIsLoading(false); return; }
      setFarmerId(farmer.id);

      const f = farmer as any;
      let pEnabled = f.pickup_enabled ?? true;
      let dEnabled = f.delivery_enabled ?? false;
      let terms = f.delivery_terms || "";
      let addr = {
        city: f.city || "",
        street: f.street || "",
        address_details: f.address_details || "",
      };
      let slots: PickupSlots = f.pickup_slots ? (f.pickup_slots as PickupSlots) : DEFAULT_PICKUP_SLOTS;
      let maxOrders = f.max_orders_per_day != null ? Number(f.max_orders_per_day) : 5;
      let busy: Date[] = f.busy_dates ? (f.busy_dates as string[]).map((d) => new Date(d + "T00:00:00")) : [];
      let vacation: Date[] = f.vacation_dates ? (f.vacation_dates as string[]).map((d) => new Date(d + "T00:00:00")) : [];

      const saved = localStorage.getItem(`seller_delivery_draft_${user.id}`);
      if (saved) {
        try {
          const draft: DeliveryDraft = JSON.parse(saved);
          if (draft.pickupEnabled != null) pEnabled = draft.pickupEnabled;
          if (draft.deliveryEnabled != null) dEnabled = draft.deliveryEnabled;
          if (draft.deliveryTerms != null) terms = draft.deliveryTerms;
          if (draft.address) addr = { ...addr, ...draft.address };
          if (draft.pickupSlots) slots = draft.pickupSlots;
          if (draft.maxOrdersPerDay != null) maxOrders = draft.maxOrdersPerDay;
          if (draft.busyDates) busy = draft.busyDates.map((s) => new Date(s));
          if (draft.vacationDates) vacation = draft.vacationDates.map((s) => new Date(s));
        } catch {}
      }

      setPickupEnabled(pEnabled);
      setDeliveryEnabled(dEnabled);
      setDeliveryTerms(terms);
      setAddress(addr);
      setPickupSlots(slots);
      setMaxOrdersPerDay(maxOrders);
      setBusyDates(busy);
      setVacationDates(vacation);

      setIsLoading(false);
      setDataLoaded(true);
    };
    fetchData();
  }, [user, role, authLoading]);

  const handleSave = async () => {
    if (!farmerId || savingRef.current) return;

    if (!pickupEnabled && !deliveryEnabled) {
      toast.error("Выберите хотя бы один способ получения заказа");
      return;
    }

    if (deliveryEnabled && !deliveryTerms.trim()) {
      toast.error("Укажите условия доставки");
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    try {
      const formatDate = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const validBusy = busyDates.filter((d) => !isNaN(d.getTime()));
      const validVacation = vacationDates.filter((d) => !isNaN(d.getTime()));

      const { error } = await supabase
        .from("farmers")
        .update({
          pickup_enabled: pickupEnabled,
          delivery_enabled: deliveryEnabled,
          delivery_terms: deliveryEnabled ? deliveryTerms.trim() : null,
          city: address.city || null,
          street: address.street || null,
          address_details: address.address_details || null,
          pickup_slots: pickupSlots as any,
          max_orders_per_day: maxOrdersPerDay,
          busy_dates: validBusy.map(formatDate) as any,
          vacation_dates: validVacation.map(formatDate) as any,
        } as any)
        .eq("id", farmerId);

      if (error) { toast.error("Ошибка при сохранении: " + error.message); return; }

      if (draftKey) localStorage.removeItem(draftKey);
      toast.success("Настройки сохранены");
    } catch (e: any) {
      toast.error("Ошибка сохранения: " + (e?.message || "неизвестная ошибка"));
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Header />
        <main className="container mx-auto px-4 py-16 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </main>
        <BottomNavigation />
      </div>
    );
  }

  if (!farmerId) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Header />
        <main className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Профиль продавца не найден</p>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />
      <main className="container mx-auto px-3 py-4 bg-[#faf5ea]">
        <div className="flex items-center gap-2 mb-4">
          <Link to="/seller">
            <Button variant="ghost" className="p-2 min-h-[44px] min-w-[44px]">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-foreground">Доставка и самовывоз</h1>
        </div>

        <div className="space-y-4 rounded-xl bg-card p-4">
          {/* Самовывоз */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h2 className="font-medium text-foreground">Самовывоз</h2>
                <p className="text-xs text-muted-foreground">Покупатель забирает заказ у вас</p>
              </div>
            </div>
            <Switch checked={pickupEnabled} onCheckedChange={setPickupEnabled} />
          </div>

          {pickupEnabled && (
            <>
              <div className="pt-4 border-t border-border">
                <h3 className="font-medium text-foreground mb-3">Адрес для самовывоза</h3>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Населённый пункт</Label>
                    <Input value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} placeholder="Витебск" />
                  </div>
                  <div className="space-y-2">
                    <Label>Улица</Label>
                    <Input value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} placeholder="Центральная" />
                  </div>
                  <div className="space-y-2">
                    <Label>Дом, подъезд, квартира</Label>
                    <Input value={address.address_details} onChange={(e) => setAddress({ ...address, address_details: e.target.value })} placeholder="д.37, подъезд 2, этаж 2, кв.61" />
                  </div>
                  <p className="text-xs text-muted-foreground">Адрес будет показан покупателю при самовывозе</p>
                </div>
              </div>

              <PickupSettingsSection
                pickupSlots={pickupSlots}
                onPickupSlotsChange={setPickupSlots}
                maxOrdersPerDay={maxOrdersPerDay}
                onMaxOrdersChange={setMaxOrdersPerDay}
                busyDates={busyDates}
                onBusyDatesChange={setBusyDates}
                vacationDates={vacationDates}
                onVacationDatesChange={setVacationDates}
              />
            </>
          )}

          {/* Собственная доставка */}
          <div className="pt-4 border-t border-border">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <Truck className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <h2 className="font-medium text-foreground">Доставка</h2>
                  <p className="text-xs text-muted-foreground">Напишите как Вы можете доставить или отправить заказ покупателю</p>
                </div>
              </div>
              <Switch checked={deliveryEnabled} onCheckedChange={setDeliveryEnabled} />
            </div>

            {deliveryEnabled && (
              <div className="mt-4 space-y-3">
                <div className="space-y-2">
                  <Label>Стоимость доставки, BYN</Label>
                  <Input
                    inputMode="decimal"
                    value={deliveryCost}
                    onChange={(e) => setDeliveryCost(e.target.value)}
                    placeholder="6,90"
                    className="w-32"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Бесплатно от, BYN</Label>
                  <Input
                    inputMode="decimal"
                    value={freeDeliveryFrom}
                    onChange={(e) => setFreeDeliveryFrom(e.target.value)}
                    placeholder="Не обязательно"
                    className="w-40"
                  />
                  <p className="text-xs text-muted-foreground">
                    Если заполнено, при сумме заказа от этого значения доставка будет бесплатной.
                  </p>
                </div>
              </div>
            )}
          </div>

          <Button onClick={handleSave} className="w-full" disabled={isSaving}>
            {isSaving ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
}
