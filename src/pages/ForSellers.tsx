import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Beef,
  Cake,
  Carrot,
  Check,
  ClipboardList,
  Image as ImageIcon,
  LayoutDashboard,
  Milk,
  Smartphone,
  Sparkles,
  Store,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Reveal } from "@/components/motion/Reveal";
import { useRevealOnScroll } from "@/components/motion/useMotion";
import { StoryDemoPhone } from "@/components/sellers/StoryDemoPhone";
import { FaqAccordion } from "@/components/sellers/FaqAccordion";

const applicationPath = "/seller-application";
const sectionClass = "mx-auto w-full max-w-6xl px-4 sm:px-5 md:px-10";

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Сайт для производителей еды на Locus",
  description:
    "Личный сайт-витрина для кондитеров, сыроваров, фермеров и домашних кухонь: заказы без переписки, генератор сторис, база клиентов. Первый месяц бесплатно.",
  provider: { "@type": "Organization", name: "Locus", url: "https://locusfood.by" },
  areaServed: { "@type": "City", name: "Витебск" },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "BYN",
    url: "https://locusfood.by/seller-application",
    description:
      "Первый месяц 0 BYN, далее 9,90 BYN при оплате за 6 месяцев или 14,90 BYN помесячно",
  },
};

/** Блок 2: ниши. */
const niches = [
  { icon: Cake, label: "Кондитеры и пекари" },
  { icon: Milk, label: "Сыровары" },
  { icon: Carrot, label: "Фермеры" },
  { icon: Beef, label: "Мясо и копчения" },
  { icon: Sparkles, label: "Мёд и чаи" },
  { icon: UtensilsCrossed, label: "Домашняя кулинария" },
];

/** Блок 3: до / после. */
const beforeList = [
  "Прайс перепечатывается в каждом чате заново",
  "«А что осталось?» — по десять раз в день",
  "Заказы в блокнотах, заметках и переписке",
  "Адрес и телефон теряются среди сообщений",
];

const afterList = [
  "Одна ссылка с актуальным наличием и ценами",
  "Покупатель оформляет заказ сам, без ожидания ответа",
  "Контакты, дата и адрес — в карточке заказа",
  "История покупок и база клиентов под рукой",
];

/** Блок 4: как это работает. */
const steps = [
  {
    icon: Smartphone,
    title: "Добавьте товары с телефона",
    text: "Название, фото и цена — за пару минут, без компьютера.",
  },
  {
    icon: Store,
    title: "Поставьте ссылку в соцсети",
    text: "Instagram, Viber, Telegram или Kufar — одна ссылка на ваш сайт.",
  },
  {
    icon: ClipboardList,
    title: "Покупатель заказывает сам",
    text: "Выбирает товар, количество и способ получения без переписки.",
  },
  {
    icon: Check,
    title: "Заказ приходит в кабинет",
    text: "С контактами, датой и адресом — остаётся только собрать.",
  },
];

/** Блок 5: возможности платформы. */
const features = [
  {
    icon: Store,
    title: "Простая витрина",
    text: "Удобный каталог с быстрым выбором с телефона.",
  },
  {
    icon: LayoutDashboard,
    title: "Личный кабинет",
    text: "Статусы заказов, даты выдачи и телефоны клиентов.",
  },
  {
    icon: Users,
    title: "База покупателей",
    text: "История заказов и контакты постоянных клиентов.",
  },
  {
    icon: ImageIcon,
    title: "Генератор сторис",
    text: "Готовые картинки товаров для соцсетей в пару кликов.",
  },
];

