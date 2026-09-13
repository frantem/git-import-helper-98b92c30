import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Clock3,
  Code2,
  Instagram,
  MessageCircleMore,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";

const applicationPath = "/seller-application";
const sellerPageScreenshot = "/media/knyazhetsky-page.jpg";
const sellerPageVideoMp4 = "/media/knyazhetsky-page.mp4";


const pains = [
  {
    icon: MessageCircleMore,
    title: "Покупатель спросил \"сколько стоит?\" — а вы ответили через час.",
    text: "Пока вы освободились, человек уже заказал у того, кто ответил быстрее.",
  },
  {
    icon: Instagram,
    title: "Каждый вечер снова садиться и придумывать, что написать в сторис.",
    text: "Фото есть, а времени и сил на красивый пост уже не остаётся.",
  },
  {
    icon: Code2,
    title: "Сайт у разработчика — от 500BYN с непонятным результатом.",
    text: "Найти дизайн, написать подобное задание для разработчика, ожидание, потом устранение ошибок и в итоге не понятно какую пользу он приносит.",
  },
];

const solutions = [
  {
    icon: Users,
    title: "Заказ как в интернет магазине",
    text: "Покупатель заказывает сам. Вам приходит уведомление.",
  },
  {
    icon: Sparkles,
    title: "Готовые сторис за 1 клик",
    text: "Собирайте красивую картинку из ваших товаров, бесплатно и скачивайте готовое изображение.",
  },
  {
    icon: Store,
    title: "Готовый сайт уже сегодня",
    text: "Без разработчиков, без кода — заполняете профиль один раз и получайте заказы.",
  },
];

const steps = [
  "Оставляете заявку (2 минуты)",
  "Подключаем вашу страницу за 1 день",
  "Начинаете получать заказы",
];

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Бесплатный сайт для продавцов Locus",
  description:
    "Бесплатный личный сайт с корзиной, доставкой и базой клиентов для фермеров, пекарей, кондитеров и сыроваров Витебска.",
  provider: {
    "@type": "Organization",
    name: "Locus",
    url: "https://locusfood.by",
  },
  areaServed: {
    "@type": "City",
    name: "Витебск",
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "BYN",
    url: "https://locusfood.by/seller-application",
  },
};

function ApplicationButton({ label, className = "" }: { label: string; className?: string }) {
  return (
    <Button asChild size="lg" className={`h-12 px-6 text-base font-bold shadow-md ${className}`}>
      <Link to={applicationPath}>
        {label}
        <ArrowRight className="h-5 w-5" />
      </Link>
    </Button>
  );
}

