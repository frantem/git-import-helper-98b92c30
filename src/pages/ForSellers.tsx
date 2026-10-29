import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Instagram, Menu, Plus, Send, X } from "lucide-react";
import { SEO } from "@/components/SEO";
import { SellerVideoCard } from "@/components/sellers/SellerVideoCard";
import { CardCarousel, FeatureCard, ReviewCard } from "@/components/sellers/CardCarousel";

import bakery from "@/assets/sellers-bakery.jpg";
import cheese from "@/assets/sellers-cheese.jpg";
import pastry from "@/assets/sellers-pastry.jpg";

const applicationPath = "/seller-application";

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

/* ------------------------------------------------------------------ */
/*  Мелкие примитивы                                                   */
/* ------------------------------------------------------------------ */

function Container({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`mx-auto w-full max-w-[1240px] px-5 md:px-8 lg:px-10 ${className}`}>{children}</div>;
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white px-3.5 py-1.5 text-[12px] font-medium text-[#57534C] shadow-[0_1px_2px_rgba(20,20,20,0.06)] ring-1 ring-[#E7E2D8]">
      {children}
    </span>
  );
}

function StepTape({ n }: { n: number }) {
  return (
    <div className="mb-7 inline-block -rotate-2 bg-white px-5 py-2 shadow-[0_6px_16px_rgba(20,20,20,0.10)]">
      <span className="font-['Caveat'] text-[26px] font-semibold leading-none tracking-wide text-[#141414]">
        ШАГ {n}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Мокапы интерфейса (как «доказательство» внутри шагов)              */
/* ------------------------------------------------------------------ */

function MockShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[20px] bg-[#EDEAE2] p-5 sm:p-7">
      <div className="rounded-[14px] bg-white shadow-[0_18px_40px_rgba(20,20,20,0.10)]">{children}</div>
    </div>
  );
}

function StorefrontMock() {
  const items = [
    { img: pastry, title: "Круассаны с миндалём", price: "9,90 BYN" },
    { img: bakery, title: "Хлеб на закваске", price: "7,50 BYN" },
  ];
  return (
    <MockShell>
      <div className="flex items-center justify-between border-b border-[#F0EDE6] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-[#FB4545] text-[11px] font-semibold text-white">A</span>
          <span className="text-[13px] font-semibold">Пекарня Анны</span>
        </div>
        <span className="rounded-full bg-[#FB4545] px-2.5 py-1 text-[10px] font-medium text-white">Не пропустите</span>
      </div>
      <div className="space-y-2 p-3">
        <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A857D]">Субботняя выдача</p>
        {items.map((it) => (
          <div key={it.title} className="flex items-center gap-3 rounded-[10px] border border-[#F0EDE6] p-2">
            <img src={it.img} alt="" className="h-12 w-12 rounded-[8px] object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium">{it.title}</p>
              <p className="text-[11px] text-[#8A857D]">Осталось 6</p>
            </div>
            <span className="rounded-full bg-[#F4F1EA] px-2 py-1 text-[10px] font-medium">{it.price}</span>
          </div>
        ))}
        <div className="mt-1 flex items-center justify-between rounded-[10px] bg-[#FB4545] px-3 py-2.5 text-white">
          <span className="text-[12px] font-medium">Заказать</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </MockShell>
  );
}

