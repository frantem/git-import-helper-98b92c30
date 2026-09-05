import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { domToBlob } from "modern-screenshot";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Download, Share2, Loader2 } from "lucide-react";
import { cdnImage } from "@/lib/imageCdn";
import { usePickupLabels } from "@/hooks/usePickupLabels";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { StoryCanvas, STORY_W, STORY_H } from "@/components/seller/story/StoryCanvas";
import { BackgroundPicker } from "@/components/seller/story/BackgroundPicker";
import { STORY_BACKGROUNDS, type StoryBackground } from "@/components/seller/story/storyBackgrounds";
import type { StoryProduct } from "@/components/seller/story/StoryProductCard";

const MAX_SELECTED = 4;
const DEFAULT_HEADING = "Выбор покупателей:";

export default function SellerStory() {
  const { user, role, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<StoryProduct[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [heading, setHeading] = useState(DEFAULT_HEADING);
  const [customBg, setCustomBg] = useState<StoryBackground | null>(null);
  const [background, setBackground] = useState<StoryBackground>(STORY_BACKGROUNDS[0]);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"download" | "share" | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    if (role !== "seller" && role !== "admin") { navigate("/"); return; }
    (async () => {
      const { data: farmer } = await supabase.from("farmers").select("id").eq("user_id", user.id).maybeSingle();
      if (!farmer) { setIsLoading(false); return; }
      const { data } = await supabase
        .from("products")
        .select("id, title, price, old_price, unit, image_url, farmer_id, prep_time_minutes, order_lead_time_hours")
        .eq("farmer_id", farmer.id)
        .eq("is_deleted", false)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      setProducts((data ?? []) as StoryProduct[]);
      setIsLoading(false);
    })();
  }, [user, role, authLoading, navigate]);

  // Масштаб превью под размер контейнера (по ширине и высоте)
  useEffect(() => {
    const el = previewWrapRef.current;
    if (!el) return;
    const update = () =>
      setScale(Math.min(el.clientWidth / STORY_W, el.clientHeight / STORY_H) || 0.3);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [isLoading]);

  const selected = useMemo(
    () => selectedIds.map((id) => products.find((p) => p.id === id)).filter(Boolean) as StoryProduct[],
    [selectedIds, products],
  );
  const pickupLabels = usePickupLabels(selected);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SELECTED) {
        toast.info(`Можно выбрать не больше ${MAX_SELECTED} товаров`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleUploadFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCropped = (blob: Blob) => {
    setCropSrc(null);
    if (customBg?.image?.startsWith("blob:")) URL.revokeObjectURL(customBg.image);
    const bg: StoryBackground = { id: "custom", label: "Своё", image: URL.createObjectURL(blob) };
    setCustomBg(bg);
    setBackground(bg);
  };

  const renderPng = async (): Promise<Blob> => {
    const node = canvasRef.current;
    if (!node) throw new Error("no canvas");
    await document.fonts.ready;
    const imgs = Array.from(node.querySelectorAll("img"));
    await Promise.all(
      imgs.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); }),
      ),
    );
    return domToBlob(node, {
      width: STORY_W,
      height: STORY_H,
      scale: 1,
      type: "image/png",
      fetch: { requestInit: { mode: "cors" } },
    });
  };

  const handleDownload = async () => {
    setExporting("download");
    try {
      const blob = await renderPng();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "locus-story.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      console.error(e);
      toast.error("Не удалось создать изображение");
    } finally {
      setExporting(null);
    }
  };

  const canShareFiles = typeof navigator !== "undefined" && !!navigator.share && !!navigator.canShare;

  const handleShare = async () => {
    setExporting("share");
    try {
      const blob = await renderPng();
      const file = new File([blob], "locus-story.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Locus" });
      } else {
        toast.info("Ваш браузер не поддерживает отправку файлов — скачайте и поделитесь вручную");
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        console.error(e);
        toast.error("Не удалось поделиться");
      }
    } finally {
      setExporting(null);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const allBackgrounds = customBg ? [customBg, ...STORY_BACKGROUNDS] : STORY_BACKGROUNDS;

  return (
    <div className="min-h-screen pb-40 md:pb-0 bg-[#faf5ea]">
      <Header />
      <main className="container mx-auto px-4 py-4 md:py-6 max-w-5xl">
        <div className="mb-3 flex items-center gap-2 md:mb-4 md:gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/seller")} aria-label="Назад">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold md:text-2xl">Создать изображение</h1>
        </div>

        {products.length === 0 ? (
          <div className="rounded-xl bg-card p-8 text-center">
            <p className="mb-4 text-muted-foreground">
              Отметьте товары как «в наличии», чтобы создать сторис
            </p>
            <Button asChild>
              <Link to="/seller/products">Перейти к товарам</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 md:grid md:gap-6 md:grid-cols-[1fr_360px]">
            {/* Превью */}
            <div className="order-first space-y-3 md:order-last md:sticky md:top-20 md:self-start">
              <h2 className="hidden font-bold md:block">Превью</h2>
              <div
                ref={previewWrapRef}
                className="relative mx-auto h-[45svh] overflow-hidden rounded-2xl bg-muted shadow-lg md:h-auto md:w-full"
                style={{ aspectRatio: `${STORY_W} / ${STORY_H}` }}
              >
                <div
                  style={{
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                    width: STORY_W,
                    height: STORY_H,
                  }}
                >
                  <StoryCanvas
                    ref={canvasRef}
                    background={background}
                    products={selected}
                    pickupLabels={pickupLabels}
                    heading={heading || DEFAULT_HEADING}
                  />
                </div>
              </div>

              {/* Кнопки: закреплены внизу на мобильном */}
              <div className="fixed inset-x-0 bottom-16 z-40 border-t border-border/60 bg-[#faf5ea]/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:static md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
                <div className={`grid gap-2 ${canShareFiles ? "grid-cols-2" : "grid-cols-1"}`}>
                  <Button
                    size="lg"
                    className="md:h-10"
                    onClick={handleDownload}
                    disabled={!!exporting || selected.length === 0}
                  >
                    {exporting === "download" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Скачать
                  </Button>
                  {canShareFiles && (
                    <Button
                      size="lg"
                      variant="outline"
                      className="md:h-10"
                      onClick={handleShare}
                      disabled={!!exporting || selected.length === 0}
                    >
                      {exporting === "share" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
                      Поделиться
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Настройки */}
            <div className="space-y-4 md:space-y-6">
              <section className="rounded-xl bg-card p-3 md:p-4">
                <div className="mb-2 flex items-center justify-between md:mb-3">
                  <h2 className="font-bold">Товары</h2>
                  <span className="text-sm text-muted-foreground">
                    Выбрано {selectedIds.length} из {MAX_SELECTED}
                  </span>
                </div>
                <div className="max-h-[42svh] space-y-2 overflow-y-auto pr-1 md:max-h-none md:overflow-visible md:pr-0">
                  {products.map((p) => {
                    const checked = selectedIds.includes(p.id);
                    const disabled = !checked && selectedIds.length >= MAX_SELECTED;
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center gap-3 rounded-lg border p-2 ${disabled ? "opacity-50" : "cursor-pointer"} ${checked ? "border-primary bg-primary/5" : "border-border"}`}
                      >
                        <Checkbox checked={checked} disabled={disabled} onCheckedChange={() => toggle(p.id)} />
                        <img
                          src={cdnImage(p.image_url, "thumb")}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-md object-cover bg-secondary md:h-12 md:w-12"
                        />
                        <span className="line-clamp-2 text-sm font-medium">{p.title}</span>
                      </label>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-xl bg-card p-3 md:p-4">
                <h2 className="mb-3 font-bold">Фон</h2>
                <BackgroundPicker
                  backgrounds={allBackgrounds}
                  selectedId={background.id}
                  onSelect={setBackground}
                  onUploadFile={handleUploadFile}
                />
              </section>

              <section className="rounded-xl bg-card p-3 md:p-4">
                <Label htmlFor="story-heading" className="mb-2 block font-bold">Заголовок</Label>
                <Input
                  id="story-heading"
                  value={heading}
                  maxLength={40}
                  onChange={(e) => setHeading(e.target.value)}
                  placeholder={DEFAULT_HEADING}
                  className="text-base"
                />
              </section>
            </div>
          </div>
        )}
      </main>


      <ImageCropDialog
        open={!!cropSrc}
        imageSrc={cropSrc}
        onCancel={() => setCropSrc(null)}
        onCropped={handleCropped}
        aspect={9 / 16}
        outputWidth={STORY_W}
        outputHeight={STORY_H}
        title="Обрезка фона (9:16)"
      />
      <BottomNavigation />
    </div>
  );
}
