import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { domToBlob } from "modern-screenshot";
import { toast } from "sonner";
import { STORY_W, STORY_H } from "@/components/seller/story/StoryCanvas";

export type ExportKind = "download" | "share" | null;

const isIOS = () =>
  typeof navigator !== "undefined" &&
  (/iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1));

/** iOS игнорирует атрибут download у ссылок — там нужен предпросмотр/шеринг. */
const supportsAnchorDownload = () => !isIOS();

/**
 * Экспорт холста сторис в PNG: скачивание, Web Share и запасной
 * предпросмотр для iOS (сохранение долгим нажатием).
 */
export function useStoryExport(): {
  canvasRef: RefObject<HTMLDivElement>;
  exporting: ExportKind;
  canShareFiles: boolean;
  resultUrl: string | null;
  closeResult: () => void;
  handleDownload: () => Promise<void>;
  handleShare: () => Promise<void>;
} {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<ExportKind>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const [canShareFiles, setCanShareFiles] = useState(false);
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.share || !navigator.canShare) return;
    try {
      const probe = new File([new Blob(["1"], { type: "image/png" })], "p.png", { type: "image/png" });
      setCanShareFiles(navigator.canShare({ files: [probe] }));
    } catch {
      setCanShareFiles(false);
    }
  }, []);

  const renderPng = useCallback(async (): Promise<Blob> => {
    const node = canvasRef.current;
    if (!node) throw new Error("no canvas");
    try {
      await document.fonts.ready;
    } catch {
      /* noop */
    }
    const imgs = Array.from(node.querySelectorAll("img"));
    await Promise.all(
      imgs.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((res) => {
              img.onload = () => res();
              img.onerror = () => res();
            }),
      ),
    );
    // Первый прогон прогревает кеш картинок в Safari, второй даёт полную картинку.
    const opts = {
      width: STORY_W,
      height: STORY_H,
      scale: 1,
      type: "image/png" as const,
      backgroundColor: "#ffffff",
      fetch: { requestInit: { mode: "cors" as RequestMode, cache: "force-cache" as RequestCache } },
    };
    await domToBlob(node, opts);
    const blob = await domToBlob(node, opts);
    if (!blob || blob.size < 1000) throw new Error("empty blob");
    return blob;
  }, []);

  const prepare = useCallback(async (): Promise<Blob> => {
    const blob = await renderPng();
    blobRef.current = blob;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = URL.createObjectURL(blob);
    setResultUrl(urlRef.current);
    return blob;
  }, [renderPng]);

  const closeResult = useCallback(() => setResultUrl(null), []);

  const handleDownload = useCallback(async () => {
    setExporting("download");
    try {
      const blob = await prepare();
      if (supportsAnchorDownload()) {
        const a = document.createElement("a");
        a.href = urlRef.current!;
        a.download = "locus-story.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setResultUrl(null);
      } else {
        // iOS: показываем готовое изображение — сохранить долгим нажатием или через «Поделиться»
        void blob;
      }
    } catch (e) {
      console.error(e);
      toast.error("Не удалось создать изображение");
    } finally {
      setExporting(null);
    }
  }, [prepare]);

  const shareBlob = useCallback(async (blob: Blob) => {
    const file = new File([blob], "locus-story.png", { type: "image/png" });
    if (!navigator.canShare?.({ files: [file] })) {
      throw new Error("cannot share files");
    }
    await navigator.share({ files: [file] });
  }, []);

  const handleShare = useCallback(async () => {
    // Если картинка уже готова — делимся сразу, не теряя жест пользователя (важно для iOS).
    if (blobRef.current) {
      try {
        await shareBlob(blobRef.current);
        return;
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        console.error(e);
      }
    }
    setExporting("share");
    try {
      const blob = await prepare();
      try {
        await shareBlob(blob);
        setResultUrl(null);
      } catch (e: any) {
        if (e?.name === "AbortError") {
          setResultUrl(null);
          return;
        }
        // Жест «потерялся» либо шеринг файлов запрещён — показываем изображение
        toast.info("Нажмите «Поделиться» в открывшемся окне");
      }
    } catch (e) {
      console.error(e);
      toast.error("Не удалось создать изображение");
    } finally {
      setExporting(null);
    }
  }, [prepare, shareBlob]);

  return { canvasRef, exporting, canShareFiles, resultUrl, closeResult, handleDownload, handleShare };
}
