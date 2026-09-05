import { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ImageCropDialogProps {
  open: boolean;
  imageSrc: string | null;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
  /** Output max size in pixels (square). Default 800. Used when outputWidth/Height not given. */
  outputSize?: number;
  /** Aspect ratio of the crop area. Default 1 (square). */
  aspect?: number;
  /** Explicit output dimensions (e.g. 1080×1920 for stories). */
  outputWidth?: number;
  outputHeight?: number;
  title?: string;
}

/**
 * Image cropping dialog. Forces aspect ratio (square by default) so all
 * images are uniform; user can only pan/zoom the crop area.
 */
export function ImageCropDialog({
  open,
  imageSrc,
  onCancel,
  onCropped,
  outputSize = 800,
  aspect = 1,
  outputWidth,
  outputHeight,
  title = "Обрезка фото",
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setProcessing(true);
    try {
      const w = outputWidth ?? Math.min(outputSize, Math.round(croppedAreaPixels.width));
      const h = outputHeight ?? w;
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels, w, h);
      onCropped(blob);
      // reset
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="relative w-full h-[320px] max-h-[55svh] min-h-[260px] bg-black rounded-md overflow-hidden">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              objectFit="contain"
            />
          )}
        </div>
        <div className="px-1">
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-primary"
            aria-label="Масштаб"
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={processing}>
            Отмена
          </Button>
          <Button onClick={handleConfirm} disabled={processing || !croppedAreaPixels}>
            {processing ? "Обработка…" : "Применить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function getCroppedBlob(
  src: string,
  area: Area,
  width: number,
  height: number,
): Promise<Blob> {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(
    image,
    area.x, area.y, area.width, area.height,
    0, 0, width, height,
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to crop"))),
      "image/jpeg",
      0.85,
    );
  });
}