function DropFormMock() {
  return (
    <MockShell>
      <div className="px-4 pb-4 pt-3">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[12px] font-semibold">Новый дроп</span>
          <span className="text-[10px] text-[#8A857D]">Шаг 2 из 3</span>
        </div>
        <div className="mb-4 flex gap-4 border-b border-[#F0EDE6] text-[11px]">
          <span className="border-b-2 border-[#141414] pb-2 font-medium">Основное</span>
          <span className="pb-2 text-[#8A857D]">Меню</span>
          <span className="pb-2 text-[#8A857D]">Расписание</span>
        </div>
        <div className="space-y-2.5">
          <div className="rounded-[8px] border border-[#E9E4DA] px-3 py-2">
            <p className="text-[9px] uppercase tracking-[0.1em] text-[#9A948B]">Название</p>
            <p className="text-[12px]">Субботняя выпечка</p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-[8px] border border-[#E9E4DA] px-3 py-2">
              <p className="text-[9px] uppercase tracking-[0.1em] text-[#9A948B]">Дата выдачи</p>
              <p className="text-[12px]">14 июня</p>
            </div>
            <div className="rounded-[8px] border border-[#E9E4DA] px-3 py-2">
              <p className="text-[9px] uppercase tracking-[0.1em] text-[#9A948B]">Время</p>
              <p className="text-[12px]">10:00–12:00</p>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-[8px] border border-[#E9E4DA] px-3 py-2">
            <span className="text-[11px]">Приём заказов</span>
            <span className="rounded-full bg-[#EAF6E9] px-2 py-0.5 text-[10px] font-medium text-[#3C7A36]">Открыт</span>
          </div>
        </div>
      </div>
    </MockShell>
  );
}

function OrdersMock() {
  return (
    <MockShell>
      <div className="px-4 py-3">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[12px] font-semibold">Витрина</span>
          <span className="rounded-full bg-[#F4F1EA] px-2 py-0.5 text-[10px] text-[#6E6A63]">14 заказов</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { img: pastry, t: "Круассаны", p: "9,90" },
            { img: cheese, t: "Сыр козий", p: "14,00" },
            { img: bakery, t: "Хлеб", p: "7,50" },
            { img: pastry, t: "Тарт", p: "11,00" },
          ].map((x) => (
            <div key={x.t} className="overflow-hidden rounded-[10px] border border-[#F0EDE6]">
              <img src={x.img} alt="" className="h-16 w-full object-cover" />
              <div className="p-2">
                <p className="text-[11px] font-medium">{x.t}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[10px] text-[#8A857D]">Осталось 4</span>
                  <span className="rounded-full bg-[#F4F1EA] px-1.5 py-0.5 text-[9px]">{x.p}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2.5 rounded-[8px] bg-[#141414] px-3 py-2 text-center text-[11px] font-medium text-white">
          Открыть заказы
        </div>
      </div>
    </MockShell>
  );
}

function PrepMock() {
  return (
    <MockShell>
      <div className="px-4 py-3">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[12px] font-semibold">Список на выдачу</span>
          <span className="text-[10px] text-[#8A857D]">Сб, 14 июня</span>
        </div>
        <div className="space-y-2">
          {[
            ["Круассаны миндальные", "12 шт"],
            ["Хлеб на закваске", "8 шт"],
            ["Тарт с грушей", "5 шт"],
          ].map(([n, q], i) => (
            <div key={n} className="flex items-center gap-2.5 rounded-[8px] border border-[#F0EDE6] px-3 py-2">
              <span className={`grid h-4 w-4 place-items-center rounded-[4px] border ${i === 0 ? "border-[#FB4545] bg-[#FB4545]" : "border-[#D9D3C8]"}`}>
                {i === 0 && <span className="text-[9px] leading-none text-white">✓</span>}
              </span>
              <span className="flex-1 text-[11px]">{n}</span>
              <span className="text-[10px] text-[#8A857D]">{q}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-[8px] bg-[#F4F1EA] px-3 py-2">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-[#141414] text-[9px] text-white">И</span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium">Ирина, заказ №218</p>
            <p className="text-[9px] text-[#8A857D]">Самовывоз, 10:30</p>
          </div>
          <span className="rounded-full bg-white px-2 py-0.5 text-[9px]">Написать</span>
        </div>
      </div>
    </MockShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Данные страницы                                                    */
/* ------------------------------------------------------------------ */

type HeroSlide = {
  videoSrc?: string;
  poster?: string;
  imageSrc?: string;
  avatarSrc?: string;
  handle: string;
  subtitle: string;
  location: string;
  caption: string;
};

/** Кадры карусели первого экрана: ролик продавца и две витрины. */
const heroSlides: HeroSlide[] = [
  {
    imageSrc: bakery,
    avatarSrc: bakery,
    handle: "@anna.bakery",
    subtitle: "Витебск • Хлеб на закваске",
    location: "г. Витебск",
    caption: "Анна испекла 3000 буханок за первый год на Locus",
  },
  {
    imageSrc: pastry,
    avatarSrc: pastry,
    handle: "@tortik.vitebsk",
    subtitle: "Витебск • Домашние десерты",
    location: "г. Витебск",
    caption: "Заказы приходят сами — остаётся только печь",
  },
  {
    imageSrc: cheese,
    avatarSrc: cheese,
    handle: "@svoe_podvorie",
    subtitle: "Витебск • Домашний сыр",
    location: "г. Витебск",
    caption: "Сыр разбирают за вечер — переписка больше не нужна",
  },
];

const steps = [
  {
    title: "Покупатели видят вашу витрину",
    bullets: [
      "Свой сайт за 5 минут — просто добавьте товары",
      "Поставьте ссылку в Instagram, Telegram, Viber",
      "Расскажите покупателям, что теперь у вас есть удобный сайт для приёма заказов",
    ],
    mock: <StorefrontMock />,
  },
  {
    title: "Красивые изображения из ваших товаров",
    bullets: [
      "Просто выбирайте свои товары и скачивайте готовые изображения для контента",
      "Выкладывайте их в Instagram, Telegram, Viber",
    ],
    mock: <DropFormMock />,
  },
  {
    title: "Клиенты заказывают сами - без переписок",
    bullets: [
      "Покупатели 24/7 заходят на ваш сайт и видят наличие, цены, состав... - сразу делают заказ",
      "Контакты покупателя приходят вместе с заказом Вам",
    ],
    mock: <OrdersMock />,
  },
  {
    title: "Вы выдаёте заказы без стресса",
    bullets: [
      "Готовый список на день: что и сколько приготовить",
      "Все заказы расписаны по календарю Вы ничего не ерепутаете",
      "Чат с клиентом прямо в заказе",
    ],
    mock: <PrepMock />,
  },
];

const testimonials = [
  {
    img: bakery,
    handle: "@anna.bakery",
    followers: "1,8 тыс. подписчиков",
    city: "Витебск",
    quote: "«Раньше я собирала заказы в директе и путалась. Сейчас открываю дроп — и всё видно»",
    author: "Анна, пекарня",
  },
  {
    img: cheese,
    handle: "@syrovarnya.locus",
    followers: "940 подписчиков",
    city: "Полоцк",
    quote: "«Клиенты возвращаются сами: им приходит напоминание, когда я открываю заказы»",
    author: "Дмитрий, сыроварня",
  },
  {
    img: pastry,
    handle: "@tortik.vitebsk",
    followers: "3,1 тыс. подписчиков",
    city: "Витебск",
    quote: "«Мне не нужно быть онлайн весь день. Заказы копятся, я пеку по списку»",
    author: "Марина, кондитер",
  },
  {
    img: bakery,
    handle: "@hleb.nadvinna",
    followers: "760 подписчиков",
    city: "Новополоцк",
    quote: "«Первый месяц бесплатно — я просто попробовала. Теперь это мой основной канал»",
    author: "Сергей, пекарь",
  },
];

const features = [
  {
    title: "Свой сайт для приёма заказов",
    text: "Отдельный сайт с вашим именем, меню и историей.",
    mock: <StorefrontMock />,
  },
  {
    title: "Отзывы и лояльность",
    text: "Клиенты оценивают заказ, а вы видите, кто возвращается.",
    mock: <OrdersMock />,
  },
  {
    title: "Создание фото",
    text: "Сколько порций готовы сделать — столько и продастся.",
    mock: <DropFormMock />,
  },
  {
    title: "Своя база клиентов",
    text: "Клиент получает сообщение до открытия заказов.",
    mock: <PrepMock />,
  },
];

const faq = [
  {
    q: "Что такое «сайт»?",
    a: "Это онлайн витрина которая показывает  Вашим покупателям 24/7 актуальное наличием, цены, состав или возможность сделать предзаказ Ваших товаров, пока Вы работает или отдыхаете.",
  },
  {
    q: "Что значит «база клиентов»?",
    a: "Ваш сайт собирает с каждого заказа Имя, дату заказа, телефон, почту покупателя и хранит это в базе что бы Вы могли посмотреть Всех своих постоянных покупателей и оповестить пропавших.",
  },
  {
    q: "Нужна ли большая аудитория?",
    a: "Нет. Первые заказы обычно приходят от 50–100 подписчиков. Ссылку можно поставить в Instagram, Telegram и на визитке.",
  },
  {
    q: "Сколько это стоит?",
    a: "Первый месяц бесплатно. Дальше 9,90 BYN в месяц при оплате за 6 месяцев или 14,90 BYN помесячно. Без привязки карты на старте.",
  },
  {
    q: "Это лучше, чем Google Forms или переписка?",
    a: "Да: заказы не теряются, клиент видит актуальные остатки, а вы получаете готовый список на выдачу и базу покупателей.",
  },
  {
    q: "Можно ли продолжать вести Instagram?",
    a: "Конечно. Locus не заменяет соцсети — он принимает заказы и хранит клиентов, а контент вы публикуете как раньше.",
  },
];

/* ------------------------------------------------------------------ */
/*  Страница                                                           */
/* ------------------------------------------------------------------ */

export default function ForSellers() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [heroSlide, setHeroSlide] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const id = "hp-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Instrument+Sans:wght@400;500;600&family=Caveat:wght@600&display=swap";
    document.head.appendChild(link);
  }, []);

  return (
    <div className="hp-page for-sellers-theme min-h-screen overflow-x-clip">
      <SEO
        title="Свой сайт для продажи еды — Locus"
        description="Личный сайт-витрина для кондитеров, сыроваров и фермеров: заказы без переписки, напоминания клиентам и база покупателей. Первый месяц бесплатно."
        image="https://locusfood.by/media/for-sellers-og.jpg"
        canonical="https://locusfood.by/for-sellers"
        jsonLd={serviceJsonLd}
      />

      {/* ---------------------------- Шапка ---------------------------- */}
      <header className="sticky top-0 z-40 bg-[#FCFBF9]/90 backdrop-blur-md">
        <Container className="flex h-[64px] items-center justify-between gap-4 md:h-[76px]">
          <Link
            to="/"
            aria-label="Locus — на главную"
            className="font-['Fraunces'] text-[24px] leading-none tracking-[-0.03em] text-[#1A1A1A]"
          >
            Locus<span className="text-[#E5453D]">.</span>
          </Link>

          <nav aria-label="Разделы страницы" className="hidden items-center gap-8 text-[14px] text-[#3D3A35] lg:flex">
            <a href="#how" className="transition-colors hover:text-[#E5453D]">Как это работает</a>
            <a href="#reviews" className="transition-colors hover:text-[#E5453D]">Отзывы</a>
            <a href="#included" className="transition-colors hover:text-[#E5453D]">Что входит</a>
            <a href="#faq" className="transition-colors hover:text-[#E5453D]">Вопросы</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/auth"
              className="inline-flex rounded-full bg-[#E9E7E1] px-4 py-2 text-[13px] font-medium text-[#1A1A1A] transition-colors hover:bg-[#DEDBD3] sm:px-5 sm:py-2.5 sm:text-[13.5px]"
            >
              Войти
            </Link>
            <Link
              to={applicationPath}
              className="hidden items-center rounded-full bg-[#E5453D] px-5 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#D43830] sm:inline-flex"
            >
              Начать продавать
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
              aria-expanded={menuOpen}
              className="-mr-2 rounded-full p-2 text-[#1A1A1A] transition-colors hover:bg-[#EFEBE3] lg:hidden"
            >
              {menuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
            </button>
          </div>
        </Container>

        {menuOpen && (
          <Container className="pb-4 lg:hidden">
            <nav aria-label="Разделы страницы" className="flex flex-col overflow-hidden rounded-2xl border border-[#E7E2D8] bg-white/80 p-1">
              {[
                { href: "#how", label: "Как это работает" },
                { href: "#reviews", label: "Отзывы" },
                { href: "#included", label: "Что входит" },
                { href: "#faq", label: "Вопросы" },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-[14px] font-medium text-[#1A1A1A] transition-colors hover:bg-[#ECE7DE]"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </Container>
        )}
      </header>

      <main>
        {/* ---------------------------- Hero ---------------------------- */}
        <section className="bg-[#FCFBF9] text-[#1A1A1A]">
          <Container className="grid gap-7 pb-12 pt-5 sm:gap-10 sm:pb-14 sm:pt-8 md:pt-12 lg:grid-cols-[1fr_412px] lg:items-center lg:gap-20 lg:pb-24 lg:pt-14">
            <div className="max-w-[660px]">
              <div className="hidden sm:block">
                <Pill>№1 платформа для домашней еды</Pill>
              </div>

              <h1 className="font-['Fraunces'] text-[33px] leading-[1.04] tracking-[-0.03em] sm:mt-6 sm:text-[52px] sm:leading-[1.02] lg:text-[64px]">
                Свой сайт и приём заказов — прямо с телефона
              </h1>

              <p className="mt-3.5 max-w-[520px] text-[15.5px] leading-[1.45] text-[#6E6A63] sm:mt-5 sm:text-[19px] sm:leading-[1.5]">
                Принимает заказы круглосуточно, собирает ваших клиентов, даёт покупателям удобную витрину для заказа, помогает вести контент
              </p>

              <div className="mt-5 sm:mt-7 md:mt-9">
                <Link
                  to={applicationPath}
                  className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#E5453D] px-7 text-[14.5px] font-semibold text-white shadow-sm transition-colors hover:bg-[#D43830] sm:h-11 sm:w-auto sm:text-[15px]"
                >
                  Начать продавать
                </Link>
              </div>
            </div>

            <div className="w-full">
              <SellerVideoCard {...heroSlides[heroSlide]} />

              <div className="mt-5 flex items-center justify-center gap-4">
                <button
                  type="button"
                  aria-label="Предыдущий слайд"
                  onClick={() => setHeroSlide((i) => (i - 1 + heroSlides.length) % heroSlides.length)}
                  className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#E5453D] ring-1 ring-[#E7E2D8] transition-colors hover:bg-[#E5453D] hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </button>

                <div className="flex items-center gap-1.5">
                  {heroSlides.map((slide, i) => (
                    <button
                      key={slide.handle}
                      type="button"
                      aria-label={`Слайд ${i + 1}`}
                      aria-current={i === heroSlide}
                      onClick={() => setHeroSlide(i)}
                      className={`h-[3px] rounded-full transition-all ${i === heroSlide ? "w-8 bg-[#E5453D]" : "w-8 bg-[#DCD6C9] hover:bg-[#C9C2B2]"}`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  aria-label="Следующий слайд"
                  onClick={() => setHeroSlide((i) => (i + 1) % heroSlides.length)}
                  className="grid h-9 w-9 place-items-center rounded-full bg-[#E5453D] text-white transition-colors hover:bg-[#D43830]"
                >
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </Container>
        </section>

        {/* ------------------------- Как это работает ------------------------- */}
        <section id="how" className="scroll-mt-[70px] pb-20 pt-16 lg:pb-28 lg:pt-20">
          <Container>
            <div className="text-center">
              <Pill>Опыт</Pill>
              <h2 className="mx-auto mt-6 max-w-[820px] font-['Fraunces'] text-[34px] leading-[1.06] tracking-[-0.02em] sm:text-[44px] lg:text-[56px]">
                Как работает Locus
              </h2>
            </div>

            <div className="mt-16 space-y-20 lg:mt-24 lg:space-y-28">
              {steps.map((s, i) => (
                <div
                  key={s.title}
                  className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-16 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}
                >
                  <div>
                    <StepTape n={i + 1} />
                    <h3 className="font-['Fraunces'] text-[28px] leading-[1.12] tracking-[-0.02em] sm:text-[34px] lg:text-[40px]">
                      {s.title}
                    </h3>
                    <ul className="mt-6 space-y-3">
                      {s.bullets.map((b) => (
                        <li key={b} className="flex gap-3 text-[15px] leading-[1.5] text-[#4A463F]">
                          <span className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-[#FB4545]" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>{s.mock}</div>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* ---------------------------- Отзывы ---------------------------- */}
        <section id="reviews" className="scroll-mt-[70px] bg-[#FCFBF9] py-14 lg:py-20">
          <Container>
            <CardCarousel pill="Ежемесячно более 100 заказов через сайт" title="Уже более 40 поваров и пекарей ">
              {testimonials.map((t) => (
                <ReviewCard
                  key={t.handle}
                  img={t.img}
                  handle={t.handle}
                  followers={t.followers}
                  city={t.city}
                  quote={t.quote}
                  author={t.author}
                />
              ))}
            </CardCarousel>
          </Container>
        </section>

        {/* --------------------------- Что входит --------------------------- */}
        <section id="included" className="scroll-mt-[70px] bg-[#EFEDE7] py-14 lg:py-20">
          <Container>
            <CardCarousel pill="Платформа" title="Что входит в Locus?">
              {features.map((f) => (
                <FeatureCard key={f.title} title={f.title}>
                  {f.mock}
                </FeatureCard>
              ))}
            </CardCarousel>
          </Container>
        </section>

        {/* ------------------------------ FAQ ------------------------------ */}
        <section id="faq" className="scroll-mt-[70px] py-16 lg:py-24">
          <Container className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            <div>
              <h2 className="font-['Fraunces'] text-[34px] leading-[1.06] tracking-[-0.02em] sm:text-[42px] lg:text-[48px]">
                Частые вопросы
              </h2>
              <p className="mt-4 max-w-[300px] text-[14px] leading-[1.5] text-[#6E6A63]">
                Собрали то, что чаще всего спрашивают перед созданием.
              </p>
              <Link
                to={applicationPath}
                className="mt-6 inline-flex h-11 items-center rounded-full bg-[#FB4545] px-6 text-[13px] font-medium text-white transition hover:bg-[#E83C3C]"
              >
                Написать команде Locus
              </Link>
            </div>

            <div className="space-y-3">
              {faq.map((item, i) => {
                const open = openFaq === i;
                return (
                  <div
                    key={item.q}
                    className={`overflow-hidden rounded-[14px] bg-white ring-1 ring-[#EDE9E0] transition-shadow ${open ? "shadow-[0_8px_28px_rgba(20,20,20,0.07)]" : "shadow-[0_2px_10px_rgba(20,20,20,0.04)]"}`}
                  >
                    <button
                      onClick={() => setOpenFaq(open ? null : i)}
                      aria-expanded={open}
                      className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                    >
                      <span className="text-[15px] font-medium leading-snug">{item.q}</span>
                      <Plus className={`h-4 w-4 shrink-0 text-[#141414] transition-transform ${open ? "rotate-45" : ""}`} />
                    </button>
                    {open && (
                      <p className="px-6 pb-5 text-[14px] leading-[1.55] text-[#6E6A63]">{item.a}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </Container>
        </section>
      </main>

      {/* ---------------------------- Футер ---------------------------- */}
      <footer className="bg-[#FB4545] text-white">
        <Container className="pb-8 pt-16 lg:pt-24">
          <div className="flex items-start justify-between gap-8">
            <p className="max-w-[820px] font-['Fraunces'] text-[32px] leading-[1.1] tracking-[-0.02em] sm:text-[44px] lg:text-[56px]">
              Всё, чтобы начать продавать еду — без переписок и таблиц.
            </p>
            <div className="hidden items-center gap-4 pt-2 sm:flex">
              <a href="https://instagram.com" aria-label="Instagram" className="text-white/90 transition hover:text-white">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="https://t.me" aria-label="Telegram" className="text-white/90 transition hover:text-white">
                <Send className="h-5 w-5" />
              </a>
            </div>
          </div>

          <Link
            to={applicationPath}
            className="mt-8 inline-flex h-12 items-center rounded-full bg-white px-6 text-[13.5px] font-medium text-[#141414] transition hover:bg-[#F6F3EC]"
          >
            Создать сайт сегодня
          </Link>

          <div className="mt-16 flex flex-col gap-4 border-t border-white/25 pt-6 text-[12.5px] text-white/85 sm:flex-row sm:items-center sm:justify-between">
            <p>© Locus, 2026 · ИП Котович О. А., УНП 391863210</p>
            <nav className="flex flex-wrap gap-5">
              <Link to="/oferta" className="hover:text-white">Оферта</Link>
              <Link to="/privacy" className="hover:text-white">Политика</Link>
              <Link to="/delivery" className="hover:text-white">Доставка</Link>
            </nav>
          </div>
        </Container>
      </footer>
    </div>
  );
}
