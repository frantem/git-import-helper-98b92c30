import { useCallback, useRef, useState, type RefObject } from "react";
import { domToBlob } from "modern-screenshot";
import { toast } from "sonner";
import { STORY_W, STORY_H } from "@/components/seller/story/StoryCanvas";

export type ExportKind = "download" | null;

export const isIOS = () =>
  typeof navigator !== "undefined" &&
  (/iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1));

const isSafari = () =>
  typeof navigator !== "undefined" &&
  /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);

/** Экспорт холста сторис в PNG и мгновенное скачивание файла. */
export function useStoryExport(): {
  canvasRef: RefObject<HTMLDivElement>;
  exporting: ExportKind;
  handleDownload: () => Promise<void>;
} {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<ExportKind>(null);

  const renderPng = useCallback(async (): Promise<Blob> => {
    const node = canvasRef.current;
    if (!node) throw new Error("no canvas");
    try {
      await withTimeout(document.fonts.ready, 3000);
    } catch {
      /* noop */
    }
    const imgs = Array.from(node.querySelectorAll("img"));
    await Promise.all(
      imgs.map((img) =>
        img.complete
          ? Promise.resolve()
          : withTimeout(
              new Promise<void>((res) => {
                img.addEventListener("load", () => res(), { once: true });
                img.addEventListener("error", () => res(), { once: true });
              }),
              5000,
            ).catch(() => undefined),
      ),
    );
    const opts = {
      width: STORY_W,
      height: STORY_H,
      scale: 1,
      type: "image/png" as const,
      backgroundColor: "#ffffff",
      timeout: 8000,
      fetch: { requestInit: { mode: "cors" as RequestMode, cache: "force-cache" as RequestCache } },
    };
    // Safari: первый прогон прогревает кеш картинок.
    if (isSafari()) await withTimeout(domToBlob(node, opts), 20000).catch(() => undefined);
    const blob = await withTimeout(domToBlob(node, opts), 20000);
    if (!blob || blob.size < 1000) throw new Error("empty blob");
    return blob;
  }, []);

  const handleDownload = useCallback(async () => {
    setExporting("download");
    try {
      const blob = await renderPng();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "locus-story.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      console.error(e);
      toast.error("Не удалось создать изображение, попробуйте ещё раз");
    } finally {
      setExporting(null);
    }
  }, [renderPng]);

  return { canvasRef, exporting, handleDownload };
}
