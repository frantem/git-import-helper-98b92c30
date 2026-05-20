import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Camera, Copy, Send } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/imageUtils";
import PickupSettingsSection, { PickupSlots, DEFAULT_PICKUP_SLOTS } from "@/components/PickupSettingsSection";

interface SellerDraft {
  settingsForm: {
    name: string; description: string; district: string; village: string;
    photo_url: string; city: string; street: string; address_details: string; slug: string;
  };
  pickupSlots: PickupSlots;
  maxOrdersPerDay: number;
  busyDates: string[];
  vacationDates: string[];
}

export default function SellerSettings() {
  const { user, role, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  const [settingsForm, setSettingsForm] = useState({
    name: "", description: "", district: "", village: "", photo_url: "", city: "", street: "", address_details: "", slug: "",
  });
  const [slugError, setSlugError] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [pickupSlots, setPickupSlots] = useState<PickupSlots>(DEFAULT_PICKUP_SLOTS);
  const [maxOrdersPerDay, setMaxOrdersPerDay] = useState(5);
  const [busyDates, setBusyDates] = useState<Date[]>([]);
  const [vacationDates, setVacationDates] = useState<Date[]>([]);

  const draftKey = user ? `seller_settings_draft_${user.id}` : null;

  // Save full snapshot to localStorage
  const saveDraft = useCallback(() => {
    if (!draftKey || !dataLoaded) return;
    const snapshot: SellerDraft = {
      settingsForm,
      pickupSlots,
      maxOrdersPerDay,
      busyDates: busyDates.filter(d => !isNaN(d.getTime())).map(d => d.toISOString()),
      vacationDates: vacationDates.filter(d => !isNaN(d.getTime())).map(d => d.toISOString()),
    };
    localStorage.setItem(draftKey, JSON.stringify(snapshot));
  }, [draftKey, dataLoaded, settingsForm, pickupSlots, maxOrdersPerDay, busyDates, vacationDates]);

  // Persist on change + pagehide/visibilitychange
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

      let form = {
        name: farmer.name,
        description: farmer.description || "",
        district: farmer.district,
        village: farmer.village || "",
        photo_url: farmer.photo_url || "",
        city: farmer.city || "",
        street: farmer.street || "",
        address_details: farmer.address_details || "",
        slug: farmer.slug || "",
      };

      let slots = DEFAULT_PICKUP_SLOTS;
      let maxOrders = 5;
      let busy: Date[] = [];
      let vacation: Date[] = [];

      const { data: profile } = await supabase
        .from("profiles")
        .select("pickup_slots, max_orders_per_day, busy_dates, vacation_dates")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile) {
        if (profile.pickup_slots) slots = profile.pickup_slots as unknown as PickupSlots;
        if (profile.max_orders_per_day != null) maxOrders = profile.max_orders_per_day as number;
        if (profile.busy_dates) busy = (profile.busy_dates as unknown as string[]).map(d => new Date(d + "T00:00:00"));
        if (profile.vacation_dates) vacation = (profile.vacation_dates as unknown as string[]).map(d => new Date(d + "T00:00:00"));
      }

      // Restore draft on top of DB data if exists
      const key = `seller_settings_draft_${user.id}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const draft: SellerDraft = JSON.parse(saved);
          if (draft.settingsForm) form = { ...form, ...draft.settingsForm };
          if (draft.pickupSlots) slots = draft.pickupSlots;
          if (draft.maxOrdersPerDay != null) maxOrders = draft.maxOrdersPerDay;
          if (draft.busyDates) busy = draft.busyDates.map(s => new Date(s));
          if (draft.vacationDates) vacation = draft.vacationDates.map(s => new Date(s));
        } catch {}
      }

      setSettingsForm(form);
      setPickupSlots(slots);
      setMaxOrdersPerDay(maxOrders);
      setBusyDates(busy);
      setVacationDates(vacation);

      setIsLoading(false);
      setDataLoaded(true);
    };
    fetchData();
  }, [user, role, authLoading]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    const compressed = await compressImage(file, 400, 400);
    const fileExt = compressed.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('farmer-avatars').upload(fileName, compressed);
    if (error) { toast.error("Ошибка загрузки фото"); setUploadingAvatar(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('farmer-avatars').getPublicUrl(fileName);
    setSettingsForm({ ...settingsForm, photo_url: publicUrl });
    setUploadingAvatar(false);
    toast.success("Фото загружено");
  };

  const handleSave = async () => {
    if (!farmerId || savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);

    try {
      const slug = settingsForm.slug.trim();
      if (slug) {
        if (slug.length < 3) { setSlugError("Минимум 3 символа"); return; }
        if (!/^[a-z0-9-]+$/.test(slug)) { setSlugError("Только латиница (строчная), цифры и дефисы"); return; }
        const { data: existing } = await (supabase.from("farmers").select("id") as any).eq("slug", slug).neq("id", farmerId).maybeSingle();
        if (existing) { setSlugError("Этот адрес уже занят"); return; }
      }
      setSlugError(null);

      const { error } = await supabase
        .from("farmers")
        .update({
          name: settingsForm.name,
          description: settingsForm.description || null,
          district: settingsForm.district,
          village: settingsForm.village || null,
          photo_url: settingsForm.photo_url || null,
          city: settingsForm.city || null,
          street: settingsForm.street || null,
          address_details: settingsForm.address_details || null,
          slug: slug || null,
        } as any)
        .eq("id", farmerId);

      if (error) { toast.error("Ошибка при сохранении: " + error.message); return; }

      const formatDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const validBusy = busyDates.filter(d => !isNaN(d.getTime()));
      const validVacation = vacationDates.filter(d => !isNaN(d.getTime()));

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          pickup_slots: pickupSlots as any,
          max_orders_per_day: maxOrdersPerDay,
          busy_dates: validBusy.map(formatDate),
          vacation_dates: validVacation.map(formatDate),
        } as any)
        .eq("user_id", user!.id);

      if (profileError) { toast.error("Ошибка сохранения настроек выдачи: " + profileError.message); return; }

      // Clear draft after successful save
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
          <h1 className="text-xl font-bold text-foreground">Настройки</h1>
        </div>

        <div className="space-y-4 rounded-xl bg-card p-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {settingsForm.photo_url ? (
                <img src={settingsForm.photo_url} alt="Аватар" className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center">
                  <span className="text-3xl">🧑‍🌾</span>
                </div>
              )}
              <label className="absolute -bottom-1 -right-1 cursor-pointer">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                  <Camera className="h-4 w-4 text-primary-foreground" />
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
              </label>
            </div>
            <div>
              <h3 className="font-medium text-foreground">{settingsForm.name || "Ваша ферма"}</h3>
              <p className="text-sm text-muted-foreground">{uploadingAvatar ? "Загрузка..." : "Нажмите на камеру для изменения фото"}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Название</Label>
            <Input value={settingsForm.name} onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Описание</Label>
            <Textarea value={settingsForm.description} onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })} placeholder="Расскажите о вашей ферме" />
          </div>
          <div className="space-y-2">
            <Label>Район</Label>
            <Input value={settingsForm.district} onChange={(e) => setSettingsForm({ ...settingsForm, district: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Населённый пункт</Label>
            <Input value={settingsForm.village} onChange={(e) => setSettingsForm({ ...settingsForm, village: e.target.value })} />
          </div>

          <div className="pt-4 border-t border-border">
            <h3 className="font-medium text-foreground mb-3">Адрес страницы</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Ваша ссылка</Label>
                {settingsForm.slug && settingsForm.slug.length >= 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 gap-1 text-xs text-muted-foreground"
                    onClick={() => {
                      navigator.clipboard.writeText(`https://locusfood.by/seller/${settingsForm.slug}?ref=1`);
                      toast.success("Ссылка скопирована");
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Скопировать
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-0">
                <span className="text-sm text-muted-foreground whitespace-nowrap">locusfood.by/seller/</span>
                <Input
                  value={settingsForm.slug}
                  onChange={(e) => {
                    setSettingsForm({ ...settingsForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') });
                    setSlugError(null);
                  }}
                  placeholder="my-farm"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">Латиница, цифры и дефисы. Минимум 3 символа.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <h3 className="font-medium text-foreground mb-3">Адрес для самовывоза</h3>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Населённый пункт</Label>
                <Input value={settingsForm.city} onChange={(e) => setSettingsForm({ ...settingsForm, city: e.target.value })} placeholder="Витебск" />
              </div>
              <div className="space-y-2">
                <Label>Улица</Label>
                <Input value={settingsForm.street} onChange={(e) => setSettingsForm({ ...settingsForm, street: e.target.value })} placeholder="Центральная" />
              </div>
              <div className="space-y-2">
                <Label>Дом, подъезд, квартира</Label>
                <Input value={settingsForm.address_details} onChange={(e) => setSettingsForm({ ...settingsForm, address_details: e.target.value })} placeholder="д.37, подъезд 2, этаж 2, кв.61" />
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

          <Button onClick={handleSave} className="w-full" disabled={isSaving}>
            {isSaving ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
}
