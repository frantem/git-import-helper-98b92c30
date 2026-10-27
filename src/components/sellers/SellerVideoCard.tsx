import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";

export interface SellerVideoCardProps {
  /** Ссылка на вертикальный ролик продавца (9:16). Меняется одной строкой. */
  videoSrc: string;
  /** Кадр-заглушка: показывается до старта и при отключённой анимации. */
  poster: string;
  /** Аватар продавца; если не задан — показываем инициалы. */
  avatarSrc?: string;
  handle: string;
  subtitle: string;
  location: string;
  caption: string;
}

/**
 * Вертикальная видео-карточка в стиле Reels: оверлеи продавца, бейдж города
 * и подпись снизу. Живёт только на лендинге /for-sellers.
 */
export function SellerVideoCard({
  videoSrc,
  avatarSrc,
  poster,
  handle,
  subtitle,
  location,
  caption,
}: SellerVideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
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
    <div className="relative mx-auto w-full max-w-[360px] overflow-hidden rounded-[28px] border border-black/5 bg-black/5 shadow-xl">
      <div className="relative aspect-[9/16] w-full bg-[#E7E1D6]">
        <div className="absolute inset-0 overflow-hidden">
          <video
            ref={videoRef}
            src={videoSrc}
            poster={poster}
            playsInline
            muted
            loop
            autoPlay={!reduced}
            preload="metadata"
            className="absolute left-0 top-[-6%] h-[106%] w-full object-cover"
            onPlay={() => setPaused(false)}
            onPause={() => setPaused(true)}
          />
        </div>

        {/* Верхний оверлей: продавец и город */}
        <div className="pointer-events-none absolute inset-x-0 top-0 bg-black/75 px-3 pb-6 pt-3 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-white/50"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FAF8F5] text-[10px] font-bold text-[#1A1A1A]"
                >
                  СП
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-semibold leading-tight text-white">{handle}</p>
                <p className="truncate text-[11px] leading-tight text-white/80">{subtitle}</p>
              </div>
            </div>

            <span className="shrink-0 rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium text-white backdrop-blur">
              {location}
            </span>
          </div>
        </div>

        {/* Пауза: кнопка воспроизведения */}
        {paused && (
          <button
            type="button"
            onClick={toggle}
            aria-label="Воспроизвести видео"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 p-4 text-black shadow-lg transition hover:bg-white"
          >
            <Play className="h-5 w-5 fill-current" aria-hidden="true" />
          </button>
        )}

        {/* Нижний оверлей: подпись */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-3 pb-3 pt-10">
          <p className="rounded-2xl bg-white/95 px-3.5 py-2.5 text-[13px] font-semibold leading-snug text-[#1A1A1A] shadow-sm backdrop-blur">
            {caption}
          </p>
        </div>

        {/* Клик по видео — пауза/продолжить */}
        {!paused && (
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
