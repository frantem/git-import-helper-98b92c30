import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Beef,
  Cake,
  Carrot,
  Check,
  Milk,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Reveal } from "@/components/motion/Reveal";
import { useRevealOnScroll } from "@/components/motion/useMotion";
import { StoryDemoPhone } from "@/components/sellers/StoryDemoPhone";

const applicationPath = "/seller-application";
const sectionClass = "mx-auto w-full max-w-6xl px-4 sm:px-5 md:px-10";

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Сайт для производителей еды на Locus",
  description:
    "Личный сайт-витрина для кондитеров, сыроваров, фермеров и кухонь: заказы без переписки, генератор сторис, база клиентов. Первый месяц бесплатно.",
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

/** Второй блок: зачем делу сайт. */
const whySite = [
  {
    title: "Покупатели не любят ждать",
    text: "Всё больше клиентов заказывают ночью или на бегу. Если ответа в переписке нет в течение 15 минут — человек часто просто уходит к другому. На сайте заказ оформляется в 2 клика.",
  },
  {
    title: "Всегда актуальные цены и наличие",
    text: "Больше не нужно перепечатывать прайс в сообщениях и объяснять: «это уже закончилось, а вот то осталось». Покупатель всегда видит только актуальное наличие.",
  },
  {
    title: "Заказы из поиска и нейросетей",
    text: "Торты, сыры и мясо всё чаще ищут в Google, Яндексе и через ИИ-поисковики. У сайта правильная разметка — ваши товары находят за пределами соцсетей.",
  },
];

/** Третий блок: чем Locus отличается от конструкторов. */
const whyLocus = [
  {
    title: "Просто, как подать объявление на Kufar",
    text: "Никаких мучений с кодом и сложными конструкторами. Вы добавляете товары и цены со смартфона за 10 минут — и сразу получаете красивый, готовый к работе сайт.",
  },
  {
    title: "Помощник, а не просто витрина",
    text: "Locus берет рутину на себя: в пару кликов собирает готовые картинки для сторис с вашими товарами и сохраняет базу покупателей с историей заказов.",
  },
  {
    title: "Никаких забот о хостинге и обновлениях",
    text: "Вам не нужно нанимать программистов или платить за серверы. Мы постоянно обновляем платформу, ускоряем загрузку и делаем так, чтобы у вас заказывали чаще.",
  },
];

/** Четвёртый блок: кому подходит. */
const audience = [
  { icon: Cake, title: "Домашние кондитеры и пекарни" },
  { icon: Milk, title: "Сыровары и крафтовые сыры" },
  { icon: Carrot, title: "Фермерские хозяйства, овощи и ягоды" },
  { icon: Beef, title: "Мясо, птица, копчения и деликатесы" },
  { icon: Sparkles, title: "Мёд, чаи и полезные сладости" },
  { icon: UtensilsCrossed, title: "Полуфабрикаты и готовая кухня" },
];

