import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Clock3, ShieldCheck, Store, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Reveal } from "@/components/motion/Reveal";
import { useRevealOnScroll } from "@/components/motion/useMotion";
import { StoryDemoPhone } from "@/components/sellers/StoryDemoPhone";
import bakeryImage from "@/assets/sellers-bakery.jpg";
import cheeseImage from "@/assets/sellers-cheese.jpg";
import pastryImage from "@/assets/sellers-pastry.jpg";

const applicationPath = "/seller-application";
const sellerPageScreenshot = "/media/knyazhetsky-page.jpg";
const sellerPageVideo = "/media/knyazhetsky-page.mp4";
const sectionClass = "mx-auto w-full max-w-6xl px-5 md:px-10";

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Сайт для мастеров на Locus",
  description:
    "Сайт для кондитеров, сыроваров, пекарей и ремесленников: генератор сторис, кабинет заказов и база клиентов. Бесплатный первый месяц.",
  provider: { "@type": "Organization", name: "Locus", url: "https://locusfood.by" },
  areaServed: { "@type": "City", name: "Витебск" },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "BYN",
    url: "https://locusfood.by/seller-application",
    description: "Первый месяц бесплатно, далее от 9,90 BYN в месяц",
  },
};

const routineItems = [
  {
    title: "Сторис без мучений",
    before: "1,5 часа перед сном в Canva или фоторедакторах.",
    after:
      "Выбрали товары — сайт за 10 секунд собрал макет 9:16 с фото и ценами. Нажали «Скачать» — и сторис в блоге.",
  },
  {
    title: "Чистый директ",
    before: "Бесконечные «а сколько стоит?», «а что в наличии?», потерянные сообщения.",
    after:
      "Покупатель видит актуальное наличие, составы и оформляет заказ по ссылке в шапке профиля.",
  },
  {
    title: "Ни один заказ не потеряется",
    before: "Блокнот, заметки в телефоне,\u00a0 что-то в памяти.",
    after: "Чёткий кабинет: кто заказал, когда заберёт, куда доставить, какой телефон, имя покупателя, как связаться.",
  },
  {
    title: "Клиенты всегда с вами",
    before: "Контакты разбросаны по разным соцсетям и телефонной книге.",
    after: "Автоматическая база: имена, телефоны, история покупок и любимые товары.",
  },
];

const benefitItems = [
  { title: "Личный сайт", text: "Прямая ссылка для шапки Instagram, Telegram и постоянных покупателей." },
  {
    title: "Новые клиенты из каталога",
    text: "Ваши товары попадают на маркетплейс Locusfood.",
  },
  {
    title: "Никаких забот об IT",
    text: "Сайт быстрый, оптимизирован под телефоны и обновляется без вашего участия.",
  },
];

