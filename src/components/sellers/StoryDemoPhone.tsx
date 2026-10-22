import { useEffect, useRef, useState } from "react";
import { Bell, Check, Download } from "lucide-react";
import { useInView, usePrefersReducedMotion } from "@/components/motion/useMotion";
import cheeseImage from "@/assets/sellers-cheese.jpg";

const DEFAULT_STEP_MS = 4500;
/** Первый шаг — запись настоящей витрины: даём видео доиграть. */
const SITE_STEP_MS = 8000;

const steps = [
  {
    short: " Сайт",
    caption: "Ваш личный сайт готов. Ссылку можно сразу ставить в шапку профиля Instagram.",
  },
  {
    short: "Контент",
    caption: "Больше не нужно часами сидеть в Canva. Сайт сам делает продающие сторис из ваших товаров.",
  },
  {
    short: "Заказы",
    caption: "Никаких потерянных переписок: заказ сформирован, контакты сохранены, сумма посчитана.",
  },
];

function StoryScreen() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[hsl(35_42%_86%)] text-[hsl(158_32%_12%)]">
      <img src={cheeseImage} alt="" className="h-[52%] w-full object-cover" />

      <div className="px-3 pt-2">
        <p className="text-[7.5px] font-semibold uppercase tracking-[0.16em] opacity-55">Новинка</p>
        <p className="mt-0.5 text-[15px] font-semibold leading-tight">Белпер Кнолле</p>
        <p className="mt-1 text-[9px] opacity-75">120 г · крафтовый сыр</p>
        <p className="mt-1 text-[13px] font-bold">8,50 BYN</p>

        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[hsl(158_32%_14%)] px-2.5 py-1 text-[7.5px] font-medium text-[hsl(40_45%_92%)]">
          Жми, чтобы заказать
        </span>
      </div>

      <div className="absolute inset-x-3 bottom-11 flex items-center justify-between">
        <span className="text-[7px] uppercase tracking-[0.14em] opacity-50">Своё Подворье · Витебск</span>
        <span className="text-[7px] opacity-50">9:16</span>
      </div>

      <div className="absolute inset-x-2.5 bottom-2.5">
        <div className="flex items-center justify-between rounded-lg bg-white/85 px-2 py-1.5 backdrop-blur">
          <span className="text-[8px] font-semibold">Скачать сторис</span>
          <Download className="h-3 w-3" />
        </div>
      </div>

      <div className="demo-toast absolute inset-x-2.5 bottom-[10px] flex items-center gap-1.5 rounded-lg bg-[hsl(150_42%_32%)] px-2.5 py-2 text-[8px] font-medium text-white shadow-lg">
        <Check className="h-2.5 w-2.5" />
        Сохранено в галерею
      </div>
    </div>
  );
}

function OrderScreen() {
  return (
    <div className="relative h-full w-full bg-gradient-to-b from-[hsl(200_28%_20%)] via-[hsl(175_24%_12%)] to-[hsl(160_30%_6%)]">
      <div className="pt-8 text-center text-white">
        <p className="text-[8px] uppercase tracking-[0.18em] text-white/45">вторник, 14 октября</p>
        <p className="mt-1 text-[38px] font-light leading-none tracking-tight">18:04</p>
      </div>

      <div className="demo-push absolute inset-x-2.5 top-[104px] rounded-2xl bg-white p-2.5 text-[hsl(158_32%_10%)] shadow-2xl">
        <div className="flex items-center gap-1.5 text-[7px] font-bold uppercase tracking-[0.12em] text-[hsl(158_30%_32%)]">
          <Bell className="h-2.5 w-2.5" />
          Locus · только что
        </div>
        <p className="mt-1 text-[10px] font-semibold leading-tight">Новый заказ #148 · 48,50 BYN</p>
        <p className="mt-0.5 text-[8px] leading-snug text-black/60">
          Анна: «2 шт. Белпер Кнолле, самовывоз к 18:00»
        </p>
        <div className="mt-1.5 flex gap-1">
          <span className="rounded-full bg-[hsl(150_42%_32%)] px-2 py-0.5 text-[7.5px] font-semibold text-white">
            Подтвердить
          </span>
          <span className="rounded-full bg-black/5 px-2 py-0.5 text-[7.5px] text-black/60">Детали</span>
        </div>
      </div>

      <p className="absolute inset-x-0 bottom-4 text-center text-[7px] uppercase tracking-[0.16em] text-white/30">
        Проведите вверх, чтобы открыть
      </p>
    </div>
  );
}

