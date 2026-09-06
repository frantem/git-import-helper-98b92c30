import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Share2, Loader2 } from "lucide-react";
import { STORY_W, STORY_H } from "./StoryCanvas";
import type { ExportKind } from "@/hooks/useStoryExport";

interface Props {
  title: string;
  isLoading: boolean;
  hasProducts: boolean;
  /** Холст 1080×1920 (с ref для экспорта) */
  canvas: ReactNode;
  /** Секции настроек */
  children: ReactNode;
  exporting: ExportKind;
  canShareFiles: boolean;
  canExport: boolean;
  onDownload: () => void;
  onShare: () => void;
}

/**
 * Общая обёртка редактора сторис: шапка, масштабируемое превью,
 * фиксированная панель кнопок на мобильном и секции настроек.
 */
export function StoryEditorLayout({
  title, isLoading, hasProducts, canvas, children,
  exporting, canShareFiles, canExport, onDownload, onShare,
}: Props) {
  const navigate = useNavigate();
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);

  useEffect(() => {
    const el = previewWrapRef.current;
    if (!el) return;
    const update = () =>
      setScale(Math.min(el.clientWidth / STORY_W, el.clientHeight / STORY_H) || 0.3);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [isLoading, hasProducts]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-40 md:pb-0 bg-[#faf5ea]">
      <Header />
      <main className="container mx-auto px-4 py-4 md:py-6 max-w-5xl">
        <div className="mb-3 flex items-center gap-2 md:mb-4 md:gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/seller/story")} aria-label="Назад">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold md:text-2xl">{title}</h1>
        </div>

        {!hasProducts ? (
          <div className="rounded-xl bg-card p-8 text-center">
            <p className="mb-4 text-muted-foreground">
              Отметьте товары как «в наличии», чтобы создать сторис
            </p>
            <Button asChild>
              <Link to="/seller/products">Перейти к товарам</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 md:grid md:gap-6 md:grid-cols-[1fr_360px]">
            <div className="order-first space-y-3 md:order-last md:sticky md:top-20 md:self-start">
              <h2 className="hidden font-bold md:block">Превью</h2>
              <div
                ref={previewWrapRef}
                className="relative mx-auto h-[45svh] overflow-hidden rounded-2xl bg-muted shadow-lg md:h-auto md:w-full"
                style={{ aspectRatio: `${STORY_W} / ${STORY_H}` }}
              >
                <div
                  style={{
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                    width: STORY_W,
                    height: STORY_H,
                  }}
                >
                  {canvas}
                </div>
              </div>

              <div className="fixed inset-x-0 bottom-16 z-40 border-t border-border/60 bg-[#faf5ea]/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:static md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
                <div className={`grid gap-2 ${canShareFiles ? "grid-cols-2" : "grid-cols-1"}`}>
                  <Button size="lg" className="md:h-10" onClick={onDownload} disabled={!!exporting || !canExport}>
                    {exporting === "download" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Скачать
                  </Button>
                  {canShareFiles && (
                    <Button size="lg" variant="outline" className="md:h-10" onClick={onShare} disabled={!!exporting || !canExport}>
                      {exporting === "share" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
                      Поделиться
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4 md:space-y-6">{children}</div>
          </div>
        )}
      </main>
      <BottomNavigation />
    </div>
  );
}
