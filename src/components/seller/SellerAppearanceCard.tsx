import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { compressImage } from "@/lib/imageUtils";
import { cdnImage } from "@/lib/imageCdn";
import { BRAND_PRESETS, themeToHex } from "@/lib/sellerTheme";

const MAX_VIDEO_MB = 15;

/**
 * Оформление витрины: обложка, цветовая тема, факт о бренде и контакты.
 * Живёт внутри настроек продавца, но умеет сохраняться сама.
 */
export function SellerAppearanceCard() {
  const { user } = useAuth();
  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [farmerSlug, setFarmerSlug] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [hero, setHero] = useState({
    hero_media_url: "",
    hero_media_type: "",
    unique_fact: "",
    theme: "#2F5D45",
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

    const row = farmer as Record<string, any>;
    setFarmerId(farmer.id);
    setFarmerSlug(farmer.slug || farmer.id);
    setHero({
      hero_media_url: farmer.hero_media_url || "",
      hero_media_type: farmer.hero_media_type || "",
      unique_fact: row.unique_fact || "",
      theme: themeToHex(row.theme),
      contact_phone: row.contacts?.phone || "",
      contact_instagram: row.contacts?.instagram || "",
      contact_telegram: row.contacts?.telegram || "",
      contact_viber: row.contacts?.viber || "",
      contact_whatsapp: row.contacts?.whatsapp || "",
    });
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const save = async () => {
    if (!farmerId) return;
    setIsSaving(true);
    const { error } = await supabase
      .from("farmers")
      .update({
        hero_media_url: hero.hero_media_url || null,
        hero_media_type: hero.hero_media_url ? hero.hero_media_type || "image" : null,
        unique_fact: hero.unique_fact.trim() || null,
        theme: hero.theme || "#2F5D45",
        contacts: {
          phone: hero.contact_phone.trim() || null,
          instagram: hero.contact_instagram.trim() || null,
          telegram: hero.contact_telegram.trim() || null,
          viber: hero.contact_viber.trim() || null,
          whatsapp: hero.contact_whatsapp.trim() || null,
        },
      } as never)
      .eq("id", farmerId);
    setIsSaving(false);
    if (error) {
      toast.error("Не удалось сохранить оформление");
      return;
    }
    toast.success("Оформление сохранено");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!farmerId) {
    return <p className="text-sm text-muted-foreground">Витрина ещё не создана.</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Обложка витрины</Label>
        {hero.hero_media_url && (
          <div className="mb-2 overflow-hidden rounded-xl">
            {hero.hero_media_type === "video" ? (
              <video src={hero.hero_media_url} className="h-36 w-full object-cover" muted playsInline controls />
            ) : (
              <img src={cdnImage(hero.hero_media_url, "banner")} alt="" className="h-36 w-full object-cover" />
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

      <div className="space-y-2">
        <Label htmlFor="fact">Факт о бренде</Label>
        <Textarea
          id="fact"
          rows={2}
          value={hero.unique_fact}
          onChange={(e) => setHero({ ...hero, unique_fact: e.target.value })}
          placeholder="Например: печём на закваске без дрожжей, рецепту 40 лет"
        />
      </div>

      <div className="space-y-2">
        <Label>Цвет кнопок и акцентов</Label>
        <div className="flex flex-wrap gap-2">
          {BRAND_PRESETS.map((t) => (
            <button
              key={t.hex}
              type="button"
              onClick={() => setHero({ ...hero, theme: t.hex })}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                hero.theme.toUpperCase() === t.hex.toUpperCase() ? "border-primary bg-primary/10 font-medium" : "border-border"
              }`}
            >
              <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: t.hex }} />
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={/^#[0-9a-f]{6}$/i.test(hero.theme) ? hero.theme : "#2F5D45"}
            onChange={(e) => setHero({ ...hero, theme: e.target.value })}
            className="h-9 w-9 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
            aria-label="Свой цвет"
          />
          <Input
            value={hero.theme}
            onChange={(e) => setHero({ ...hero, theme: e.target.value })}
            placeholder="#2F5D45"
            maxLength={7}
            className="w-32"
          />
          <span className="text-xs text-muted-foreground">Свой цвет</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Контакты для покупателей</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={hero.contact_phone}
            onChange={(e) => setHero({ ...hero, contact_phone: e.target.value })}
            placeholder="Телефон: +375 29 000-00-00"
          />
          <Input
            value={hero.contact_instagram}
            onChange={(e) => setHero({ ...hero, contact_instagram: e.target.value })}
            placeholder="Instagram: @my_brand"
          />
          <Input
            value={hero.contact_telegram}
            onChange={(e) => setHero({ ...hero, contact_telegram: e.target.value })}
            placeholder="Telegram: @my_brand"
          />
          <Input
            value={hero.contact_viber}
            onChange={(e) => setHero({ ...hero, contact_viber: e.target.value })}
            placeholder="Viber: +375 29 000-00-00"
          />
          <Input
            value={hero.contact_whatsapp}
            onChange={(e) => setHero({ ...hero, contact_whatsapp: e.target.value })}
            placeholder="WhatsApp: +375 29 000-00-00"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={save} disabled={isSaving || uploading} className="flex-1">
          {isSaving ? "Сохранение…" : "Сохранить оформление"}
        </Button>
        {farmerSlug && (
          <a
            href={`/seller/${farmerSlug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-1 rounded-lg border border-border px-3 text-sm"
          >
            Открыть <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}