const startSteps = [
  { title: "Заполните короткую заявку", text: "30 секунд", icon: Clock3 },
  { title: "Загрузите свои товары", text: "Название, фото и цены — с телефона", icon: Store },
  { title: "Принимайте заказы", text: "Поставьте ссылку в блог и получайте заказы в кабинете", icon: Zap },
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

export default function ForSellers() {
  useRevealOnScroll();

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
        title="Сайт для мастеров, который берёт рутину на себя — Locus"
        description="Сайт для кондитеров, сыроваров и пекарей: сторис за 10 секунд, кабинет заказов и база клиентов. Первый месяц бесплатно, запуск за день."
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
            <Button asChild variant="ghost" size="sm"><a href="#routine">Было и стало</a></Button>
            <Button asChild variant="ghost" size="sm"><a href="#benefit">Выгода</a></Button>
            <Button asChild variant="ghost" size="sm"><a href="#pricing">Тарифы</a></Button>
            <Button asChild variant="ghost" size="sm"><a href="#start">Как начать</a></Button>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link to="/auth">Войти</Link></Button>
            <ApplicationButton label="Создать бесплатно" className="h-10 px-4 text-xs md:px-5 md:text-sm" />
          </div>
        </div>
      </header>

      <main>
        {/* 1. Hero с интерактивным демо */}
        <section className="relative isolate overflow-hidden">
          <div aria-hidden="true" className="sellers-grid absolute inset-0 -z-20" />
          <div
            aria-hidden="true"
            className="absolute -top-40 right-[-10%] -z-10 h-[520px] w-[520px] rounded-full bg-primary/15 blur-[120px]"
          />
          <div className={`${sectionClass} grid gap-12 pb-16 pt-12 md:pb-24 md:pt-16 lg:grid-cols-[1.06fr_0.94fr] lg:items-center lg:gap-14`}>
            <div className="sellers-reveal">
              <p className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-primary/30 bg-primary/[0.07] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary md:text-[11px]">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary" />
                ДЛЯ КОНДИТЕРОВ, СЫРОВАРОВ, ПЕКАРНЕЙ...
              </p>

              <h1 className="sellers-heading text-[34px] leading-[1.06] sm:text-5xl lg:text-[54px]">
                Сайт, который берёт рутину на себя
              </h1>

              <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-muted-foreground md:text-base">
                Создаёт контент, наводит порядок в заказах и автоматически собирает базу Ваших постоянных клиентов.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <ApplicationButton label="Попробовать бесплатно" />
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
                </span>
              </div>

              <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
                Запуск за 1 день с телефона
              </p>
            </div>

            <div className="motion-reveal" data-reveal data-reveal-delay="120">
              <StoryDemoPhone />
            </div>
          </div>
        </section>

        {/* 2. Раньше vs с Locus */}
        <section id="routine" className="scroll-mt-20 border-t border-border py-16 md:py-24">
          <div className={sectionClass}>
            <div className="max-w-2xl">
              <SectionLabel index="">Было и стало</SectionLabel>
              <h2 className="sellers-heading text-3xl md:text-4xl lg:text-[42px]">
                4 задачи которые уже решает locus
              </h2>
              <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
                {"\n"}
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 md:gap-5">
              {routineItems.map((item, index) => (
                <Reveal
                  key={item.title}
                  as="article"
                  delay={index * 70}
                  className="rounded-2xl border border-border bg-card p-5 md:p-6"
                >
                  <p className="text-[11px] font-semibold text-primary">{"\n"}</p>
                  <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
                  <div className="mt-4 border-t border-border pt-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/60">
                      Было
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.before}</p>
                  </div>
                  <div className="mt-4 border-t border-border pt-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                      С Locus
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-foreground/90">{item.after}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Двойная выгода */}
        <section id="benefit" className="scroll-mt-20 border-t border-border bg-secondary/40 py-16 md:py-24">
          <div className={sectionClass}>
            <div className="grid gap-12 lg:grid-cols-[1fr_0.92fr] lg:items-center lg:gap-16">
              <div>
                <SectionLabel index="">Двойная выгода</SectionLabel>
                <h2 className="sellers-heading max-w-xl text-3xl md:text-4xl lg:text-[42px]">
                  Свой сайт и Ваши товары на Locusfood
                </h2>
                <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
                  Один раз создать свои товары — а получить две точки продаж: сайт и маркетплейс, куда покупатели приходят сами.
                </p>

                <div className="mt-8 border-t border-border">
                  {benefitItems.map((item) => (
                    <div key={item.title} className="flex items-start gap-4 border-b border-border py-4">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="motion-reveal" data-reveal data-reveal-delay="100">
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <span className="text-sm font-bold italic">
                      Locus<span className="text-primary">.</span>
                    </span>
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] text-muted-foreground">
                      Каталог · Витебск
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 p-3">
                    {[cheeseImage, pastryImage, bakeryImage].map((image, index) => (
                      <div key={index} className="overflow-hidden rounded-lg">
                        <img
                          src={image}
                          alt=""
                          width={120}
                          height={120}
                          loading="lazy"
                          className="aspect-square w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2 px-3 pb-3">
                    {[
                      ["Сыр Белпер Кнолле", "8,50 BYN"],
                      ["Качотта с пажитником", "16,00 BYN"],
                    ].map(([name, price]) => (
                      <div
                        key={name}
                        className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-xs"
                      >
                        <span className="truncate">{name}</span>
                        <span className="shrink-0 font-semibold">{price}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="mt-4 text-center text-xs text-muted-foreground">
                  {"\n"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Социальное доказательство */}
        <section id="sellers" className="scroll-mt-20 bg-brand-deep py-16 md:py-24">
          <div className={`${sectionClass} grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20`}>
            <div>
              <SectionLabel index="03">Продавцы</SectionLabel>
              <h2 className="sellers-heading max-w-xl text-3xl md:text-4xl lg:text-[44px]">
                Более 40 продавцов уже открыли свои сайты
              </h2>
              <p className="mt-5 max-w-md text-[15px] leading-relaxed text-brand-deep-foreground/70">
                Кондитеры, фермеры, сыровары, пекарни и ремесленники. У каждого — своя ссылка,
                которую можно отправить покупателю.
              </p>

              <ul className="mt-7 flex flex-wrap gap-x-3 gap-y-2 text-[11px] font-medium uppercase tracking-[0.12em] text-brand-deep-foreground/55">
                {["Кондитеры", "Фермеры", "Сыровары", "Пекарни", "Ремесленники"].map((tag, index) => (
                  <li key={tag} className="flex items-center gap-3">
                    {index > 0 && <span aria-hidden="true" className="h-1 w-1 rounded-full bg-primary/60" />}
                    {tag}
                  </li>
                ))}
              </ul>

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
            </div>

            <figure className="motion-reveal mx-auto w-full max-w-[330px]" data-reveal data-reveal-delay="100">
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
                Страница фермерского хозяйства «Княжеское подворье»
              </figcaption>
            </figure>
          </div>
        </section>

        {/* 5. Прозрачные условия */}
        <section id="pricing" className="scroll-mt-20 py-16 md:py-24">
          <div className={sectionClass}>
            <div className="max-w-2xl">
              <SectionLabel index="04">Условия</SectionLabel>
              <h2 className="sellers-heading text-3xl md:text-4xl lg:text-[42px]">
                Попробуйте бесплатно
              </h2>
            </div>

            <Reveal delay={80} className="mt-10 overflow-hidden rounded-3xl border border-border bg-card">
              <div className="grid md:grid-cols-[0.85fr_1.15fr]">
                <div className="border-b border-border bg-primary/[0.07] p-7 md:border-b-0 md:border-r md:p-9">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                    {"\n"}
                  </p>
                  <p className="mt-4 text-5xl font-bold leading-none md:text-6xl">0 BYN</p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    Первый месяц — бесплатно
                  </p>
                  <ul className="mt-6 space-y-2 border-t border-border/60 pt-4">
                    {["Сайт и витрина", "Сторис-генератор", "Кабинет заказов", "База клиентов"].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-xs text-foreground/80">
                        <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-7 md:p-9">
                  <div className="space-y-3">
                    <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
                      <div>
                        <p className="text-sm font-semibold">9,90 BYN / мес</p>
                        <p className="text-xs text-muted-foreground">при оплате на 6 месяцев</p>
                      </div>
                      <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-semibold text-primary">
                        выгоднее
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
                      <div>
                        <p className="text-sm font-semibold">14,90 BYN / мес</p>
                        <p className="text-xs text-muted-foreground">оплата помесячно</p>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                    Без привязки карты
                  </p>

                  <div className="mt-6">
                    <ApplicationButton label="Создать сайт бесплатно" />
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* 6. Старт за три шага */}
        <section id="start" className="scroll-mt-20 border-t border-border bg-secondary/40 py-16 md:py-24">
          <div className={sectionClass}>
            <div className="max-w-2xl">
              <SectionLabel index="05">Старт</SectionLabel>
              <h2 className="sellers-heading text-3xl md:text-4xl lg:text-[42px]">
                Три простых шага
              </h2>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {startSteps.map(({ title, text, icon: Icon }, index) => (
                <Reveal key={title} delay={index * 80} className="border-t border-border pt-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-primary">0{index + 1}</span>
                    <Icon aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 7. Финальный CTA */}
        <section className="bg-primary py-14 text-primary-foreground md:py-20">
          <div className={`${sectionClass} flex flex-col items-start justify-between gap-8 md:flex-row md:items-center`}>
            <div>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] opacity-70">
                Locus
              </p>
              <h2 className="sellers-heading max-w-xl text-4xl md:text-5xl">
                Занимайтесь любимым делом. Рутину оставьте locus.
              </h2>
            </div>
            <Button
              asChild
              size="lg"
              className="h-14 shrink-0 rounded-full bg-background px-8 text-base font-semibold text-foreground hover:bg-background/90"
            >
              <Link to={applicationPath}>
                Создать свой сайт бесплатно
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
