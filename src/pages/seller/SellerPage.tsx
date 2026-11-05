import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Upload, ExternalLink, Lock } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/imageUtils";
import { cdnImage } from "@/lib/imageCdn";
import { useSellerPlan } from "@/hooks/useSellerPlan";

const MAX_VIDEO_MB = 15;

const THEMES: { value: string; label: string }[] = [
  { value: "forest", label: "Лес" },
  { value: "terracotta", label: "Терракота" },
  { value: "night", label: "Ночной синий" },
  { value: "sand", label: "Песок" },
];


export default function SellerPage() {
  const { user, role, isLoading: authLoading } = useAuth();
  const { canShowContacts } = useSellerPlan();

  const navigate = useNavigate();

  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [farmerSlug, setFarmerSlug] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [hero, setHero] = useState({
    hero_media_url: "",
    hero_media_type: "",
    unique_fact: "",
    theme: "forest",
    contact_phone: "",
    contact_instagram: "",
    contact_telegram: "",
    contact_viber: "",
    contact_whatsapp: "",
  });

  const load = useCallback(async () => {
    if (!user) return;
    const { data: farmer } = await supabase
      .from("farmers")
      .select("id, slug, hero_media_url, hero_media_type, unique_fact, contacts, theme")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!farmer) {
      setIsLoading(false);
      return;
    }

    setFarmerId(farmer.id);
    setFarmerSlug(farmer.slug || farmer.id);
    setHero({
      hero_media_url: farmer.hero_media_url || "",
      hero_media_type: farmer.hero_media_type || "",
      unique_fact: (farmer as any).unique_fact || "",
      theme: (farmer as any).theme || "forest",
      contact_phone: ((farmer as any).contacts as any)?.phone || "",
      contact_instagram: ((farmer as any).contacts as any)?.instagram || "",
      contact_telegram: ((farmer as any).contacts as any)?.telegram || "",
      contact_viber: ((farmer as any).contacts as any)?.viber || "",
      contact_whatsapp: ((farmer as any).contacts as any)?.whatsapp || "",
    });
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    if (role !== "seller" && role !== "admin") { navigate("/"); return; }
    load();
  }, [user, role, authLoading, load, navigate]);

  const uploadFile = async (file: File, kind: "image" | "video"): Promise<string | null> => {
    if (!user) return null;
    setUploading(true);
    try {
      let upload: File = file;
      if (kind === "image") {
        upload = await compressImage(file, "banner");
      } else if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
        toast.error(`Видео больше ${MAX_VIDEO_MB} МБ — сожмите файл`);
        return null;
      }

      const ext = upload.name.split(".").pop() || (kind === "video" ? "mp4" : "jpg");
      const path = `seller-page/${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("site-assets")
        .upload(path, upload, { contentType: upload.type || undefined, upsert: true });
      if (error) throw error;

      const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
      return data.publicUrl;
    } catch (e) {
      console.error(e);
      toast.error("Не удалось загрузить файл");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const saveHero = async () => {
    if (!farmerId) return;
    setIsSaving(true);
    const { error } = await supabase
      .from("farmers")
      .update({
        hero_media_url: hero.hero_media_url || null,
        hero_media_type: hero.hero_media_url ? hero.hero_media_type || "image" : null,
        unique_fact: hero.unique_fact.trim() || null,
        theme: hero.theme || "forest",
        contacts: {
          phone: hero.contact_phone.trim() || null,
          instagram: hero.contact_instagram.trim() || null,
          telegram: hero.contact_telegram.trim() || null,
          viber: hero.contact_viber.trim() || null,
          whatsapp: hero.contact_whatsapp.trim() || null,
        },
      })
      .eq("id", farmerId);
    setIsSaving(false);
    if (error) {
      toast.error("Ошибка сохранения");
      return;
    }
    toast.success("Обложка сохранена");
  };


  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf5ea]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!farmerId) {
    return (
      <div className="min-h-screen bg-[#faf5ea] pb-20 md:pb-0">
        <Header />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="mb-2 text-xl font-bold">Профиль продавца не найден</h1>
          <Button onClick={() => navigate("/seller")}>В панель продавца</Button>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf5ea] pb-20 md:pb-0">
      <Header />
      <main className="container mx-auto max-w-3xl px-4 py-6">
        <div className="mb-4 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/seller")} aria-label="Назад">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Моя страница</h1>
          {farmerSlug && (
            <Link
              to={`/seller/${farmerSlug}`}
              className="ml-auto inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Открыть <ExternalLink className="h-4 w-4" />
            </Link>
          )}
        </div>

        {/* Обложка */}
        <section className="mb-6 rounded-2xl bg-card p-4">
          <h2 className="mb-3 font-bold">Обложка</h2>

          <div className="space-y-3">
            <div>
              <Label>Фото или видео обложки</Label>
              {hero.hero_media_url && (
                <div className="mb-2 overflow-hidden rounded-xl">
                  {hero.hero_media_type === "video" ? (
                    <video src={hero.hero_media_url} className="h-40 w-full object-cover" muted playsInline controls />
                  ) : (
                    <img src={cdnImage(hero.hero_media_url, "banner")} alt="" className="h-40 w-full object-cover" />
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <Upload className="h-4 w-4" /> Фото
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const url = await uploadFile(f, "image");
                      if (url) setHero((h) => ({ ...h, hero_media_url: url, hero_media_type: "image" }));
                      e.target.value = "";
                    }}
                  />
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <Upload className="h-4 w-4" /> Видео (до {MAX_VIDEO_MB} МБ)
                  <input
                    type="file"
                    accept="video/mp4,video/webm"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const url = await uploadFile(f, "video");
                      if (url) setHero((h) => ({ ...h, hero_media_url: url, hero_media_type: "video" }));
                      e.target.value = "";
                    }}
                  />
                </label>
                {hero.hero_media_url && (
                  <Button
                    variant="ghost"
                    onClick={() => setHero((h) => ({ ...h, hero_media_url: "", hero_media_type: "" }))}
                  >
                    Убрать
                  </Button>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="fact">Факт уникальности (одна строка)</Label>
              <Textarea
                id="fact"
                rows={2}
                value={hero.unique_fact}
                onChange={(e) => setHero({ ...hero, unique_fact: e.target.value })}
                placeholder="Например: печём на закваске без дрожжей, рецепту 40 лет"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Конкретный факт, а не общая фраза. Пока пусто — на странице виден плейсхолдер.
              </p>
            </div>

            <div>
              <Label>Цветовая тема страницы</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {THEMES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setHero({ ...hero, theme: t.value })}
                    className={`rounded-full border px-4 py-1.5 text-sm ${
                      hero.theme === t.value
                        ? "border-primary bg-primary/10 font-medium"
                        : "border-border"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              {!canShowContacts && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl bg-background/80 backdrop-blur-[2px] p-3 text-center">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Контакты на Вашей странице<br />доступны по подписке Standard</p>
                  <Link to="/seller/tariffs">
                    <Button size="sm">Подключить Standard</Button>
                  </Link>
                </div>
              )}
              <div className={`grid gap-2 md:grid-cols-3 ${!canShowContacts ? "pointer-events-none select-none opacity-40" : ""}`}>
                <div>
                  <Label htmlFor="c-phone">Телефон</Label>
                  <Input
                    id="c-phone"
                    disabled={!canShowContacts}
                    value={hero.contact_phone}
                    onChange={(e) => setHero({ ...hero, contact_phone: e.target.value })}
                    placeholder="+375 29 000-00-00"
                  />
                </div>
                <div>
                  <Label htmlFor="c-ig">Instagram</Label>
                  <Input
                    id="c-ig"
                    disabled={!canShowContacts}
                    value={hero.contact_instagram}
                    onChange={(e) => setHero({ ...hero, contact_instagram: e.target.value })}
                    placeholder="@my_brand"
                  />
                </div>
                <div>
                  <Label htmlFor="c-tg">Telegram</Label>
                  <Input
                    id="c-tg"
                    disabled={!canShowContacts}
                    value={hero.contact_telegram}
                    onChange={(e) => setHero({ ...hero, contact_telegram: e.target.value })}
                    placeholder="@my_brand"
                  />
                </div>
                <div>
                  <Label htmlFor="c-vb">Viber (номер)</Label>
                  <Input
                    id="c-vb"
                    disabled={!canShowContacts}
                    value={hero.contact_viber}
                    onChange={(e) => setHero({ ...hero, contact_viber: e.target.value })}
                    placeholder="+375 29 000-00-00"
                  />
                </div>
                <div>
                  <Label htmlFor="c-wa">WhatsApp (номер)</Label>
                  <Input
                    id="c-wa"
                    disabled={!canShowContacts}
                    value={hero.contact_whatsapp}
                    onChange={(e) => setHero({ ...hero, contact_whatsapp: e.target.value })}
                    placeholder="+375 29 000-00-00"
                  />
                </div>
              </div>
            </div>


            <Button onClick={saveHero} disabled={isSaving || uploading} className="w-full">
              {isSaving ? "Сохранение…" : "Сохранить обложку"}
            </Button>
          </div>
        </section>

      </main>
      <BottomNavigation />
    </div>
  );
}
