import { useRef, useState, type RefObject } from "react";
import { domToBlob } from "modern-screenshot";
import { toast } from "sonner";
import { STORY_W, STORY_H } from "@/components/seller/story/StoryCanvas";

export type ExportKind = "download" | "share" | null;

/**
 * Общая логика экспорта холста сторис в PNG: скачивание и Web Share.
 */
export function useStoryExport(): {
  canvasRef: RefObject<HTMLDivElement>;
  exporting: ExportKind;
  canShareFiles: boolean;
  handleDownload: () => Promise<void>;
  handleShare: () => Promise<void>;
} {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<ExportKind>(null);

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

  return { canvasRef, exporting, canShareFiles, handleDownload, handleShare };
}
