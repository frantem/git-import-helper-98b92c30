import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  Download,
  Instagram,
  Mail,
  MessageCircle,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import bakeryImage from "@/assets/sellers-bakery.jpg";
import cheeseImage from "@/assets/sellers-cheese.jpg";
import pastryImage from "@/assets/sellers-pastry.jpg";

const applicationPath = "/seller-application";
const exampleSiteImage = "/media/for-sellers-example-site.jpg";
const sellerPageScreenshot = "/media/knyazhetsky-page.jpg";
const sellerPageVideo = "/media/knyazhetsky-page.mp4";
const storyNovinkaImage = "/media/story-example-novinka.jpg";
const storyAvailableImage = "/media/story-example-available.jpg";
const sectionClass = "mx-auto w-full max-w-6xl px-5 md:px-10";

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Сайт для малого бизнеса на Locus",
  description:
    "Сайт с каталогом, корзиной и генератором сторис для мастеров, кондитеров, пекарей и фермеров Витебска. Готов к AI-поиску: структурированные данные, llms.txt, серверный пререндер.",
  provider: { "@type": "Organization", name: "Locus", url: "https://locusfood.by" },
  areaServed: { "@type": "City", name: "Витебск" },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "BYN",
    url: "https://locusfood.by/seller-application",
  },
};

const aiAnswers = {
  google: {
    title: "Режим ИИ",
    answer:
      "В Витебске торты ручной работы можно заказать у кондитера «Своё Подворье». На сайте есть каталог с ценами и наличием, доставка по городу и самовывоз.",
    source: "Своё Подворье — кондитерская мастерская",
    url: "locusfood.by/seller/svoe-podvorye",
    meta: "3 источника · каталог, цены, доставка",
  },
  alice: {
    title: "Алиса",
    answer:
      "Могу предложить «Княжеское подворье» — домашние сыры и выпечка. Посмотреть ассортимент и оформить заказ можно на её странице: самовывоз в Витебске или доставка.",
    source: "Княжеское подворье — фермерское хозяйство",
    url: "locusfood.by/seller/knyazhetsky",
    meta: "Ответ по данным сайта · актуально сегодня",
  },
} as const;

const aiProofPoints: Array<[string, string]> = [
  ["Семантическая разметка", "JSON-LD: товары, цены, наличие, адрес"],
  ["llms.txt и sitemap.xml", "понятная карта сайта для ИИ и поисковиков"],
  ["Серверный пререндер", "боты получают готовый текст, а не пустую оболочку"],
  ["Движок обновляется каждую неделю", "сайт не устаревает, как сделанный «один раз и навсегда»"],
];

const beautyPoints: Array<[string, string]> = [
  ["Крупная типографика и воздух", "заголовки, отступы и ритм уже настроены"],
  ["Карточки, которые продают", "фото, цена и наличие видны сразу"],
  ["Корзина в один тап", "никаких форм на пять шагов"],
];

const storyStats: Array<[string, string]> = [
  ["1–2 часа", "экономия каждый вечер"],
  ["9:16", "готовый формат для соцсетей"],
  ["1 клик", "скачать и опубликовать"],
];

const orderChannels: Array<[string, string]> = [
  ["Telegram", "заказ с составом и временем получения"],
  ["Email", "письмо с деталями и контактом покупателя"],
  ["SMS", "если телефон под рукой, а интернета нет"],
];

const startSteps = [
  { title: "Заполните заявку", text: "Это займёт около двух минут. Расскажите о своих товарах.", icon: Clock3 },
  { title: "Загрузите товары", text: "Название, фото, цены и условия получения. Можно с телефона.", icon: Store },
  { title: "Принимайте заказы", text: "Дайте покупателям ссылку — заказы придут в Telegram и на почту.", icon: Zap },
];