/** Блок 7: FAQ. */
const faq = [
  {
    question: "Кому подходит сервис?",
    answer:
      "Самозанятым, ремесленникам, личным подсобным хозяйствам, ИП и небольшим производствам — всем, кто делает еду и продаёт её напрямую.",
  },
  {
    question: "Нужен ли компьютер для работы?",
    answer:
      "Нет. Товары, цены, фото и заказы ведутся с телефона — сайт настраивается за пару минут прямо из браузера.",
  },
  {
    question: "Нужно ли сразу привязывать банковскую карту?",
    answer:
      "Нет. Первый месяц бесплатный и без карты: сначала пробуете, потом решаете, нужен ли платный тариф.",
  },
  {
    question: "Как я буду получать деньги за заказы?",
    answer:
      "Покупатель платит вам напрямую — при получении или переводом. Locus не держит деньги и не берёт комиссию с заказов.",
  },
  {
    question: "Что будет после окончания бесплатного месяца?",
    answer:
      "Ничего не списывается само: вы решаете — продолжить на платном тарифе или поставить сайт на паузу. Товары и заказы сохраняются.",
  },
];

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
        title="Свой сайт для продажи еды — Locus"
        description="Личный сайт-витрина для кондитеров, сыроваров и фермеров: заказы без переписки, генератор сторис и база клиентов. Первый месяц бесплатно, настройка с телефона."
        image="https://locusfood.by/media/for-sellers-og.jpg"
        canonical="https://locusfood.by/for-sellers"
        jsonLd={serviceJsonLd}
      />

      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className={`${sectionClass} flex h-14 items-center justify-between gap-3 md:h-16`}>
          <Link to="/" aria-label="Locus — на главную" className="text-[22px] font-extrabold italic md:text-2xl">
            Locus<span className="text-primary">.</span>
          </Link>

          <nav aria-label="Разделы страницы" className="hidden items-center gap-1 md:flex">
            <Button asChild variant="ghost" size="sm"><a href="#compare">До и после</a></Button>
            <Button asChild variant="ghost" size="sm"><a href="#how">Как работает</a></Button>
            <Button asChild variant="ghost" size="sm"><a href="#pricing">Тариф</a></Button>
            <Button asChild variant="ghost" size="sm"><a href="#faq">Вопросы</a></Button>
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/auth">Войти</Link>
            </Button>
            <Button asChild size="sm" className="h-9 rounded-full px-4 text-xs font-semibold">
              <Link to={applicationPath}>
                Создать сайт
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Блок 1. Hero */}
        <section className="relative isolate overflow-hidden">
          <div aria-hidden="true" className="sellers-grid absolute inset-0 -z-20" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 right-[-14%] -z-10 h-[420px] w-[420px] rounded-full bg-primary/15 blur-[120px]"
          />

          <div
            className={`${sectionClass} grid gap-8 pb-12 pt-8 md:gap-12 md:pb-20 md:pt-14 lg:grid-cols-[1.04fr_0.96fr] lg:items-center lg:gap-14`}
          >
            <div className="motion-reveal" data-reveal>
              <h1 className="sellers-heading text-[29px] leading-[1.08] sm:text-[38px] lg:text-[50px]">
                Продавайте еду с телефона, а не в переписке
              </h1>

              <p className="mt-4 max-w-xl text-[14.5px] leading-relaxed text-muted-foreground md:mt-5 md:text-base">
                Locus — личный сайт вашей кухни, пекарни или фермы. Покупатели сами выбирают товары
                и оформляют заказ, а вы получаете его с контактами и адресом.
              </p>

              <div className="mt-6 md:mt-8">
                <Button
                  asChild
                  size="lg"
                  className="h-12 w-full rounded-full px-6 text-[15px] font-semibold sm:w-auto"
                >
                  <Link to={applicationPath}>
                    Создать свой сайт
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <p className="mt-3 text-[12px] leading-snug text-muted-foreground md:text-[12.5px]">
                1 месяц бесплатно • Без привязки карты • Настройка за пару минут
              </p>
            </div>

            <div className="motion-reveal" data-reveal data-reveal-delay="120">
              <StoryDemoPhone />
            </div>
          </div>
        </section>

        {/* Блок 2. Ниши */}
        <section id="audience" className="scroll-mt-16 border-t border-border py-10 md:py-16">
          <div className={sectionClass}>
            <Reveal>
              <h2 className="sellers-heading text-[24px] leading-[1.14] sm:text-[30px] md:text-[38px]">
                Сделано для локальных мастеров
              </h2>
              <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted-foreground md:text-[15px]">
                Решение создано специально для производителей еды и небольших хозяйств.
              </p>
            </Reveal>

            <div className="mt-6 flex flex-wrap gap-2 md:mt-8 md:gap-2.5">
              {niches.map(({ icon: Icon, label }, index) => (
                <Reveal
                  key={label}
                  delay={index * 40}
                  className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2"
                >
                  <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-[13px] font-medium md:text-[13.5px]">{label}</span>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Блок 3. До / после */}
        <section id="compare" className="scroll-mt-16 border-t border-border bg-secondary/40 py-12 md:py-20">
          <div className={sectionClass}>
            <Reveal>
              <h2 className="sellers-heading text-[26px] leading-[1.12] sm:text-[32px] md:text-[40px]">
                Как обычно — и как с Locus
              </h2>
              <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted-foreground md:text-[15px]">
                Одна и та же работа — принимать заказы. Разница в спокойствии и в клиентах, которые не ушли.
              </p>
            </Reveal>

            <div className="mt-7 grid gap-3 md:mt-10 md:grid-cols-2 md:gap-4">
              <Reveal className="rounded-2xl border border-border bg-card p-4 md:p-6">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-destructive">
                  <X aria-hidden="true" className="h-4 w-4" />
                  Как обычно в мессенджерах
                </p>
                <ul className="mt-3 space-y-2">
                  {beforeList.map((item) => (
                    <li key={item} className="flex gap-2 text-[13.5px] leading-relaxed text-muted-foreground">
                      <span aria-hidden="true" className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-destructive/60" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Reveal>

              <Reveal delay={80} className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4 md:p-6">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-primary">
                  <Check aria-hidden="true" className="h-4 w-4" />
                  С Locus
                </p>
                <ul className="mt-3 space-y-2">
                  {afterList.map((item) => (
                    <li key={item} className="flex gap-2 text-[13.5px] leading-relaxed text-foreground/85">
                      <Check aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Блок 4. Как это работает */}
        <section id="how" className="scroll-mt-16 border-t border-border py-12 md:py-20">
          <div className={sectionClass}>
            <Reveal>
              <h2 className="sellers-heading text-[26px] leading-[1.12] sm:text-[32px] md:text-[40px]">
                Как это работает
              </h2>
              <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted-foreground md:text-[15px]">
                Четыре шага от первого товара до готового заказа.
              </p>
            </Reveal>

            <div className="mt-7 md:mt-10">
              <div className="grid gap-4 md:grid-cols-4 md:gap-4">
                {steps.map(({ icon: Icon, title, text }, index) => (
                  <Reveal key={title} delay={index * 60} className="relative">
                    <div className="relative flex items-start gap-3 md:block">
                      {index < steps.length - 1 && (
                        <span
                          aria-hidden="true"
                          className="absolute left-[44px] top-[22px] hidden h-px w-[calc(100%-6px)] bg-border md:block"
                        />
                      )}
                      <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-primary">
                        <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
                      </span>
                      <div className="min-w-0 md:mt-3">
                        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Шаг {index + 1}
                        </p>
                        <h3 className="mt-1 text-[14.5px] font-semibold leading-snug md:text-[15.5px]">
                          {title}
                        </h3>
                        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{text}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Блок 5. Возможности */}
        <section id="features" className="scroll-mt-16 border-t border-border bg-secondary/40 py-12 md:py-20">
          <div className={sectionClass}>
            <Reveal>
              <h2 className="sellers-heading text-[26px] leading-[1.12] sm:text-[32px] md:text-[40px]">
                Что внутри
              </h2>
              <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted-foreground md:text-[15px]">
                Всё для продаж — без программистов и лишних сервисов.
              </p>
            </Reveal>

            <div className="mt-7 grid gap-3 sm:grid-cols-2 md:mt-10 md:gap-4">
              {features.map(({ icon: Icon, title, text }, index) => (
                <Reveal
                  key={title}
                  as="article"
                  delay={index * 60}
                  className="rounded-2xl border border-border bg-card p-4 md:p-5"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
                  </span>
                  <h3 className="mt-3 text-[15px] font-semibold leading-snug md:text-base">{title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{text}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Блок 6. Тарифы */}
        <section id="pricing" className="scroll-mt-16 border-t border-border py-12 md:py-20">
          <div className={sectionClass}>
            <Reveal>
              <h2 className="sellers-heading text-[26px] leading-[1.12] sm:text-[32px] md:text-[40px]">
                Прозрачный тариф
              </h2>
              <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted-foreground md:text-[15px]">
                Начните бесплатно — платите, только если решите остаться.
              </p>
            </Reveal>

            <Reveal delay={80} className="mt-7 overflow-hidden rounded-2xl border border-border bg-card md:mt-10">
              <div className="grid md:grid-cols-[0.9fr_1.1fr]">
                <div className="border-b border-border bg-primary/[0.07] p-5 md:border-b-0 md:border-r md:p-7">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                    Первый месяц
                  </p>
                  <p className="mt-2 text-[44px] font-bold leading-none md:text-[52px]">0 BYN</p>
                  <p className="mt-2 text-[13.5px] text-muted-foreground">Полный доступ, без карты</p>

                  <ul className="mt-4 space-y-1.5 border-t border-border/60 pt-3">
                    {["Личный сайт-витрина", "Генератор сторис", "Кабинет заказов", "База клиентов"].map(
                      (item) => (
                        <li key={item} className="flex items-center gap-2 text-[13px] text-foreground/85">
                          <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                          {item}
                        </li>
                      ),
                    )}
                  </ul>
                </div>

                <div className="p-5 md:p-7">
                  <div className="flex items-baseline justify-between gap-3 border-b border-border pb-3">
                    <div>
                      <p className="text-[15px] font-semibold">9,90 BYN / мес</p>
                      <p className="mt-0.5 text-[12px] text-muted-foreground">при оплате за 6 месяцев</p>
                    </div>
                    <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-semibold text-primary">
                      Выгодно
                    </span>
                  </div>

                  <div className="border-b border-border py-3">
                    <p className="text-[15px] font-semibold">14,90 BYN / мес</p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">при помесячной оплате</p>
                  </div>

                  <p className="mt-3 flex items-center gap-2 text-[13.5px] font-semibold text-foreground">
                    <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
                    0% комиссии с ваших заказов
                  </p>

                  <div className="mt-4">
                    <Button
                      asChild
                      size="lg"
                      className="h-12 w-full rounded-full px-6 text-[15px] font-semibold"
                    >
                      <Link to={applicationPath}>
                        Создать свой сайт
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <p className="mt-2.5 text-center text-[12px] leading-snug text-muted-foreground">
                      Без скрытых списаний и привязки карты
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Блок 7. FAQ */}
        <section id="faq" className="scroll-mt-16 border-t border-border bg-secondary/40 py-12 md:py-20">
          <div className={sectionClass}>
            <Reveal>
              <h2 className="sellers-heading text-[26px] leading-[1.12] sm:text-[32px] md:text-[40px]">
                Частые вопросы
              </h2>
            </Reveal>

            <Reveal delay={60} className="mt-6 md:mt-8">
              <FaqAccordion items={faq} />
            </Reveal>
          </div>
        </section>

        {/* Блок 8. Финальный CTA */}
        <section className="border-t border-border py-12 md:py-20">
          <div className={`${sectionClass} text-center`}>
            <Reveal>
              <h2 className="sellers-heading mx-auto max-w-2xl text-[27px] leading-[1.1] sm:text-[34px] md:text-[44px]">
                Начните продавать с сайта уже сегодня
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-muted-foreground md:text-[15px]">
                Первый месяц бесплатно: загрузите товары, поставьте ссылку в профиль и принимайте
                заказы без переписок.
              </p>

              <div className="mt-6 flex justify-center md:mt-8">
                <Button
                  asChild
                  size="lg"
                  className="h-12 w-full rounded-full px-6 text-[15px] font-semibold sm:w-auto sm:px-8"
                >
                  <Link to={applicationPath}>
                    Создать свой сайт
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <p className="mt-3 text-[12px] text-muted-foreground">
                1 месяц бесплатно • Без привязки карты • Настройка за пару минут
              </p>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
