import { useMemo, useState } from "react";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { StoryEditorLayout } from "@/components/seller/story/StoryEditorLayout";
import { StoryProductPicker } from "@/components/seller/story/StoryProductPicker";
import { BackgroundPicker } from "@/components/seller/story/BackgroundPicker";
import { AboutStoryCanvas } from "@/components/seller/story/AboutStoryCanvas";
import type { AboutTheme } from "@/components/seller/story/AboutProductCard";
import { STORY_W, STORY_H } from "@/components/seller/story/StoryCanvas";
import { useStoryProducts } from "@/hooks/useStoryProducts";
import { useStoryBackground } from "@/hooks/useStoryBackground";
import { useStoryExport } from "@/hooks/useStoryExport";
import { useProductRatings } from "@/hooks/useProductRatings";
import type { StoryProduct } from "@/components/seller/story/StoryProductCard";
import { cn } from "@/lib/utils";

const MAX_SELECTED = 2;

const THEMES: { id: AboutTheme; label: string }[] = [
  { id: "photoTop", label: "Фото сверху" },
  { id: "photoFull", label: "Фото на всю карточку" },
];

export default function SellerStoryAbout() {
  const { products, isLoading } = useStoryProducts();
  const bg = useStoryBackground();
  const { canvasRef, exporting, canShareFiles, handleDownload, handleShare } = useStoryExport();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [theme, setTheme] = useState<AboutTheme>("photoFull");
  const [showRating, setShowRating] = useState(true);

  const selected = useMemo(
    () => selectedIds.map((id) => products.find((p) => p.id === id)).filter(Boolean) as StoryProduct[],
    [selectedIds, products],
  );
  const ratings = useProductRatings(selectedIds);

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

  return (
    <>
      <StoryEditorLayout
        title="О продукте"
        isLoading={isLoading}
        hasProducts={products.length > 0}
        exporting={exporting}
        canShareFiles={canShareFiles}
        canExport={selected.length > 0}
        onDownload={handleDownload}
        onShare={handleShare}
        canvas={
          <AboutStoryCanvas
            ref={canvasRef}
            background={bg.background}
            products={selected}
            theme={theme}
            ratings={ratings}
            showRating={showRating}
          />
        }
      >
        <StoryProductPicker
          products={products}
          selectedIds={selectedIds}
          max={MAX_SELECTED}
          onToggle={toggle}
        />

        <section className="rounded-xl bg-card p-3 md:p-4">
          <h2 className="mb-3 font-bold">Вид карточки</h2>
          <div className="grid grid-cols-2 gap-2">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                aria-pressed={theme === t.id}
                className={cn(
                  "rounded-lg border-2 p-2 text-left transition-colors",
                  theme === t.id ? "border-primary bg-primary/5" : "border-border",
                )}
              >
                <div className="mb-2 overflow-hidden rounded-md border border-border/60">
                  {t.id === "photoTop" ? (
                    <div className="bg-card">
                      <div className="aspect-square bg-muted" />
                      <div className="space-y-1 p-1.5">
                        <div className="h-1.5 w-3/4 rounded bg-foreground/70" />
                        <div className="h-1 w-full rounded bg-muted-foreground/40" />
                      </div>
                    </div>
                  ) : (
                    <div className="relative aspect-[3/4] bg-muted">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />
                      <div className="absolute inset-x-1.5 bottom-1.5 space-y-1">
                        <div className="h-1.5 w-3/4 rounded bg-white/90" />
                        <div className="h-1 w-full rounded bg-white/50" />
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium leading-tight">{t.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl bg-card p-3 md:p-4">
          <h2 className="mb-3 font-bold">Фон</h2>
          <BackgroundPicker
            backgrounds={bg.allBackgrounds}
            selectedId={bg.background.id}
            onSelect={bg.setBackground}
            onUploadFile={bg.handleUploadFile}
          />
        </section>

        <section className="rounded-xl bg-card p-3 md:p-4">
          <label className="flex cursor-pointer items-center gap-3">
            <Checkbox checked={showRating} onCheckedChange={(v) => setShowRating(!!v)} />
            <span className="text-sm font-medium">Показывать рейтинг товара</span>
          </label>
          <p className="mt-2 text-xs text-muted-foreground">
            Если у товара ещё нет отзывов, блок рейтинга не показывается.
          </p>
        </section>
      </StoryEditorLayout>

      <ImageCropDialog
        open={!!bg.cropSrc}
        imageSrc={bg.cropSrc}
        onCancel={bg.cancelCrop}
        onCropped={bg.handleCropped}
        aspect={9 / 16}
        outputWidth={STORY_W}
        outputHeight={STORY_H}
        title="Обрезка фона (9:16)"
      />
    </>
  );
}