const includedItems = [
  "Личный сайт-витрина",
  "Генератор сторис",
  "Уведомления о заказах",
  "База клиентов",
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
        title="Сайт для продавцов еды: заказы без переписки — Locus"
        description="Личный сайт-витрина для кондитеров, сыроваров и фермеров: заказы в 2 клика, генератор сторис, база клиентов. Первый месяц 0 BYN, запуск за 1 день с телефона."
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
            <Button asChild variant="ghost" size="sm"><a href="#why">Зачем сайт</a></Button>
            <Button asChild variant="ghost" size="sm"><a href="#locus">Почему Locus</a></Button>
            <Button asChild variant="ghost" size="sm"><a href="#audience">Кому подходит</a></Button>
            <Button asChild variant="ghost" size="sm"><a href="#pricing">Тариф</a></Button>
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
        {/* 1. Первый экран: оффер и живое демо */}
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
                Создайте легко сайт
              </h1>

              <p className="mt-4 max-w-xl text-[14.5px] leading-relaxed text-muted-foreground md:mt-5 md:text-base">
                Клиенты больше не хотят ждать ответов в директе — они хотят зайти, выбрать и оформить
                заказ за минуту. Дайте им удобный сайт без программистов и сложных настроек.
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
                Бесплатный тест на 30 дней • Запуск за 1 день с телефона
              </p>
            </div>

            <div className="motion-reveal" data-reveal data-reveal-delay="120">
              <StoryDemoPhone />
            </div>
          </div>
        </section>

        {/* 2. Зачем делу сайт */}
        <section id="why" className="scroll-mt-16 border-t border-border py-12 md:py-20">
          <div className={sectionClass}>
            <Reveal>
              <h2 className="sellers-heading text-[26px] leading-[1.12] sm:text-[32px] md:text-[40px]">
                Зачем Вам сайт?
              </h2>
              <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-muted-foreground md:text-[15px]">
                Соцсети привлекают внимание, а сайт закрывает продажи и бережёт ваше время.
              </p>
            </Reveal>

            <div className="mt-7 grid gap-3 md:mt-10 md:grid-cols-3 md:gap-4">
              {whySite.map((item, index) => (
                <Reveal
                  key={item.title}
                  as="article"
                  delay={index * 70}
                  className="rounded-2xl border border-border bg-card p-4 md:p-6"
                >
                  <p className="text-[11px] font-semibold tracking-[0.14em] text-primary">
                    0{index + 1}
                  </p>
                  <h3 className="mt-2 text-[15.5px] font-semibold leading-snug md:text-lg">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground md:text-sm">
                    {item.text}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Почему Locus */}
        <section id="locus" className="scroll-mt-16 border-t border-border bg-secondary/40 py-12 md:py-20">
          <div className={sectionClass}>
            <Reveal>
              <h2 className="sellers-heading text-[26px] leading-[1.12] sm:text-[32px] md:text-[40px]">
                Почему именно Locus?
              </h2>
              <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-muted-foreground md:text-[15px]">
                Мы создали платформу специально для тех, кто производит и продаёт еду.
              </p>
            </Reveal>

            <div className="mt-7 grid gap-3 md:mt-10 md:grid-cols-3 md:gap-4">
              {whyLocus.map((item, index) => (
                <Reveal
                  key={item.title}
                  as="article"
                  delay={index * 70}
                  className="rounded-2xl border border-border bg-card p-4 md:p-6"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Check className="h-4 w-4" />
                  </span>
                  <h3 className="mt-3 text-[15.5px] font-semibold leading-snug md:text-lg">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground md:text-sm">
                    {item.text}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Кому подходит */}
        <section id="audience" className="scroll-mt-16 border-t border-border py-12 md:py-20">
          <div className={sectionClass}>
            <Reveal>
              <h2 className="sellers-heading text-[26px] leading-[1.12] sm:text-[32px] md:text-[40px]">
                Подходит для любого кулинарного дела
              </h2>
              <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-muted-foreground md:text-[15px]">
                От домашних мастеров до небольших производств и фермерских хозяйств.
              </p>
            </Reveal>

            <div className="mt-7 grid grid-cols-2 gap-2.5 md:mt-10 md:grid-cols-3 md:gap-3">
              {audience.map(({ icon: Icon, title }, index) => (
                <Reveal
                  key={title}
                  delay={index * 50}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 md:flex-row md:items-center md:gap-3 md:p-4"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                    <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
                  </span>
                  <p className="text-[13px] font-medium leading-snug md:text-sm">{title}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 5. Тариф и заявка */}
        <section id="pricing" className="scroll-mt-16 border-t border-border bg-secondary/40 py-12 md:py-20">
          <div className={sectionClass}>
            <Reveal>
              <h2 className="sellers-heading text-[26px] leading-[1.12] sm:text-[32px] md:text-[40px]">
                Попробуйте бесплатно
              </h2>
              <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-muted-foreground md:text-[15px]">
                Первые 30 дней — полный доступ за 0 BYN. Оцените, насколько это упростит жизнь вам и
                понравится клиентам.
              </p>
            </Reveal>

            <Reveal
              delay={80}
              className="mt-7 overflow-hidden rounded-2xl border border-border bg-card md:mt-10"
            >
              <div className="grid md:grid-cols-[0.9fr_1.1fr]">
                <div className="border-b border-border bg-primary/[0.07] p-5 md:border-b-0 md:border-r md:p-7">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                    Первый месяц
                  </p>
                  <p className="mt-2 text-[44px] font-bold leading-none md:text-[52px]">0 BYN</p>
                  <p className="mt-2 text-[13.5px] text-muted-foreground">Первый месяц бесплатно</p>

                  <ul className="mt-4 space-y-1.5 border-t border-border/60 pt-3">
                    {includedItems.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-[13px] text-foreground/85">
                        <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-5 md:p-7">
                  <div className="space-y-3">
                    <div className="flex items-baseline justify-between gap-3 border-b border-border pb-3">
                      <div>
                        <p className="text-[15px] font-semibold">9,90 BYN / мес</p>
                        <p className="mt-0.5 text-[12px] text-muted-foreground">
                          при оплате за 6 месяцев
                        </p>
                      </div>
                      <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-semibold text-primary">
                        Выгодно
                      </span>
                    </div>

                    <div className="border-b border-border pb-3">
                      <p className="text-[15px] font-semibold">14,90 BYN / мес</p>
                      <p className="mt-0.5 text-[12px] text-muted-foreground">при помесячной оплате</p>
                    </div>
                  </div>

                  <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
                    Без скрытых списаний и привязки банковской карты
                  </p>

                  <div className="mt-5">
                    <Button
                      asChild
                      size="lg"
                      className="h-12 w-full rounded-full px-6 text-[15px] font-semibold"
                    >
                      <Link to={applicationPath}>
                        Оставить заявку на сайт
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <p className="mt-2.5 text-center text-[12px] leading-snug text-muted-foreground">
                      Перезвоним, ответим на вопросы и поможем загрузить первые товары.
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
