import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { domToBlob } from "modern-screenshot";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { STORY_W, STORY_H } from "@/components/seller/story/StoryCanvas";

export type ExportKind = "download" | null;
export type PreviewMode = "ios" | "android" | "inapp";

export const isIOS = () =>
  typeof navigator !== "undefined" &&
  (/iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1));

export const isAndroid = () => typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

/** Встроенные браузеры приложений (Telegram, Instagram, Facebook, VK, Android WebView) */
export const isInAppBrowser = () =>
  typeof navigator !== "undefined" &&
  (/Telegram|Instagram|FBAN|FBAV|VKClient|Viber|; wv\)/i.test(navigator.userAgent) ||
    typeof (window as any).TelegramWebviewProxy !== "undefined");

/** Ссылка, открывающая текущую страницу в Chrome на Android */
export const chromeIntentUrl = () => {
  const { host, pathname, search } = window.location;
  return `intent://${host}${pathname}${search}#Intent;scheme=https;package=com.android.chrome;end`;
};

const isSafari = () =>
  typeof navigator !== "undefined" &&
  /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);

const FILE_NAME = "locus-story.png";
const BUCKET = "farmer-avatars";

interface Ready {
  key: string;
  blob: Blob;
  file: File;
  /** Публичная ссылка (Android) — для обычного скачивания через менеджер загрузок */
  downloadUrl?: string;
  viewUrl?: string;
}

/** Загружает PNG в хранилище продавца и возвращает ссылки для скачивания и просмотра */
async function uploadForDownload(blob: Blob): Promise<{ downloadUrl: string; viewUrl: string } | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return null;
    const path = `${uid}/story-export/${FILE_NAME}`;
    const { error } = await withTimeout(
      supabase.storage.from(BUCKET).upload(path, blob, { upsert: true, contentType: "image/png", cacheControl: "0" }),
      15000,
    );
    if (error) throw error;
    const v = Date.now();
    const dl = supabase.storage.from(BUCKET).getPublicUrl(path, { download: FILE_NAME }).data.publicUrl;
    const view = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    return { downloadUrl: `${dl}&v=${v}`, viewUrl: `${view}?v=${v}` };
  } catch (e) {
    console.error("story upload failed", e);
    return null;
  }
}

/**
 * Экспорт холста сторис в PNG.
 * Картинка готовится заранее в фоне (по `changeKey`), чтобы при нажатии «Скачать»
 * действие выполнялось сразу:
 * - iPhone: системное меню с «Сохранить изображение»;
 * - Android: обычная ссылка на файл → системный менеджер загрузок (работает и во встроенных браузерах);
 * - компьютер: скачивание файла.
 */
export function useStoryExport(changeKey = ""): {
  canvasRef: RefObject<HTMLDivElement>;
  exporting: ExportKind;
  handleDownload: () => Promise<void>;
  previewUrl: string | null;
  previewMode: PreviewMode;
  closePreview: () => void;
} {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<ExportKind>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const ready = useRef<Ready | null>(null);
  const ios = isIOS();
  const android = isAndroid();
  const inApp = isInAppBrowser();
  const previewMode: PreviewMode = ios ? "ios" : inApp ? "inapp" : "android";

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

  const prepare = useCallback(
    async (key: string): Promise<Ready> => {
      const blob = await renderPng();
      const item: Ready = { key, blob, file: new File([blob], FILE_NAME, { type: "image/png" }) };
      if (android) {
        const urls = await uploadForDownload(blob);
        if (urls) Object.assign(item, urls);
      }
      return item;
    },
    [android, renderPng],
  );

  // Фоновая подготовка картинки на всех устройствах
  useEffect(() => {
    ready.current = null;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const item = await prepare(changeKey);
        if (!cancelled) ready.current = item;
      } catch (e) {
        console.error(e);
      }
    }, 800);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [changeKey, prepare]);

  const showPreview = useCallback((src: Blob | string) => {
    setPreviewUrl((old) => {
      if (old?.startsWith("blob:")) URL.revokeObjectURL(old);
      return typeof src === "string" ? src : URL.createObjectURL(src);
    });
  }, []);

  const deliver = useCallback(
    async (item: Ready) => {
      // iPhone: системное меню «Поделиться» → «Сохранить изображение»
      if (ios) {
        if (navigator.canShare?.({ files: [item.file] })) {
          try {
            await navigator.share({ files: [item.file] });
            return;
          } catch (e) {
            if ((e as Error)?.name === "AbortError") return;
          }
        }
        showPreview(item.blob);
        return;
      }

      // Android: обычная ссылка на файл — скачивание берёт системный менеджер загрузок
      if (android) {
        if (item.downloadUrl) {
          window.location.href = item.downloadUrl;
          if (inApp) {
            showPreview(item.viewUrl ?? item.blob);
          } else {
            toast.success("Картинка сохранена в Загрузки", {
              duration: 8000,
              action: { label: "Не появилась?", onClick: () => showPreview(item.viewUrl ?? item.blob) },
            });
          }
          return;
        }
        // Хранилище недоступно — локальное скачивание + показ картинки
        localDownload(item.blob);
        showPreview(item.blob);
        return;
      }

      // Компьютер
      localDownload(item.blob);
    },
    [ios, android, inApp, showPreview],
  );

  const handleDownload = useCallback(async () => {
    const item = ready.current?.key === changeKey ? ready.current : null;
    if (item) {
      await deliver(item);
      return;
    }
    setExporting("download");
    try {
      const fresh = await prepare(changeKey);
      ready.current = fresh;
      if (ios) {
        // Жест пользователя уже «потерян» — показываем картинку для долгого нажатия
        showPreview(fresh.blob);
        return;
      }
      await deliver(fresh);
    } catch (e) {
      console.error(e);
      toast.error("Не удалось создать изображение, попробуйте ещё раз");
    } finally {
      setExporting(null);
    }
  }, [changeKey, deliver, ios, prepare, showPreview]);

  const closePreview = useCallback(() => {
    setPreviewUrl((old) => {
      if (old?.startsWith("blob:")) URL.revokeObjectURL(old);
      return null;
    });
  }, []);

  return { canvasRef, exporting, handleDownload, previewUrl, previewMode, closePreview };
}

function localDownload(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = FILE_NAME;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
