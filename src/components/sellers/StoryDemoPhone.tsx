import { useEffect, useRef, useState } from "react";
import { Bell, Check, Download, Star } from "lucide-react";
import { useInView, usePrefersReducedMotion } from "@/components/motion/useMotion";
import cheeseImage from "@/assets/sellers-cheese.jpg";

const STEP_DURATION = 4500;

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

function StoreScreen() {
  const products = [
    { name: "Сыр Белпер Кнолле", weight: "120 г", price: "8,50", image: cheeseImage, crop: "object-center" },
    { name: "Качотта с пажитником", weight: "250 г", price: "16,00", image: cheeseImage, crop: "object-[65%_35%]" },
    { name: "Брынза домашняя", weight: "400 г", price: "18,00", image: cheeseImage, crop: "object-[35%_70%]" },
  ];

  return (
    <div className="relative flex h-full flex-col px-3">
      <div className="flex items-center gap-2">
        <img
          src={cheeseImage}
          alt=""
          className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-white/20"
        />
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold leading-tight text-white">Своё Подворье</p>
          <p className="text-[8px] leading-tight text-white/55">Работает в Витебске</p>
        </div>
        <span className="ml-auto flex items-center gap-0.5 text-[9px] font-semibold text-primary">
          <Star className="h-2.5 w-2.5 fill-current" />
          5.0
        </span>
      </div>

      <p className="mt-2 text-[7.5px] uppercase tracking-[0.14em] text-white/40">
        Крафтовые сыры и деликатесы
      </p>

      <div className="mt-2 space-y-1.5">
        {products.map((product) => (
          <div
            key={product.name}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-1.5"
          >
            <img
              src={product.image}
              alt=""
              className={`h-10 w-10 shrink-0 rounded-lg object-cover ${product.crop}`}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[9px] font-medium leading-tight text-white">{product.name}</p>
              <p className="text-[7.5px] leading-tight text-white/45">{product.weight}</p>
              <p className="mt-0.5 text-[9px] font-semibold leading-tight text-white">
                {product.price} BYN
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-primary px-2 py-1 text-[7.5px] font-semibold text-primary-foreground">
              В корзину
            </span>
          </div>
        ))}
      </div>

      <div className="mt-2 flex gap-1">
        {["Сыры", "Выпечка", "Мёд"].map((tag, index) => (
          <span
            key={tag}
            className={`rounded-full px-2 py-0.5 text-[7.5px] ${
              index === 0 ? "bg-primary/20 text-primary" : "bg-white/[0.06] text-white/55"
            }`}
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-2 rounded-lg bg-primary/10 px-2 py-1.5">
        <p className="text-[7.5px] font-semibold text-primary">Доставка по Витебску — завтра</p>
        <p className="text-[7px] text-white/45">Бесплатно от 30 BYN</p>
      </div>

      <div className="mt-auto rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5">
        <div className="flex items-center justify-between text-[7.5px] text-white/50">
          <span>Корзина</span>
          <span>2 товара · 24,50 BYN</span>
        </div>
      </div>

      <div className="demo-chip absolute inset-x-2.5 bottom-11 rounded-xl border border-primary/40 bg-[hsl(160_30%_12%)]/95 p-2 shadow-lg backdrop-blur">
        <p className="text-[7.5px] leading-snug text-white/85">
          <span className="font-semibold text-primary">Ваш сайт готов</span>
          <br />
          locusfood.by/seller/svoe-podvorye
        </p>
      </div>
    </div>
  );
}

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

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / STEP_DURATION);
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

  const Screen = step === 0 ? StoreScreen : step === 1 ? StoryScreen : OrderScreen;

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
            <Screen />
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
