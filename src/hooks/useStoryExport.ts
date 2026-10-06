import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
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

const FILE_NAME = "locus-story.png";

/**
 * Экспорт холста сторис в PNG.
 * На iPhone картинка готовится заранее в фоне (по `changeKey`), чтобы при нажатии
 * «Скачать» сразу открыть системное меню с «Сохранить изображение».
 */
export function useStoryExport(changeKey = ""): {
  canvasRef: RefObject<HTMLDivElement>;
  exporting: ExportKind;
  handleDownload: () => Promise<void>;
  previewUrl: string | null;
  closePreview: () => void;
} {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<ExportKind>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const readyFile = useRef<{ key: string; file: File } | null>(null);
  const ios = isIOS();

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
    if (isSafari()) await withTimeout(domToBlob(node, opts), 20000).catch(() => undefined);
    const blob = await withTimeout(domToBlob(node, opts), 20000);
    if (!blob || blob.size < 1000) throw new Error("empty blob");
    return blob;
  }, []);

  // Фоновая подготовка на iPhone
  useEffect(() => {
    if (!ios) return;
    readyFile.current = null;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const blob = await renderPng();
        if (!cancelled) readyFile.current = { key: changeKey, file: new File([blob], FILE_NAME, { type: "image/png" }) };
      } catch (e) {
        console.error(e);
      }
    }, 800);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [changeKey, ios, renderPng]);

  const showPreview = (blob: Blob) => {
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(blob);
    });
  };

  const handleDownload = useCallback(async () => {
    if (ios) {
      const ready = readyFile.current?.key === changeKey ? readyFile.current.file : null;
      if (ready && navigator.canShare?.({ files: [ready] })) {
        try {
          await navigator.share({ files: [ready] });
          return;
        } catch (e) {
          if ((e as Error)?.name === "AbortError") return;
          showPreview(ready);
          return;
        }
      }
      if (ready) {
        showPreview(ready);
        return;
      }
    }
    setExporting("download");
    try {
      const blob = await renderPng();
      if (ios) {
        readyFile.current = { key: changeKey, file: new File([blob], FILE_NAME, { type: "image/png" }) };
        showPreview(blob);
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = FILE_NAME;
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
  }, [ios, changeKey, renderPng]);

  const closePreview = useCallback(() => {
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
  }, []);

  return { canvasRef, exporting, handleDownload, previewUrl, closePreview };
}
