import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Instagram, Plus, Send } from "lucide-react";
import { SEO } from "@/components/SEO";

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

function SectionTitle({ pill, children }: { pill: string; children: ReactNode }) {
  return (
    <div>
      <Pill>{pill}</Pill>
      <h2 className="mt-6 max-w-[900px] font-['Fraunces'] text-[34px] leading-[1.06] tracking-[-0.02em] sm:text-[44px] lg:text-[56px]">
        {children}
      </h2>
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

const heroSlides = [
  {
    img: bakery,
    handle: "@anna.bakery",
    followers: "2.4k подписчиков",
    city: "Витебск",
    quote: "«Анна испекла больше 3000 буханок за первый год на Locus»",
    author: "Анна К., пекарня на закваске",
    pos: "68% 50%",
  },
  {
    img: cheese,
    handle: "@syrovarnya.locus",
    followers: "1.1k подписчиков",
    city: "Полоцк",
    quote: "«Сыр разбирают за вечер, переписка больше не нужна»",
    author: "Дмитрий П., сыроварня",
    pos: "50% 50%",
  },
  {
    img: pastry,
    handle: "@tortik.vitebsk",
    followers: "3.8k подписчиков",
    city: "Витебск",
    quote: "«Заказы приходят сами, я только пеку и выдаю»",
    author: "Марина С., кондитер",
    pos: "50% 50%",
  },
];

const steps = [
  {
    title: "Покупатели подписываются на вашу витрину",
    bullets: [
      "Создайте свой сайт за 5 минут — без программистов",
      "Поставьте ссылку в Instagram и Telegram",
      "Попросите клиентов оставить номер телефона",
    ],
    mock: <StorefrontMock />,
  },
  {
    title: "Вы открываете «дроп» — меню на неделю",
    bullets: [
      "Задайте окна выдачи: день и время",
      "Соберите меню и укажите, сколько порций готовы сделать",
    ],
    mock: <DropFormMock />,
  },
  {
    title: "Заказы открываются — клиенты получают сообщение сами",
    bullets: [
      "Напоминание уходит подписчикам автоматически",
      "Оплата и контакты приходят вместе с заказом",
    ],
    mock: <OrdersMock />,
  },
  {
    title: "Вы выдаёте заказы без стресса",
    bullets: [
      "Готовый список на день: что и сколько приготовить",
      "Наклейки и чеки для каждой сумки",
      "Чат с клиентом прямо в заказе",
    ],
    mock: <PrepMock />,
  },
];

const testimonials = [
  {
    img: bakery,
    handle: "@anna.bakery",
    city: "Витебск",
    quote: "«Раньше я собирала заказы в директе и путалась. Сейчас открываю дроп — и всё видно»",
    author: "Анна, пекарня",
  },
  {
    img: cheese,
    handle: "@syrovarnya.locus",
    city: "Полоцк",
    quote: "«Клиенты возвращаются сами: им приходит напоминание, когда я открываю заказы»",
    author: "Дмитрий, сыроварня",
  },
  {
    img: pastry,
    handle: "@tortik.vitebsk",
    city: "Витебск",
    quote: "«Мне не нужно быть онлайн весь день. Заказы копятся, я пеку по списку»",
    author: "Марина, кондитер",
  },
  {
    img: bakery,
    handle: "@hleb.nadvinna",
    city: "Новополоцк",
    quote: "«Первый месяц бесплатно — я просто попробовала. Теперь это мой основной канал»",
    author: "Сергей, пекарь",
  },
];

const features = [
  {
    title: "Своя витрина",
    text: "Отдельный сайт с вашим именем, меню и историей.",
    mock: <StorefrontMock />,
  },
  {
    title: "Отзывы и лояльность",
    text: "Клиенты оценивают заказ, а вы видите, кто возвращается.",
    mock: <OrdersMock />,
  },
  {
    title: "Остатки и лимиты",
    text: "Сколько порций готовы сделать — столько и продастся.",
    mock: <DropFormMock />,
  },
  {
    title: "Автонапоминания",
    text: "Клиент получает сообщение до открытия заказов.",
    mock: <PrepMock />,
  },
];

const faq = [
  {
    q: "Что такое «дроп»?",
    a: "Это меню на конкретную дату: что готовите, сколько порций и когда можно забрать. Открыли приём заказов — клиенты получили сообщение.",
  },
  {
    q: "Что значит «предзаказ»?",
    a: "Клиент оплачивает или бронирует товар заранее, а забирает в назначенное окно. Так вы готовите ровно столько, сколько нужно.",
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
  const [slide, setSlide] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const testimonialsRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % heroSlides.length), 7000);
    return () => clearInterval(t);
  }, []);

  const active = heroSlides[slide];

  const scrollTestimonials = (dir: number) => {
    testimonialsRef.current?.scrollBy({ left: dir * 360, behavior: "smooth" });
  };

  return (
    <div className="hp-page min-h-screen overflow-x-clip">
      <SEO
        title="Свой сайт для продажи еды — Locus"
        description="Личный сайт-витрина для кондитеров, сыроваров и фермеров: заказы без переписки, напоминания клиентам и база покупателей. Первый месяц бесплатно."
        image="https://locusfood.by/media/for-sellers-og.jpg"
        canonical="https://locusfood.by/for-sellers"
        jsonLd={serviceJsonLd}
      />

      {/* ---------------------------- Шапка ---------------------------- */}
      <header className="sticky top-0 z-40 border-b border-[#E7E2D8] bg-[#F6F3EC]/85 backdrop-blur-md">
        <Container className="flex h-[64px] items-center justify-between gap-4 md:h-[70px]">
          <Link to="/" aria-label="Locus — на главную" className="font-['Fraunces'] text-[24px] leading-none tracking-[-0.03em]">
            Locus<span className="text-[#FB4545]">.</span>
          </Link>

          <nav aria-label="Разделы страницы" className="hidden items-center gap-7 text-[14px] text-[#3D3A35] md:flex">
            <a href="#how" className="hover:text-[#FB4545]">Как это работает</a>
            <a href="#reviews" className="hover:text-[#FB4545]">Отзывы</a>
            <a href="#included" className="hover:text-[#FB4545]">Что входит</a>
            <a href="#faq" className="hover:text-[#FB4545]">Вопросы</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/auth"
              className="hidden rounded-full bg-[#E9E7E1] px-5 py-2.5 text-[12.5px] font-medium text-[#141414] transition hover:bg-[#DEDBD3] sm:inline-flex"
            >
              Войти
            </Link>
            <Link
              to={applicationPath}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#FB4545] px-5 py-2.5 text-[12.5px] font-medium text-white transition hover:bg-[#E83C3C]"
            >
              Создать сайт
            </Link>
          </div>
        </Container>
      </header>

      <main>
        {/* ---------------------------- Hero ---------------------------- */}
        <section className="relative">
          <Container className="grid items-center gap-10 pb-14 pt-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:pb-24 lg:pt-16">
            <div>
              <Pill>Платформа для домашней еды</Pill>
              <h1 className="mt-6 font-['Fraunces'] text-[40px] leading-[1.02] tracking-[-0.025em] sm:text-[54px] lg:text-[68px]">
                Продавайте еду с телефона, а не в переписке
              </h1>
              <p className="mt-5 max-w-[520px] text-[16px] leading-[1.55] text-[#6E6A63] sm:text-[17px]">
                Locus — личный сайт вашей кухни, пекарни или фермы. Покупатели сами выбирают
                товары и оформляют заказ, а вы получаете его с контактами и адресом.
              </p>
              <Link
                to={applicationPath}
                className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-[#FB4545] px-7 text-[15px] font-medium text-white transition hover:bg-[#E83C3C]"
              >
                Создать свой сайт
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-4 text-[12.5px] leading-snug text-[#8A857D]">
                1 месяц бесплатно · Без привязки карты · Настройка за пару минут
              </p>
            </div>

            {/* Карточка-карусель */}
            <div className="w-full">
              <div className="relative mx-auto aspect-[4/5] w-full max-w-[520px] overflow-hidden rounded-[26px] bg-[#141414]">
                <img
                  src={active.img}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ objectPosition: active.pos }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/80" />

                <div className="absolute inset-x-0 top-0 flex items-start justify-between p-5">
                  <div className="flex items-center gap-2.5">
                    <img src={active.img} alt="" className="h-9 w-9 rounded-full border border-white/60 object-cover" />
                    <div className="text-white">
                      <p className="text-[13px] font-medium leading-tight">{active.handle}</p>
                      <p className="text-[11px] text-white/75">{active.followers}</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-white/40 bg-black/25 px-3 py-1 text-[11px] text-white backdrop-blur-sm">
                    {active.city}
                  </span>
                </div>

                <div className="absolute inset-x-0 bottom-0 p-6">
                  <p className="font-['Fraunces'] text-[21px] leading-[1.25] text-white sm:text-[23px]">
                    {active.quote}
                  </p>
                  <p className="mt-3 text-[12px] text-white/75">{active.author}</p>
                </div>
              </div>

              <div className="mx-auto mt-5 flex max-w-[520px] items-center justify-between">
                <div className="flex items-center gap-2">
                  {heroSlides.map((_, i) => (
                    <button
                      key={i}
                      aria-label={`Слайд ${i + 1}`}
                      onClick={() => setSlide(i)}
                      className={`h-[3px] rounded-full transition-all ${i === slide ? "w-10 bg-[#FB4545]" : "w-10 bg-[#D8D2C6]"}`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    aria-label="Предыдущий"
                    onClick={() => setSlide((s) => (s - 1 + heroSlides.length) % heroSlides.length)}
                    className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#FB4545] shadow-[0_1px_4px_rgba(20,20,20,0.10)] ring-1 ring-[#E7E2D8] transition hover:bg-[#FB4545] hover:text-white"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <button
                    aria-label="Следующий"
                    onClick={() => setSlide((s) => (s + 1) % heroSlides.length)}
                    className="grid h-9 w-9 place-items-center rounded-full bg-[#FB4545] text-white shadow-[0_1px_4px_rgba(20,20,20,0.10)] transition hover:bg-[#E83C3C]"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
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
        <section id="reviews" className="scroll-mt-[70px] pb-16 lg:pb-24">
          <Container>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <SectionTitle pill="К нам приходят за результатом">
                Нам доверяют тысячи домашних кухонь
              </SectionTitle>
              <div className="flex items-center gap-2 pb-2">
                <button
                  aria-label="Назад"
                  onClick={() => scrollTestimonials(-1)}
                  className="grid h-9 w-9 place-items-center rounded-full bg-[#FBE3E1] text-[#FB4545] transition hover:bg-[#FB4545] hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  aria-label="Вперёд"
                  onClick={() => scrollTestimonials(1)}
                  className="grid h-9 w-9 place-items-center rounded-full bg-[#FB4545] text-white transition hover:bg-[#E83C3C]"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div
              ref={testimonialsRef}
              className="-mx-5 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 [scrollbar-width:none] md:-mx-8 md:px-8 lg:-mx-10 lg:px-10 [&::-webkit-scrollbar]:hidden"
            >
              {testimonials.map((t) => (
                <article
                  key={t.handle}
                  className="relative aspect-[340/470] w-[300px] shrink-0 snap-start overflow-hidden rounded-[12px] bg-[#141414] sm:w-[340px]"
                >
                  <img src={t.img} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/5 to-black/85" />
                  <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
                    <div className="flex items-center gap-2">
                      <img src={t.img} alt="" className="h-8 w-8 rounded-full border border-white/60 object-cover" />
                      <span className="text-[12px] font-medium text-white">{t.handle}</span>
                    </div>
                    <span className="rounded-full bg-black/25 px-2.5 py-1 text-[10px] text-white backdrop-blur-sm">
                      {t.city}
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="text-[16px] leading-[1.35] text-white">{t.quote}</p>
                    <p className="mt-2 text-[11.5px] text-white/70">— {t.author}</p>
                  </div>
                </article>
              ))}
            </div>
          </Container>
        </section>

        {/* --------------------------- Что входит --------------------------- */}
        <section id="included" className="scroll-mt-[70px] bg-[#EFEDE7] py-16 lg:py-24">
          <Container>
            <SectionTitle pill="Платформа">Что входит в Locus?</SectionTitle>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <article key={f.title} className="overflow-hidden rounded-[14px] bg-white shadow-[0_1px_0_rgba(20,20,20,0.04)] ring-1 ring-[#E7E2D8]">
                  <div className="relative h-[280px] overflow-hidden bg-[#EDEAE2]">
                    <div className="absolute left-4 top-4 w-[420px] origin-top-left scale-[0.68]">{f.mock}</div>
                  </div>
                  <div className="border-t border-[#F0EDE6] p-5">
                    <h3 className="font-['Fraunces'] text-[24px] leading-[1.1] tracking-[-0.01em]">{f.title}</h3>
                    <p className="mt-2 text-[13.5px] leading-[1.45] text-[#6E6A63]">{f.text}</p>
                  </div>
                </article>
              ))}
            </div>
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
                Собрали то, что чаще всего спрашивают перед первым дропом.
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
