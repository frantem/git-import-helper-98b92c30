import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SellerVideoCardProps {
  /** Ссылка на вертикальный ролик продавца. Меняется одной строкой. */
  videoSrc?: string;
  /** Фотография витрины — показывается, если видео не задано. */
  imageSrc?: string;
  poster?: string;
  /** Аватар продавца; если не задан — показываем инициалы. */
  avatarSrc?: string;
  handle: string;
  subtitle: string;
  location: string;
  caption: string;
}

/**
 * Карточка-«полароид» в стиле Hotplate: белая рамка, кадр 4:5.5,
 * оверлеи продавца прямо на кадре, без плашек. Только для /for-sellers.
 */
export function SellerVideoCard({
  videoSrc,
  imageSrc,
  avatarSrc,
  handle,
  subtitle,
  location,
  caption,
}: SellerVideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(!videoSrc);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setReduced(query.matches);
      if (query.matches) setPaused(true);
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  };

  return (
    <div className="rounded-[24px] bg-white p-2 shadow-[0_24px_60px_rgba(20,20,20,0.14)] ring-1 ring-black/5">
      <div className="relative aspect-[4/5.5] w-full overflow-hidden rounded-[16px] bg-[#EDEAE2]">
        {videoSrc ? (
          <video
            ref={videoRef}
            src={videoSrc}
            playsInline
            muted
            loop
            autoPlay={!reduced}
            preload="auto"
            className={cn(
              "absolute inset-0 h-full w-full object-cover object-bottom transition-opacity duration-300",
              ready ? "opacity-100" : "opacity-0",
            )}
            onLoadedData={() => setReady(true)}
            onCanPlay={() => setReady(true)}
            onPlay={() => setPaused(false)}
            onPause={() => setPaused(true)}
          />
        ) : (
          <img src={imageSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}

        {/* Загрузка как в Instagram: тёмный кадр и крутящийся индикатор */}
        {videoSrc && !ready && (
          <div aria-hidden="true" className="absolute inset-0 grid place-items-center bg-[#171717]">
            <span className="hp-spinner" />
          </div>
        )}

        {/* Градиенты под текст */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/40 to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/70 via-black/25 to-transparent"
        />

        {/* Продавец и город */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4">
          <div className="flex min-w-0 items-center gap-2.5">
            {avatarSrc ? (
              <img src={avatarSrc} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FAF8F5] text-[12px] font-bold text-[#1A1A1A]"
              >
                ЛК
              </span>
            )}
            <div className="min-w-0 text-white">
              <p
                className={cn(
                  "truncate font-semibold leading-tight",
                  handle.length > 18 ? "text-[12px]" : "text-[14.5px]",
                )}
              >
                {handle}
              </p>
              <p className="truncate text-[11.5px] leading-tight text-white/80">{subtitle}</p>
            </div>
          </div>

          <span className="shrink-0 rounded-full bg-black/35 px-2.5 py-1 text-[10.5px] font-medium text-white backdrop-blur-sm sm:px-3 sm:py-1.5 sm:text-[11.5px]">
            {location}
          </span>
        </div>

        {/* Воспроизведение */}
        {videoSrc && paused && (
          <button
            type="button"
            onClick={toggle}
            aria-label="Воспроизвести видео"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 p-4 text-black shadow-lg transition hover:bg-white"
          >
            <Play className="h-5 w-5 fill-current" aria-hidden="true" />
          </button>
        )}

        {/* Подпись */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5">
          <p className="text-[21px] font-semibold leading-[1.16] text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.35)] sm:text-[23px]">
            {caption}
          </p>
        </div>

        {videoSrc && !paused && (
          <button
            type="button"
            onClick={toggle}
            aria-label="Поставить видео на паузу"
            className="absolute inset-0 h-full w-full cursor-pointer"
          />
        )}
      </div>
    </div>
  );
}