/** Запись реальной витрины продавца вместо нарисованного макета. */
function SiteVideo({ active }: { active: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active) {
      try {
        video.currentTime = 0;
      } catch {
        /* метаданные ещё не загрузились */
      }
      void video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [active]);

  return (
    <video
      ref={videoRef}
      src="/media/seller-site-demo.mp4"
      poster="/media/seller-site-demo.jpg"
      muted
      loop
      playsInline
      preload="metadata"
      aria-label="Запись витрины продавца на Locus"
      className="h-full w-full object-cover object-top"
    />
  );
}

export function StoryDemoPhone() {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>(false);
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced || paused || !inView) return;

    let frame = 0;
    const start = performance.now();
    const duration = step === 0 ? SITE_STEP_MS : DEFAULT_STEP_MS;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${progress})`;
      if (progress >= 1) {
        setStep((current) => (current + 1) % steps.length);
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [step, paused, inView, reduced]);

  useEffect(() => {
    if (reduced || paused || !inView) return;
    if (fillRef.current) fillRef.current.style.transform = "scaleX(0)";
  }, [step, paused, inView, reduced]);

  const goTo = (next: number) => {
    if (fillRef.current) fillRef.current.style.transform = "scaleX(0)";
    setStep(next);
  };

  const Screen = step === 1 ? StoryScreen : OrderScreen;
  const siteVideoActive = step === 0 && inView && !paused && !reduced;

  return (
    <div ref={ref} className="flex w-full flex-col items-center">
      <div
        className="relative rounded-[2.7rem] border-[7px] border-[hsl(160_25%_12%)] bg-[hsl(160_25%_6%)] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.75)]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="relative h-[412px] w-[232px] overflow-hidden rounded-[2.15rem] bg-[hsl(160_25%_6%)] sm:h-[452px] sm:w-[252px]">
          <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-4 pt-1.5 text-[7.5px] font-medium text-white/80">
            <span>9:41</span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
              <span className="h-1.5 w-3 rounded-sm border border-white/60" />
            </span>
          </div>

          <div className="absolute left-1/2 top-1.5 z-40 h-[13px] w-[58px] -translate-x-1/2 rounded-full bg-black" />

          <div role="tablist" aria-label="Шаги демонстрации" className="absolute inset-x-2.5 top-6 z-30 flex gap-1.5">
            {steps.map((item, index) => (
              <button
                key={item.short}
                role="tab"
                aria-selected={step === index}
                aria-label={`Шаг ${index + 1}: ${item.short}`}
                onClick={() => goTo(index)}
                className="group h-3 flex-1 pt-1 focus-visible:outline-none"
              >
                <span className="block h-[2px] w-full overflow-hidden rounded-full bg-white/20">
                  <span
                    ref={index === step ? fillRef : undefined}
                    className="block h-full w-full origin-left rounded-full bg-white"
                    style={{ transform: index < step ? "scaleX(1)" : "scaleX(0)" }}
                  />
                </span>
              </button>
            ))}
          </div>

          <div key={step} className="demo-screen h-full pt-9">
            {step === 0 ? <SiteVideo active={siteVideoActive} /> : <Screen />}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
        {steps.map((item, index) => (
          <button
            key={item.short}
            type="button"
            onClick={() => goTo(index)}
            aria-pressed={step === index}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              step === index
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
            }`}
          >
            {item.short}
          </button>
        ))}
      </div>

      <p
        key={`caption-${step}`}
        className="demo-caption mt-3 min-h-[40px] max-w-[300px] text-center text-xs leading-relaxed text-muted-foreground"
      >
        {steps[step].caption}
      </p>
    </div>
  );
}