function SectionLabel({ index, children }: { index: string; children: ReactNode }) {
  return (
    <p className="mb-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em]">
      <span className="text-primary">{index}</span>
      <span aria-hidden="true" className="h-px w-8 bg-primary/40" />
      <span className="text-muted-foreground">{children}</span>
    </p>
  );
}

function ApplicationButton({ label, className = "" }: { label: string; className?: string }) {
  return (
    <Button asChild size="lg" className={`h-12 rounded-full px-6 text-sm font-semibold ${className}`}>
      <Link to={applicationPath}>
        {label}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </Button>
  );
}

function PhoneShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[2.2rem] border-[6px] border-white/10 bg-card shadow-2xl ${className}`}>
      <div className="relative overflow-hidden rounded-[1.75rem] bg-background">
        <div aria-hidden="true" className="flex h-6 items-center justify-center">
          <span className="h-1.5 w-14 rounded-full bg-white/15" />
        </div>
        {children}
      </div>
    </div>
  );
}

function AiSearchMock() {
  const [tab, setTab] = useState<keyof typeof aiAnswers>("google");
  const active = aiAnswers[tab];
  const tabs = [
    ["google", "Google · ИИ"],
    ["alice", "Алиса"],
  ] as const;

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
      <div role="tablist" aria-label="Пример ответа ИИ" className="flex items-center gap-1 border-b border-border px-3 py-2.5 md:px-5">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
              tab === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          живой пример
        </span>
      </div>

      <div className="p-4 md:p-6">
        <div className="flex items-center gap-3 rounded-full border border-border bg-background px-4 py-3">
          <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm text-foreground/90">
            Где в Витебске заказать торт ручной работы?
          </span>
        </div>

        <div className="mt-4 rounded-2xl border border-primary/25 bg-primary/[0.06] p-4 md:p-5">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
            <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
            {active.title}
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-foreground/90">{active.answer}</p>

          <div className="mt-4 flex items-start gap-3 rounded-xl border border-border bg-background p-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Store aria-hidden="true" className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{active.source}</p>
              <p className="truncate text-xs text-primary">{active.url}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{active.meta}</p>
            </div>
            <ChevronRight aria-hidden="true" className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Ответ собран из данных сайта: каталог, цены, наличие, адрес самовывоза.
        </p>
      </div>
    </div>
  );
}

function StoryMenuCard() {
  const rows = [
    { image: cheeseImage, name: "Брынза", price: "18,00" },
    { image: pastryImage, name: "Медовик", price: "24,00" },
    { image: bakeryImage, name: "Хлеб на закваске", price: "9,50" },
  ];

  return (
    <div className="sellers-story relative flex h-[260px] w-[146px] shrink-0 flex-col overflow-hidden rounded-xl shadow-xl">
      <div className="px-3 pb-2 pt-4">
        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] opacity-55">Меню</p>
        <p className="mt-1 text-[15px] font-semibold leading-tight">Своё Подворье</p>
      </div>
      <div className="space-y-1.5 px-3">
        {rows.map((row) => (
          <div key={row.name} className="flex items-center gap-2">
            <img
              src={row.image}
              alt=""
              width={26}
              height={26}
              loading="lazy"
              className="h-[26px] w-[26px] shrink-0 rounded-md object-cover"
            />
            <p className="min-w-0 flex-1 truncate text-[8.5px] leading-tight">{row.name}</p>
            <p className="shrink-0 text-[8.5px] font-semibold">{row.price}</p>
          </div>
        ))}
      </div>
      <p className="mt-auto px-3 pb-3 pt-2 text-[8px] leading-tight opacity-70">
        Заказать на locusfood.by
      </p>
    </div>
  );
}

export default function ForSellers() {
  useEffect(() => {
    if (document.querySelector("link[data-sellers-font]")) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap";
    link.dataset.sellersFont = "true";
    document.head.appendChild(link);
  }, []);

  return (
    <div className="for-sellers-theme min-h-screen overflow-x-clip bg-background text-foreground">
      <SEO
        title="Сайт для малого бизнеса, который понимают нейросети — Locus"
        description="Сайт за несколько минут: витрина, корзина, сторис в один клик и заказы в Telegram. Готов к AI-поиску. Бесплатный старт для мастеров Витебска."
        image="https://locusfood.by/media/for-sellers-og.jpg"
        canonical="https://locusfood.by/for-sellers"
        jsonLd={serviceJsonLd}
      />

      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className={`${sectionClass} flex h-16 items-center justify-between gap-4`}>
          <Link to="/" aria-label="Locus — на главную" className="text-2xl font-extrabold italic">
            Locus<span className="text-primary">.</span>
          </Link>
          <nav aria-label="Разделы страницы" className="hidden items-center gap-1 md:flex">
            <Button asChild variant="ghost" size="sm"><a href="#possibilities">Возможности</a></Button>
            <Button asChild variant="ghost" size="sm"><a href="#ai">ИИ-поиск</a></Button>
            <Button asChild variant="ghost" size="sm"><a href="#stories">Сторис</a></Button>
            <Button asChild variant="ghost" size="sm"><a href="#start">Как начать</a></Button>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link to="/auth">Войти</Link></Button>
            <ApplicationButton label="Создать бесплатно" className="h-10 px-4 text-xs md:px-5 md:text-sm" />
          </div>
        </div>
      </header>

      <main>
        {/* 01. Первый экран */}
        <section className="relative isolate overflow-hidden">
          <div aria-hidden="true" className="sellers-grid absolute inset-0 -z-20" />
          <div
            aria-hidden="true"
            className="absolute -top-40 right-[-10%] -z-10 h-[520px] w-[520px] rounded-full bg-primary/15 blur-[120px]"
          />
          <div className={`${sectionClass} grid items-center gap-14 pb-16 pt-12 md:pb-24 md:pt-16 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16`}>
            <div className="sellers-reveal">
              <p className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-primary/30 bg-primary/[0.07] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary md:text-[11px]">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary" />
                Новое поколение сайтов для малого бизнеса
              </p>

              <h1 className="sellers-heading text-[32px] leading-[1.07] sm:text-[44px] lg:text-[50px]">
                Сайт, который понимают нейросети.
                <span className="mt-3 block text-[19px] font-normal leading-snug text-foreground/70 sm:text-[22px] lg:text-[26px]">
                  И на котором удобно заказывать людям.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-muted-foreground md:text-base">
                Красивая витрина ваших товаров, готовая к эпохе ChatGPT и Яндекс Нейро. Создаётся за
                считанные минуты, генерирует сторис в один клик и освобождает от переписок в директе.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <ApplicationButton label="Создать сайт бесплатно" />
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-12 rounded-full border-foreground/25 bg-transparent px-5 text-sm text-foreground hover:bg-foreground/10 hover:text-foreground"
                >
                  <a href="#real-store">
                    Посмотреть в действии
                    <ArrowDownRight className="h-4 w-4" />
                  </a>
                </Button>
              </div>

              <ul className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground md:text-xs">
                {["Без программистов", "Не требует дизайна", "Бесплатный старт"].map((item, index) => (
                  <li key={item} className="flex items-center gap-3">
                    {index > 0 && <span aria-hidden="true" className="h-1 w-1 rounded-full bg-primary/60" />}
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative mx-auto w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[400px]">
              <div aria-hidden="true" className="absolute inset-0 -z-10 scale-95 rounded-full bg-primary/20 blur-[70px]" />

              <PhoneShell className="sellers-float">
                <img
                  src={exampleSiteImage}
                  alt="Страница продавца «Своё Подворье» на Locus: витрина с товарами и корзиной"
                  width={412}
                  height={751}
                  className="block w-full"
                />
              </PhoneShell>

              <div className="absolute -left-3 top-10 hidden w-[210px] rounded-2xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur sm:block lg:-left-8">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                  <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
                  Спросили у ИИ
                </p>
                <p className="mt-2 text-[11px] leading-snug text-foreground/90">
                  «Где в Витебске заказать торт ручной работы?»
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-[10px] text-primary">
                  <Check aria-hidden="true" className="h-3 w-3" />
                  Ваш сайт в ответе
                </p>
              </div>

              <div className="absolute -right-2 bottom-8 w-[222px] rounded-2xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur lg:-right-6">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                    СП
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold">Своё Подворье</p>
                    <p className="text-[10px] text-muted-foreground">Telegram · сейчас</p>
                  </div>
                  <MessageCircle aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-primary" />
                </div>
                <p className="mt-2 text-[11px] leading-snug">
                  Новый заказ · <span className="font-semibold">48,50 руб.</span>
                </p>
                <p className="text-[10px] text-muted-foreground">Брынза, медовик · самовывоз</p>
              </div>
            </div>
          </div>
        </section>

        {/* 02. Готовность к AI-поиску */}
        <section id="ai" className="scroll-mt-20 border-t border-border py-16 md:py-24">
          <div className={sectionClass}>
            <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-16">
              <div>
                <SectionLabel index="01">ИИ-поиск</SectionLabel>
                <h2 className="sellers-heading max-w-xl text-3xl md:text-4xl lg:text-[42px]">
                  Люди всё чаще ищут через нейросети.{" "}
                  <span className="text-muted-foreground">Ваш сайт готов к этому прямо сейчас.</span>
                </h2>
                <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
                  ChatGPT, Яндекс Нейро и Алиса отвечают не ссылками, а готовыми рекомендациями. Они
                  берут данные у сайтов, которые размечены для машин.
                </p>

                <ul className="mt-8 border-t border-border">
                  {aiProofPoints.map(([title, text]) => (
                    <li key={title} className="flex items-start gap-3 border-b border-border py-3.5">
                      <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <p className="text-sm font-semibold">{title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <AiSearchMock />
            </div>
          </div>
        </section>

        {/* 03. Красота без дизайнеров */}
        <section
          id="possibilities"
          className="scroll-mt-20 bg-[hsl(43_38%_94%)] py-16 text-[hsl(160_28%_10%)] md:py-24"
        >
          <div className={sectionClass}>
            <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
              <div className="order-2 lg:order-1">
                <p className="mb-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em]">
                  <span className="text-[hsl(160_30%_28%)]">02</span>
                  <span aria-hidden="true" className="h-px w-8 bg-[hsl(160_30%_28%)]/30" />
                  <span className="text-[hsl(160_12%_38%)]">Красота</span>
                </p>
                <h2 className="sellers-heading max-w-lg text-3xl md:text-4xl lg:text-[42px]">
                  Красота без дизайнеров и сложного кода
                </h2>
                <p className="mt-5 max-w-md text-[15px] leading-relaxed text-[hsl(160_12%_32%)]">
                  Шаблоны собраны так, чтобы ваш продукт выглядел дорого: крупные фото, воздух между
                  блоками, аккуратная типографика. Вам остаётся добавить товары.
                </p>

                <div className="mt-8 border-t border-[hsl(160_15%_82%)]">
                  {beautyPoints.map(([title, text]) => (
                    <div key={title} className="flex items-start gap-4 border-b border-[hsl(160_15%_82%)] py-4">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(160_30%_18%)] text-[hsl(43_38%_94%)]">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-[hsl(160_12%_38%)]">{text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="order-1 lg:order-2">
                <div className="mx-auto max-w-[360px] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_40px_80px_-40px_rgba(10,30,20,0.45)]">
                  <div className="flex items-center gap-2 border-b border-black/5 px-3 py-2.5">
                    <span aria-hidden="true" className="flex gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[hsl(4_70%_65%)]" />
                      <span className="h-2 w-2 rounded-full bg-[hsl(42_80%_62%)]" />
                      <span className="h-2 w-2 rounded-full bg-[hsl(140_45%_55%)]" />
                    </span>
                    <span className="mx-auto min-w-0 truncate rounded-full bg-black/[0.04] px-2.5 py-1 text-[9px] text-[hsl(160_12%_38%)]">
                      locusfood.by/seller/svoe-podvorye
                    </span>
                  </div>
                  <img
                    src={sellerPageScreenshot}
                    alt="Страница продавца на Locus с крупными карточками товаров"
                    width={430}
                    height={932}
                    loading="lazy"
                    className="block h-[600px] w-full object-cover object-top"
                  />
                </div>
                <p className="mt-4 text-center text-xs text-[hsl(160_12%_42%)]">
                  Реальная страница продавца — без дизайнера и вёрстки
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 04. Генератор сторис */}
        <section id="stories" className="scroll-mt-20 border-t border-border py-16 md:py-24">
          <div className={sectionClass}>
            <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16">
              <div>
                <SectionLabel index="03">Сторис</SectionLabel>
                <h2 className="sellers-heading max-w-xl text-3xl md:text-4xl lg:text-[42px]">
                  Ваш личный контент-мейкер:{" "}
                  <span className="text-muted-foreground">сторис из ваших товаров за 10 секунд</span>
                </h2>
                <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
                  Выберите шаблон и товары — Locus соберёт готовое изображение 9:16. Не нужно вечером
                  садиться за макет: «Новинка», «Меню» и «В наличии» собираются в пару кликов.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {storyStats.map(([value, text]) => (
                    <div key={value} className="rounded-xl border border-border bg-card p-4">
                      <p className="text-xl font-bold text-primary">{value}</p>
                      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{text}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <ApplicationButton label="Попробовать бесплатно" />
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Download aria-hidden="true" className="h-3.5 w-3.5" />
                    без фотошопа и шаблонов в Canva
                  </span>
                </div>
              </div>

              <div className="-mx-5 overflow-x-auto px-5 pb-2 scrollbar-hide md:mx-0 md:overflow-visible md:px-0">
                <div className="flex snap-x snap-mandatory items-center gap-4 md:justify-center md:gap-5">
                  <div className="relative h-[260px] w-[146px] shrink-0 snap-center -rotate-6 overflow-hidden rounded-xl shadow-xl">
                    <img
                      src={storyNovinkaImage}
                      alt="Шаблон сторис «Новинка» с фото товара и характеристиками"
                      width={440}
                      height={782}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <StoryMenuCard />
                  <div className="relative h-[260px] w-[146px] shrink-0 rotate-6 overflow-hidden rounded-xl shadow-xl">
                    <img
                      src={storyAvailableImage}
                      alt="Шаблон сторис «Доступно для заказа» с сеткой товаров"
                      width={440}
                      height={782}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
                <p className="mt-5 text-center text-xs text-muted-foreground">
                  «Новинка» · «Меню» · «В наличии» — три шаблона, бесконечное число изображений
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 05. Заказы без переписок */}
        <section className="border-t border-border bg-secondary/40 py-16 md:py-24">
          <div className={sectionClass}>
            <div className="grid gap-12 lg:grid-cols-[1fr_0.95fr] lg:items-center lg:gap-16">
              <div>
                <SectionLabel index="04">Заказы</SectionLabel>
                <h2 className="sellers-heading max-w-xl text-3xl md:text-4xl lg:text-[42px]">
                  Ссылка в шапке профиля —{" "}
                  <span className="text-muted-foreground">заказы прямо в Instagram</span>
                </h2>
                <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
                  Покупатель переходит по ссылке из профиля, выбирает товар и оформляет заказ сам.
                  Уведомление приходит в Telegram, на Email или SMS — отвечать на десятки одинаковых
                  вопросов о цене и наличии больше не нужно.
                </p>

                <ul className="mt-7 space-y-2.5">
                  {orderChannels.map(([channel, text]) => (
                    <li key={channel} className="flex items-start gap-3 text-sm">
                      <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>
                        <span className="font-semibold">{channel}</span>{" "}
                        <span className="text-muted-foreground">— {text}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative mx-auto w-full max-w-[330px]">
                <div className="rounded-[2rem] border border-border bg-card px-5 pb-6 pt-5 shadow-2xl sm:pb-20">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary/30 text-sm font-bold text-primary-foreground">
                      СП
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">svoe_podvorye</p>
                      <p className="text-[11px] text-muted-foreground">Своё Подворье · Витебск</p>
                    </div>
                    <Instagram aria-hidden="true" className="ml-auto h-4 w-4 text-muted-foreground" />
                  </div>

                  <p className="mt-4 text-xs leading-relaxed text-foreground/85">
                    Домашние сыры, выпечка и мёд. Заказ — по ссылке ниже, доставка по Витебску.
                  </p>

                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
                    <Store aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="truncate text-[11px] font-medium text-primary">
                      locusfood.by/seller/svoe-podvorye
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-1.5">
                    {[cheeseImage, pastryImage, bakeryImage].map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt=""
                        width={96}
                        height={96}
                        loading="lazy"
                        className="aspect-square w-full rounded-md object-cover"
                      />
                    ))}
                  </div>
                </div>

                <div className="absolute -right-4 -top-20 hidden w-[205px] rounded-xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur sm:block">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold text-primary">
                    <MessageCircle aria-hidden="true" className="h-3 w-3" />
                    Telegram
                  </p>
                  <p className="mt-1.5 text-[11px] font-medium">Новый заказ · 48,50 руб.</p>
                  <p className="text-[10px] text-muted-foreground">оплата при получении</p>
                </div>

                <div className="absolute -bottom-5 -left-3 hidden w-[210px] rounded-xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur sm:block">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
                    <Mail aria-hidden="true" className="h-3 w-3" />
                    Email · 2 мин назад
                  </p>
                  <p className="mt-1.5 text-[11px] leading-snug">
                    Покупатель оставил комментарий: «нужен к 18:00»
                  </p>
                </div>

                <div className="mt-3 grid gap-2 sm:hidden">
                  <div className="rounded-xl border border-border bg-card px-3 py-2.5">
                    <p className="flex items-center gap-1.5 text-[10px] font-semibold text-primary">
                      <MessageCircle aria-hidden="true" className="h-3 w-3" />
                      Telegram
                    </p>
                    <p className="mt-1 text-[11px] leading-snug">
                      Новый заказ · 48,50 руб. · оплата при получении
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-card px-3 py-2.5">
                    <p className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
                      <Mail aria-hidden="true" className="h-3 w-3" />
                      Email · 2 мин назад
                    </p>
                    <p className="mt-1 text-[11px] leading-snug">
                      Покупатель оставил комментарий: «нужен к 18:00»
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 06. Две витрины */}
        <section className="border-t border-border py-16 md:py-24">
          <div className={sectionClass}>
            <div className="max-w-2xl">
              <SectionLabel index="05">Две витрины</SectionLabel>
              <h2 className="sellers-heading text-3xl md:text-4xl lg:text-[42px]">
                Свой сайт — и витрина на locusfood.by
              </h2>
              <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
                Личная ссылка для соцсетей и бесплатная витрина на маркетплейсе, куда покупатели уже
                приходят за продуктами. Один кабинет — две точки продаж.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
              <article className="flex flex-col rounded-2xl border border-border bg-card p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Личный сайт</p>
                <h3 className="mt-3 text-xl font-semibold">Независимая ссылка для соцсетей</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Ваш бренд, ваши клиенты, ваша история заказов. Ссылку можно поставить в шапку
                  профиля, в сторис или отправить в чат.
                </p>
                <div className="mt-5 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs">
                  <Smartphone aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
                  <span className="truncate text-foreground/80">locusfood.by/seller/vashe-imya</span>
                </div>
                <div className="mt-4 overflow-hidden rounded-xl border border-border">
                  <img
                    src={exampleSiteImage}
                    alt="Пример личного сайта продавца"
                    width={412}
                    height={751}
                    loading="lazy"
                    className="block h-40 w-full object-cover object-top"
                  />
                </div>
              </article>

              <div aria-hidden="true" className="hidden items-center justify-center md:flex">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-lg font-light text-muted-foreground">
                  +
                </span>
              </div>

              <article className="flex flex-col rounded-2xl border border-border bg-card p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                  Маркетплейс
                </p>
                <h3 className="mt-3 text-xl font-semibold">Витрина, куда приходят покупатели</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Бесплатное размещение на locusfood.by: ваши товары видят те, кто ищет фермерские
                  продукты в Витебске.
                </p>
                <div className="mt-5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Store aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
                  locusfood.by · каталог
                </div>
                <div className="mt-4 grid grid-cols-3 gap-1.5">
                  {[cheeseImage, pastryImage, bakeryImage].map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt=""
                      width={96}
                      height={96}
                      loading="lazy"
                      className="aspect-square w-full rounded-lg object-cover"
                    />
                  ))}
                </div>
                <p className="mt-auto pt-4 text-[11px] leading-relaxed text-muted-foreground">
                  Товары, цены и наличие синхронизированы с вашим сайтом
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* 07. Инструменты роста */}
        <section className="border-t border-border bg-secondary/40 py-16 md:py-24">
          <div className={sectionClass}>
            <div className="max-w-2xl">
              <SectionLabel index="06">Инструменты роста</SectionLabel>
              <h2 className="sellers-heading text-3xl md:text-4xl lg:text-[42px]">
                Клиенты и поиск{"\u00A0"}— под контролем
              </h2>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              <article className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-2 text-primary">
                  <Users aria-hidden="true" className="h-4 w-4" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em]">База клиентов</p>
                </div>
                <h3 className="mt-3 text-xl font-semibold">История заказов и контакты</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Кто покупал, что и когда — вместо заметок в телефоне и переписок, которые невозможно
                  найти через месяц.
                </p>

                <div className="mt-5 overflow-hidden rounded-xl border border-border">
                  <div className="grid grid-cols-[1.4fr_0.7fr_0.9fr] gap-2 border-b border-border bg-background px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <span>Клиент</span>
                    <span>Заказы</span>
                    <span>Последний</span>
                  </div>
                  {[
                    ["Анна К.", "7", "сегодня"],
                    ["Игорь М.", "3", "2 дня назад"],
                    ["Ольга С.", "12", "неделю назад"],
                  ].map(([name, count, last]) => (
                    <div
                      key={name}
                      className="grid grid-cols-[1.4fr_0.7fr_0.9fr] gap-2 border-b border-border/60 px-3 py-2.5 text-xs last:border-b-0"
                    >
                      <span className="truncate font-medium">{name}</span>
                      <span className="text-muted-foreground">{count}</span>
                      <span className="text-muted-foreground">{last}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-2 text-primary">
                  <Search aria-hidden="true" className="h-4 w-4" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em]">Поиск</p>
                </div>
                <h3 className="mt-3 text-xl font-semibold">Индексация в Google и Яндексе</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Карточки товаров, микроразметка и карта сайта уже настроены. Платному SEO-специалисту
                  платить не нужно.
                </p>

                <div className="mt-5 rounded-xl border border-border bg-background p-4">
                  <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] text-muted-foreground">
                    <Search aria-hidden="true" className="h-3 w-3" />
                    сыр ручной работы витебск
                  </div>
                  <div className="mt-3">
                    <p className="text-[11px] text-muted-foreground">locusfood.by › seller › svoe-podvorye</p>
                    <p className="mt-1 text-sm font-medium text-[hsl(217_90%_62%)]">
                      Своё Подворье — домашние сыры и выпечка в Витебске
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      Брынза, качотта, медовик. Наличие и цены на сайте. Самовывоз или доставка по
                      городу.
                    </p>
                  </div>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Check aria-hidden="true" className="h-3 w-3 text-primary" />
                  Rich snippets: цена, наличие, рейтинг
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* 08. Продавцы и реальный сайт */}
        <section id="real-store" className="scroll-mt-20 bg-brand-deep py-16 md:py-24">
          <div className={`${sectionClass} grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20`}>
            <div>
              <SectionLabel index="07">Продавцы</SectionLabel>
              <h2 className="sellers-heading max-w-xl text-3xl md:text-4xl lg:text-[44px]">
                Более 40 продавцов уже сделали себе сайт
              </h2>
              <p className="mt-5 max-w-md text-[15px] leading-relaxed text-brand-deep-foreground/70">
                Кондитеры, пекари, сыровары, пасечники. У каждого — своё дело и своя ссылка, которую
                можно отправить покупателю.
              </p>

              <dl className="mt-8 grid max-w-md grid-cols-3 gap-4">
                {[
                  ["40+", "сайтов продавцов"],
                  ["1 день", "на подключение"],
                  ["0 руб.", "старт"],
                ].map(([value, text]) => (
                  <div key={text} className="border-t border-brand-deep-foreground/20 pt-3">
                    <dt className="text-2xl font-bold">{value}</dt>
                    <dd className="mt-1 text-[11px] leading-snug text-brand-deep-foreground/60">{text}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <ApplicationButton label="Хочу свой сайт" />
                <Button
                  asChild
                  variant="link"
                  className="h-auto p-0 text-brand-deep-foreground hover:text-brand-deep-foreground/80"
                >
                  <Link to="/seller/knyazhetsky">
                    Открыть «Княжеское подворье»
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <p className="mt-7 max-w-md border-l border-brand-deep-foreground/25 pl-4 text-xs leading-relaxed text-brand-deep-foreground/60">
                Поможем с фото, описаниями и первым запуском — подключение занимает один день.
              </p>
            </div>

            <figure className="mx-auto w-full max-w-[330px]">
              <PhoneShell>
                <video
                  src={sellerPageVideo}
                  poster={sellerPageScreenshot}
                  aria-label="Видео страницы продавца «Княжеское подворье» на Locus"
                  width={430}
                  height={932}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="block aspect-[430/750] w-full object-cover object-top"
                />
              </PhoneShell>
              <figcaption className="mt-4 text-center text-xs leading-relaxed text-brand-deep-foreground/60">
                Страница фермерского хозяйства «Княжеское подворье» — один из 40+ сайтов
              </figcaption>
            </figure>
          </div>
        </section>

        {/* 09. Простой запуск */}
        <section id="start" className="scroll-mt-20 py-16 md:py-24">
          <div className={sectionClass}>
            <div className="max-w-2xl">
              <SectionLabel index="08">Старт</SectionLabel>
              <h2 className="sellers-heading text-3xl md:text-4xl lg:text-[42px]">
                Три шага — и сайт работает
              </h2>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {startSteps.map(({ title, text, icon: Icon }, index) => (
                <div key={title} className="border-t border-border pt-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-primary">0{index + 1}</span>
                    <Icon aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Финальный CTA */}
        <section className="bg-primary py-14 text-primary-foreground md:py-20">
          <div className={`${sectionClass} flex flex-col items-start justify-between gap-8 md:flex-row md:items-center`}>
            <div>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] opacity-70">
                Ваше дело заслуживает своего сайта
              </p>
              <h2 className="sellers-heading text-4xl md:text-6xl">Начните с Locus.</h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed opacity-80 md:text-base">
                Бесплатный старт и подключение за день. Платные тарифы — когда захотите больше.
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="h-14 rounded-full bg-background px-8 text-base font-semibold text-foreground hover:bg-background/90"
            >
              <Link to={applicationPath}>
                Создать сайт бесплатно
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