export default function ForSellers() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <SEO
        title="Бесплатный сайт для продавцов Витебска — Locus"
        description="Личный сайт с корзиной, доставкой и базой клиентов для фермеров, пекарей, кондитеров и сыроваров Витебска. Подключение за 1 день."
        canonical="https://locusfood.by/for-sellers"
        jsonLd={serviceJsonLd}
      />

      <header className="border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
          <Link to="/" className="font-serif text-2xl font-bold text-brand-deep" aria-label="Locus — на главную">
            Locus
          </Link>
          <Button asChild size="sm">
             <Link to={applicationPath}>Подключить</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="bg-[hsl(var(--seller-bg))]">
          <div className="container mx-auto grid min-h-[calc(100svh-4rem)] max-w-6xl items-center gap-8 px-4 py-10 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:py-16 lg:gap-16">
            <div className="relative z-10">
              <p className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-deep">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Store className="h-4 w-4" />
                </span>
                 Для тех кто создаёт своими руками
              </p>
              <h1 className="max-w-2xl font-serif text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl">
                 Хватит терять заказы!
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-secondary-foreground md:text-xl">
                  Дайте возможность Вашим покупателям заказывать как на Wildberries!
              </p>
              <div className="mt-7 flex flex-col items-start">
                 <ApplicationButton label="Подключите — бесплатно" />
                <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock3 className="h-4 w-4" />
                  Займёт 2 минуты. Подключим за 1 день.
                </p>
              </div>
            </div>

            <div className="mx-auto w-full max-w-[380px] md:max-w-[410px]">
              <div className="relative overflow-hidden rounded-[2rem] border-[6px] border-brand-deep bg-card shadow-2xl">
                <video
                  poster={sellerPageScreenshot}
                  aria-label="Реальная страница фермерского хозяйства Княжеское подворье на Locus"
                  width="430"
                  height="932"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="block h-auto w-full"
                >
                  <source src={sellerPageVideoMp4} type="video/mp4" />

                </video>
              </div>
              <p className="mt-3 text-center text-sm text-muted-foreground">
                 Реальная страница продавца
              </p>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container mx-auto max-w-6xl px-4 md:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-bold uppercase text-destructive">Знакомая ситуация?</p>
              <h2 className="mt-2 font-serif text-3xl font-bold md:text-4xl">Продажи не должны отнимать весь вечер</h2>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {pains.map(({ icon: Icon, title, text }) => (
                <article key={title} className="rounded-lg border border-border bg-card p-6 shadow-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-bold">{title}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-secondary py-16 md:py-24">
          <div className="container mx-auto max-w-6xl px-4 md:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-bold uppercase text-primary">Locus берёт это на себя</p>
              <h2 className="mt-2 font-serif text-3xl font-bold md:text-4xl">Решаем это одним сайтом</h2>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {solutions.map(({ icon: Icon, title, text }) => (
                <article key={title} className="rounded-lg border border-primary/20 bg-card p-6 shadow-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-bold">{title}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{text}</p>
                  <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-primary">
                    <Check className="h-4 w-4" /> Готово в вашем кабинете
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container mx-auto max-w-5xl px-4 text-center md:px-8">
            <h2 className="font-serif text-3xl font-bold md:text-4xl">Как это работает</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {steps.map((step, index) => (
                <div key={step} className="relative flex flex-col items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-deep text-lg font-bold text-brand-deep-foreground">
                    {index + 1}
                  </div>
                  <p className="mt-4 max-w-[240px] font-semibold leading-relaxed">{step}</p>
                  {index < steps.length - 1 && (
                    <ArrowRight className="absolute left-[calc(50%+64px)] top-4 hidden h-5 w-5 text-muted-foreground md:block" />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-10">
               <ApplicationButton label="Подключиться" />
            </div>
          </div>
        </section>

        <section className="bg-brand-deep py-16 text-brand-deep-foreground md:py-24">
          <div className="container mx-auto max-w-6xl px-4 md:px-8">
            <div className="grid items-center gap-10 md:grid-cols-[0.85fr_1.15fr] md:gap-16">
              <div>
                <div className="flex -space-x-3" aria-hidden="true">
                  {["К", "П", "С", "Ф", "+"].map((letter, index) => (
                    <span
                      key={`${letter}-${index}`}
                      className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-brand-deep bg-primary font-bold text-primary-foreground"
                    >
                      {letter}
                    </span>
                  ))}
                </div>
                <h2 className="mt-6 font-serif text-4xl font-bold leading-tight md:text-5xl">
                  Уже пользуются 30+ мастеров Витебска
                </h2>
                <p className="mt-4 max-w-md text-brand-deep-foreground/80">
                    Кондитеры, пекари, сыровары, пасечники... уже подключили свой сайт и принимают заказы.
                </p>
                <Button asChild size="lg" className="mt-7">
                   <Link to={applicationPath}>Подключить <ArrowRight className="h-5 w-5" /></Link>
                </Button>
              </div>
              <figure>
                <div className="max-h-[520px] overflow-hidden rounded-lg border border-brand-deep-foreground/20 bg-card shadow-2xl">
                  <img
                    src={sellerPageScreenshot}
                    alt="Страница фермерского хозяйства Княжеское подворье с товарами и корзиной"
                    width="430"
                    height="932"
                    loading="lazy"
                    className="h-auto w-full object-cover object-top md:-mt-12"
                  />
                </div>
                <figcaption className="mt-4 text-sm text-brand-deep-foreground/80">
                  Так теперь выглядит страница фермерского хозяйства «Княжеское подворье»
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container mx-auto max-w-5xl px-4 md:px-8">
            <div className="border-y-4 border-primary bg-[hsl(var(--seller-bg))] px-5 py-10 text-center md:px-12 md:py-14">
              <p className="text-sm font-bold uppercase text-primary">Начните без риска</p>
              <h2 className="mx-auto mt-3 max-w-3xl font-serif text-3xl font-bold leading-tight md:text-5xl">
                Базовый сайт — бесплатно навсегда
              </h2>
              <p className="mx-auto mt-5 max-w-3xl text-lg leading-relaxed text-secondary-foreground">
                 Обычно такой сайт стоит от $300 и требует недель ожидания, согласований, доработок у разработчика. У нас — бесплатно и за 1 день.
              </p>
              <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground">
                Есть платные тарифы для тех, кто хочет больше — от 15 руб/мес, но начать можно бесплатно уже сегодня.
              </p>
              <div className="mt-7">
                 <ApplicationButton label="Подключиться бесплатно" />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-primary py-16 text-center text-primary-foreground md:py-20">
          <div className="container mx-auto px-4">
            <h2 className="font-serif text-4xl font-bold md:text-5xl">Готовы попробовать?</h2>
            <p className="mx-auto mt-3 max-w-xl text-primary-foreground/90">
              Расскажите о своих товарах — остальное поможем настроить.
            </p>
            <Button asChild size="lg" variant="secondary" className="mt-7 h-12 px-7 text-base font-bold">
               <Link to={applicationPath}>Подключить бесплатно <ArrowRight className="h-5 w-5" /></Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />

    </div>
  );
}