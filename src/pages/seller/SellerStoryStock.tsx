import { useMemo, useState } from "react";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { StoryEditorLayout } from "@/components/seller/story/StoryEditorLayout";
import { StoryProductPicker } from "@/components/seller/story/StoryProductPicker";
import { BackgroundPicker } from "@/components/seller/story/BackgroundPicker";
import { StoryCanvas, STORY_W, STORY_H } from "@/components/seller/story/StoryCanvas";
import { usePickupLabels } from "@/hooks/usePickupLabels";
import { useStoryProducts } from "@/hooks/useStoryProducts";
import { useStoryBackground } from "@/hooks/useStoryBackground";
import { useStoryExport } from "@/hooks/useStoryExport";
import type { StoryProduct } from "@/components/seller/story/StoryProductCard";

const MAX_SELECTED = 4;
const DEFAULT_HEADING = "В наличии";

export default function SellerStoryStock() {
  const { products, isLoading } = useStoryProducts();
  const bg = useStoryBackground();
  const { canvasRef, exporting, canShareFiles, resultUrl, closeResult, handleDownload, handleShare } = useStoryExport();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [heading, setHeading] = useState(DEFAULT_HEADING);

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

  return (
    <>
      <StoryEditorLayout
        title="В наличии"
        isLoading={isLoading}
        hasProducts={products.length > 0}
        exporting={exporting}
        canShareFiles={canShareFiles}
        canExport={selected.length > 0}
        onDownload={handleDownload}
        onShare={handleShare}
        canvas={
          <StoryCanvas
            ref={canvasRef}
            background={bg.background}
            products={selected}
            pickupLabels={pickupLabels}
            heading={heading}
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
          <h2 className="mb-3 font-bold">Фон</h2>
          <BackgroundPicker
            backgrounds={bg.allBackgrounds}
            selectedId={bg.background.id}
            onSelect={bg.setBackground}
            onUploadFile={bg.handleUploadFile}
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
