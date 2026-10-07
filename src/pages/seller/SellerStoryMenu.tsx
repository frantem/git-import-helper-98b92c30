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
import { MenuStoryCanvas } from "@/components/seller/story/MenuStoryCanvas";
import { STORY_H, STORY_W } from "@/components/seller/story/StoryCanvas";
import type { StoryProduct } from "@/components/seller/story/StoryProductCard";
import { useStoryProducts } from "@/hooks/useStoryProducts";
import { useStoryBackground } from "@/hooks/useStoryBackground";
import { useStoryExport } from "@/hooks/useStoryExport";

const MAX_SELECTED = 8;
const DEFAULT_HEADING = "Доступно для заказа";

export default function SellerStoryMenu() {
  const { products, seller, isLoading } = useStoryProducts();
  const bg = useStoryBackground();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [heading, setHeading] = useState(DEFAULT_HEADING);

  const selected = useMemo(
    () => selectedIds.map((id) => products.find((product) => product.id === id)).filter(Boolean) as StoryProduct[],
    [selectedIds, products],
  );

  const { canvasRef, exporting, handleDownload, previewUrl, previewMode, closePreview } = useStoryExport(
    `${selectedIds.join(',')}|${bg.background.id}|${heading}`,
  );

  const toggle = (id: string) => {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((productId) => productId !== id);
      if (current.length >= MAX_SELECTED) {
        toast.info(`Можно выбрать не больше ${MAX_SELECTED} товаров`);
        return current;
      }
      return [...current, id];
    });
  };

  return (
    <>
      <StoryEditorLayout
        title="Меню"
        isLoading={isLoading}
        hasProducts={products.length > 0}
        exporting={exporting}
        canExport={selected.length > 0}
        onDownload={handleDownload}
        previewUrl={previewUrl}
        onClosePreview={closePreview}
        previewMode={previewMode}
        canvas={<MenuStoryCanvas ref={canvasRef} background={bg.background} products={selected} heading={heading} seller={seller} />}
      >
        <StoryProductPicker products={products} selectedIds={selectedIds} max={MAX_SELECTED} onToggle={toggle} />

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
          <Label htmlFor="menu-story-heading" className="mb-2 block font-bold">Заголовок</Label>
          <Input
            id="menu-story-heading"
            value={heading}
            maxLength={45}
            onChange={(event) => setHeading(event.target.value)}
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