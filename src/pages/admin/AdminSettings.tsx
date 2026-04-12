import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { compressImage } from "@/lib/imageUtils";
import { Loader2, Clock, Save, Truck, Image, Share2, Upload, Search } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { FileText } from "lucide-react";

export default function AdminSettings() {
  const { user, role, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [cutoffTime, setCutoffTime] = useState("17:30");
  const [avgDeliveryTime, setAvgDeliveryTime] = useState("70");
  const [deliveryStartHour, setDeliveryStartHour] = useState("06:00");
  const [deliveryEndHour, setDeliveryEndHour] = useState("00:00");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Site assets states
  const [faviconUrl, setFaviconUrl] = useState("");
  const [ogImageUrl, setOgImageUrl] = useState("");
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [ogImagePreview, setOgImagePreview] = useState<string | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [ogImageFile, setOgImageFile] = useState<File | null>(null);

  // SEO states
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [googleVerification, setGoogleVerification] = useState("");
  
  // SEO templates
  const [productTitleTemplate, setProductTitleTemplate] = useState("");
  const [categoryTitleTemplate, setCategoryTitleTemplate] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (!authLoading && role !== "admin") {
      navigate("/");
      return;
    }
    if (user && role === "admin") {
      fetchSettings();
    }
  }, [user, role, authLoading]);

  const fetchSettings = async () => {
    setIsLoading(true);
    
    const [cutoffRes, avgDeliveryRes, startHourRes, endHourRes, faviconRes, ogImageRes, seoTitleRes, seoDescRes, googleVerRes, prodTplRes, catTplRes] = await Promise.all([
      supabase.from("app_settings").select("value").eq("key", "cutoff_time_minutes").maybeSingle(),
      supabase.from("app_settings").select("value").eq("key", "avg_delivery_time_minutes").maybeSingle(),
      supabase.from("app_settings").select("value").eq("key", "delivery_start_hour").maybeSingle(),
      supabase.from("app_settings").select("value").eq("key", "delivery_end_hour").maybeSingle(),
      supabase.from("app_settings").select("value").eq("key", "favicon_url").maybeSingle(),
      supabase.from("app_settings").select("value").eq("key", "og_image_url").maybeSingle(),
      supabase.from("app_settings").select("value").eq("key", "seo_default_title").maybeSingle(),
      supabase.from("app_settings").select("value").eq("key", "seo_default_description").maybeSingle(),
      supabase.from("app_settings").select("value").eq("key", "google_verification").maybeSingle(),
      supabase.from("app_settings").select("value").eq("key", "product_title_template").maybeSingle(),
      supabase.from("app_settings").select("value").eq("key", "category_title_template").maybeSingle(),
    ]);

    if (cutoffRes.data) {
      const minutes = parseInt(cutoffRes.data.value);
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      setCutoffTime(
        `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
      );
    }
    
    if (avgDeliveryRes.data) {
      setAvgDeliveryTime(avgDeliveryRes.data.value);
    }
    
    if (startHourRes.data) {
      const hour = parseInt(startHourRes.data.value);
      setDeliveryStartHour(`${hour.toString().padStart(2, "0")}:00`);
    }
    
    if (endHourRes.data) {
      const hour = parseInt(endHourRes.data.value);
      setDeliveryEndHour(hour === 24 ? "00:00" : `${hour.toString().padStart(2, "0")}:00`);
    }
    
    if (faviconRes.data?.value) {
      setFaviconUrl(faviconRes.data.value);
    }
    
    if (ogImageRes.data?.value) {
      setOgImageUrl(ogImageRes.data.value);
    }
    if (seoTitleRes.data?.value) setSeoTitle(seoTitleRes.data.value);
    if (seoDescRes.data?.value) setSeoDescription(seoDescRes.data.value);
    if (googleVerRes.data?.value) setGoogleVerification(googleVerRes.data.value);
    if (prodTplRes.data?.value) setProductTitleTemplate(prodTplRes.data.value);
    if (catTplRes.data?.value) setCategoryTitleTemplate(catTplRes.data.value);
    
    setIsLoading(false);
  };

  const handleFaviconSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFaviconFile(file);
      setFaviconPreview(URL.createObjectURL(file));
    }
  };

  const handleOgImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOgImageFile(file);
      setOgImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadSiteAsset = async (file: File, prefix: string): Promise<string | null> => {
    const compressed = await compressImage(file, 1200, 1200);
    const fileExt = compressed.name.split(".").pop();
    const fileName = `${prefix}-${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from("site-assets")
      .upload(fileName, compressed);

    if (error) {
      toast.error("Ошибка загрузки файла");
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("site-assets")
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    const [hours, mins] = cutoffTime.split(":").map(Number);
    const totalMinutes = hours * 60 + mins;
    
    const startHour = parseInt(deliveryStartHour.split(":")[0]);
    const endHour = deliveryEndHour === "00:00" ? 24 : parseInt(deliveryEndHour.split(":")[0]);

    // Upload images if selected
    let newFaviconUrl = faviconUrl;
    let newOgImageUrl = ogImageUrl;

    if (faviconFile) {
      const url = await uploadSiteAsset(faviconFile, "favicon");
      if (url) newFaviconUrl = url;
    }

    if (ogImageFile) {
      const url = await uploadSiteAsset(ogImageFile, "og-image");
      if (url) newOgImageUrl = url;
    }

    const updates = [
      supabase
        .from("app_settings")
        .update({ value: totalMinutes.toString(), updated_at: new Date().toISOString() })
        .eq("key", "cutoff_time_minutes"),
      supabase
        .from("app_settings")
        .update({ value: avgDeliveryTime, updated_at: new Date().toISOString() })
        .eq("key", "avg_delivery_time_minutes"),
      supabase
        .from("app_settings")
        .update({ value: startHour.toString(), updated_at: new Date().toISOString() })
        .eq("key", "delivery_start_hour"),
      supabase
        .from("app_settings")
        .update({ value: endHour.toString(), updated_at: new Date().toISOString() })
        .eq("key", "delivery_end_hour"),
      supabase
        .from("app_settings")
        .update({ value: newFaviconUrl, updated_at: new Date().toISOString() })
        .eq("key", "favicon_url"),
      supabase
        .from("app_settings")
        .update({ value: newOgImageUrl, updated_at: new Date().toISOString() })
        .eq("key", "og_image_url"),
      supabase
        .from("app_settings")
        .upsert({ key: "seo_default_title", value: seoTitle, updated_at: new Date().toISOString() }, { onConflict: "key" }),
      supabase
        .from("app_settings")
        .upsert({ key: "seo_default_description", value: seoDescription, updated_at: new Date().toISOString() }, { onConflict: "key" }),
      supabase
        .from("app_settings")
        .upsert({ key: "google_verification", value: googleVerification, updated_at: new Date().toISOString() }, { onConflict: "key" }),
    ];

    const results = await Promise.all(updates);
    const hasError = results.some(r => r.error);

    if (hasError) {
      toast.error("Ошибка при сохранении");
    } else {
      setFaviconUrl(newFaviconUrl);
      setOgImageUrl(newOgImageUrl);
      setFaviconFile(null);
      setOgImageFile(null);
      setFaviconPreview(null);
      setOgImagePreview(null);
      toast.success("Настройки обновлены");
    }
    setIsSaving(false);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <PageHeader title="⚙️ Настройки" backPath="/admin" />

        <div className="max-w-md mx-auto space-y-6">
          {/* Cutoff time setting */}
          <div className="rounded-xl bg-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Время развоза</h3>
                <p className="text-sm text-muted-foreground">
                  Во сколько происходит ежедневная доставка заказов
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cutoff-time">Время (ЧЧ:ММ)</Label>
              <Input
                id="cutoff-time"
                type="time"
                value={cutoffTime}
                onChange={(e) => setCutoffTime(e.target.value)}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">
                Заказы, готовые до этого времени, доставляются в тот же день.
                Остальные — на следующий день.
              </p>
            </div>
          </div>
          
          {/* Average delivery time setting */}
          <div className="rounded-xl bg-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Время доставки курьером</h3>
                <p className="text-sm text-muted-foreground">
                  Среднее время доставки до двери (добавляется к времени готовки)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="avg-delivery">Время (минуты)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="avg-delivery"
                  type="number"
                  value={avgDeliveryTime}
                  onChange={(e) => setAvgDeliveryTime(e.target.value)}
                  className="w-24"
                  min={10}
                />
                <span className="text-sm text-muted-foreground">минут</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Используется для расчёта "Доставка на дом Xч" = время приготовления + это время
              </p>
            </div>
          </div>
          
          {/* Delivery working hours setting */}
          <div className="rounded-xl bg-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Рабочие часы доставки</h3>
                <p className="text-sm text-muted-foreground">
                  Время в которое курьер доставляет заказы
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-center">
              <div className="space-y-2">
                <Label htmlFor="delivery-start">С</Label>
                <Input
                  id="delivery-start"
                  type="time"
                  value={deliveryStartHour}
                  onChange={(e) => setDeliveryStartHour(e.target.value)}
                  className="w-28"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery-end">До</Label>
                <Input
                  id="delivery-end"
                  type="time"
                  value={deliveryEndHour}
                  onChange={(e) => setDeliveryEndHour(e.target.value)}
                  className="w-28"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Вне этого времени пользователи смогут заказать только на другую дату
            </p>
          </div>

          {/* Favicon setting */}
          <div className="rounded-xl bg-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <Image className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Фавиконка</h3>
                <p className="text-sm text-muted-foreground">
                  Иконка в вкладке браузера (рекомендуется 32x32 или 64x64 px)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {(faviconPreview || faviconUrl) && (
                <img 
                  src={faviconPreview || faviconUrl} 
                  alt="Favicon" 
                  className="h-12 w-12 object-contain border border-border rounded"
                />
              )}
              <label className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors">
                  <Upload className="h-4 w-4" />
                  <span>Загрузить</span>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFaviconSelect} 
                />
              </label>
            </div>
          </div>

          {/* OG Image setting */}
          <div className="rounded-xl bg-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <Share2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Превью для соцсетей</h3>
                <p className="text-sm text-muted-foreground">
                  Картинка при публикации ссылки (рекомендуется 1200x630 px)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {(ogImagePreview || ogImageUrl) && (
                <img 
                  src={ogImagePreview || ogImageUrl} 
                  alt="OG Image" 
                  className="w-full max-w-md h-40 object-cover border border-border rounded"
                />
              )}
              <label className="cursor-pointer inline-block">
                <div className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors">
                  <Upload className="h-4 w-4" />
                  <span>Загрузить</span>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleOgImageSelect} 
                />
              </label>
            </div>
          </div>

          {/* SEO Settings */}
          <div className="rounded-xl bg-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Global SEO</h3>
                <p className="text-sm text-muted-foreground">
                  Мета-теги по умолчанию для поисковых систем
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="seo-title">Default Meta Title</Label>
              <Input
                id="seo-title"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="Locus — Маркетплейс натуральных продуктов"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="seo-description">Default Meta Description</Label>
              <Textarea
                id="seo-description"
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="Свежие фермерские продукты с доставкой..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="google-verification">Google Search Console Verification Code</Label>
              <Input
                id="google-verification"
                value={googleVerification}
                onChange={(e) => setGoogleVerification(e.target.value)}
                placeholder="Вставьте content из мета-тега верификации"
              />
              <p className="text-xs text-muted-foreground">
                Значение атрибута content из тега &lt;meta name="google-site-verification"&gt;
              </p>
            </div>
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Сохранить
          </Button>
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
}
