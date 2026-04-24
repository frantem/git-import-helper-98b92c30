import { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ImageCropDialogProps {
  open: boolean;
  imageSrc: string | null;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
  /** Output max size in pixels (square). Default 800. */
  outputSize?: number;
}

/**
 * Square (1:1) image cropping dialog. Forces aspect ratio so all product
 * images are uniform; user can only pan/zoom the crop area.
 */
export function ImageCropDialog({
  open,
  imageSrc,
  onCancel,
  onCropped,
  outputSize = 800,
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
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels, outputSize);
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
          <DialogTitle>Обрезка фото</DialogTitle>
        </DialogHeader>
        <div className="relative w-full h-[320px] bg-black rounded-md overflow-hidden">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
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
  outputSize: number,
): Promise<Blob> {
  const image = await loadImage(src);
  const size = Math.min(outputSize, Math.round(area.width));
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(
    image,
    area.x, area.y, area.width, area.height,
    0, 0, size, size,
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to crop"))),
      "image/jpeg",
      0.85,
    );
  });
}
