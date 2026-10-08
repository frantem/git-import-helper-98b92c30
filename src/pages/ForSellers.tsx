import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight, Check, ChevronRight, ClipboardList, Instagram, LayoutTemplate, ShoppingBag, Store, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import bakeryImage from "@/assets/sellers-bakery.jpg";
import cheeseImage from "@/assets/sellers-cheese.jpg";
import pastryImage from "@/assets/sellers-pastry.jpg";

const applicationPath = "/seller-application";
const sellerPageScreenshot = "/media/knyazhetsky-page.jpg";
const sellerPageVideo = "/media/knyazhetsky-page.mp4";
const sectionClass = "mx-auto w-full max-w-6xl px-5 md:px-10";

const interviewProblems = [
  { quote: "У меня занимает где-то 1 час на то что бы вечером сделать сторис в Инстаграмм", title: "Сторис — из ваших товаров", text: "Выберите товары и фон. Locus соберёт готовую картинку с фото, названием и ценой — не нужно каждый вечер начинать с пустого экрана.", icon: LayoutTemplate },
  { quote: "Я записываю заказы в телефоне", title: "Заказы — в одном кабинете", text: "Что заказали, сколько, на какое время и как связаться с покупателем — всё в карточке заказа, а не в заметках и переписках.", icon: ClipboardList },
  { quote: "Клиентов держу в контактах телефона", title: "Покупатели — не просто контакты", text: "В разделе «Клиенты» доступны покупатели и история их заказов. Возможность есть на платных тарифах.", icon: Users },
  { quote: "Ответы по наличию и ценам у меня могут на день растянуться", title: "Покупатель видит всё сам", text: "Актуальные товары, цены и условия получения — на вашей странице. Покупатель выбирает и оформляет заказ, не дожидаясь ответа в личных сообщениях.", icon: ShoppingBag },
];
const audiences = [
  { image: bakeryImage, title: "Для тех, кто печёт", text: "Хлеб, выпечка и любимые рецепты — в вашем собственном онлайн-каталоге.", alt: "Пекарь с хлебом в мастерской" },
  { image: cheeseImage, title: "Для тех, кто производит", text: "Сыры и фермерские продукты. Покажите, что есть в наличии и как получить заказ.", alt: "Сыровар с готовыми сырами" },
  { image: pastryImage, title: "Для тех, кто создаёт", text: "Торты, десерты и ручная работа. Пусть ваши товары говорят за себя.", alt: "Кондитер украшает торт" },
];
const serviceJsonLd = {
  "@context": "https://schema.org", "@type": "Service", name: "Бесплатный сайт для продавцов Locus",
  description: "Личный сайт с каталогом и корзиной для малого бизнеса Витебска.",
  provider: { "@type": "Organization", name: "Locus", url: "https://locusfood.by" },
  areaServed: { "@type": "City", name: "Витебск" },
  offers: { "@type": "Offer", price: "0", priceCurrency: "BYN", url: "https://locusfood.by/seller-application" },
};
function ApplicationButton({ label = "Создать сайт бесплатно", className = "" }: { label?: string; className?: string }) {
  return <Button asChild size="lg" className={`h-12 rounded-full px-6 text-sm font-semibold ${className}`}><Link to={applicationPath}>{label}<ArrowRight className="h-4 w-4" /></Link></Button>;
}
function StorePreview() {
  return <div className="flex h-full items-start justify-center overflow-hidden bg-secondary px-8 pt-8">
    <div className="w-full max-w-[230px] overflow-hidden rounded-t-3xl border-[5px] border-border bg-background">
      <div className="flex h-6 items-center justify-center"><span className="h-2 w-16 rounded-full bg-muted" /></div>
      <img src={sellerPageScreenshot} alt="Реальный сайт Княжеского подворья на Locus" width={430} height={932} loading="lazy" className="block w-full" />
    </div>
  </div>;
}
function StoryPreview() {
  return <div className="sellers-story flex h-full items-center justify-center gap-3 overflow-hidden px-5 py-6">
    <div className="relative h-[260px] w-[146px] shrink-0 -rotate-6 overflow-hidden rounded-lg bg-card shadow-xl">
      <img src={pastryImage} alt="Иллюстрация фото для сторис" width={1200} height={912} loading="lazy" className="h-full w-full object-cover" />
      <div className="absolute inset-x-2 bottom-3 bg-background/90 p-3 text-foreground"><p className="text-base font-semibold">Новинка:</p><p className="mt-1 text-[11px]">Ваши десерты</p></div>
    </div>
    <div className="relative h-[260px] w-[146px] shrink-0 rotate-6 overflow-hidden rounded-lg bg-brand-deep shadow-xl">
      <p className="px-4 pb-3 pt-5 text-lg font-semibold leading-tight text-brand-deep-foreground">Доступно<br />для заказа</p>
      <img src={cheeseImage} alt="Иллюстрация товаров для сторис" width={1200} height={912} loading="lazy" className="mx-3 h-[125px] w-[122px] rounded object-cover" />
      <p className="px-4 pt-3 text-sm text-brand-deep-foreground">Ваши продукты</p>
    </div>
  </div>;
}
function CabinetPreview() {
  return <div className="flex h-full flex-col justify-center bg-secondary px-6 md:px-9">
    <div className="mb-5 flex items-center justify-between border-b border-border pb-4"><span className="text-xl font-bold italic">Locus</span><Store className="h-5 w-5 text-primary" /></div>
    {[{ icon: ShoppingBag, name: "Товары", info: "Фото, цены, наличие" }, { icon: ClipboardList, name: "Заказы", info: "Состав и время получения" }, { icon: Users, name: "Клиенты", info: "История покупок" }, { icon: LayoutTemplate, name: "Сторис", info: "Готовые изображения" }].map(({ icon: Icon, name, info }) => <div key={name} className="flex items-center gap-3 border-b border-border/60 py-3"><Icon className="h-5 w-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{name}</p><p className="mt-0.5 text-xs text-muted-foreground">{info}</p></div><ChevronRight className="h-4 w-4 text-muted-foreground" /></div>)}
  </div>;
}
export default function ForSellers() {
  useEffect(() => {
    if (document.querySelector('link[data-sellers-font]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap";
    link.dataset.sellersFont = "true";
    document.head.appendChild(link);
  }, []);
  return <div className="for-sellers-theme min-h-screen overflow-x-clip bg-background text-foreground">
    <SEO title="Бесплатный сайт для малого бизнеса" description="Создайте свой сайт на Locus: каталог товаров, заказы и готовые сторис. Для фермеров, пекарей и кондитеров Витебска. Начните бесплатно." image="https://locusfood.by/media/for-sellers-og.jpg" canonical="https://locusfood.by/for-sellers" jsonLd={serviceJsonLd} />
    <section className="relative isolate flex min-h-[650px] flex-col md:min-h-[720px]">
      <img src={bakeryImage} alt="Пекарь за работой в своей мастерской" width={1920} height={1024} fetchPriority="high" className="absolute inset-0 -z-20 h-full w-full object-cover object-[65%_center] md:object-center" />
      <div className="sellers-hero-shade absolute inset-0 -z-10" />
      <header className={`${sectionClass} flex h-20 shrink-0 items-center justify-between gap-4 border-b border-foreground/15`}>
        <Link to="/" aria-label="Locus — на главную" className="text-3xl font-extrabold italic">Locus<span className="text-primary">.</span></Link>
        <nav aria-label="Навигация для продавцов" className="hidden items-center gap-2 md:flex"><Button asChild variant="ghost"><a href="#possibilities">Возможности</a></Button><Button asChild variant="ghost"><a href="#for-whom">Для кого</a></Button><Button asChild variant="ghost"><a href="#start">Как начать</a></Button></nav>
        <div className="flex items-center gap-4"><Button asChild variant="ghost" className="hidden sm:inline-flex"><Link to="/auth">Войти</Link></Button><ApplicationButton label="Начать бесплатно" className="h-10 px-4 text-xs md:px-5 md:text-sm" /></div>
      </header>
      <div className={`${sectionClass} sellers-reveal flex flex-1 flex-col justify-center pb-16 pt-14 md:pb-24`}>
        <p className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary" />Для тех, кто создаёт своими руками</p>
        <h1 className="sellers-heading max-w-[640px] text-4xl sm:text-5xl md:text-6xl lg:text-7xl">Locus.<br />Ваш бизнес.<br />Ваш собственный сайт.</h1>
        <p className="mt-6 max-w-[400px] text-base leading-relaxed text-foreground/85 md:text-lg">Вы создаёте хорошие продукты.<br />Дайте покупателям простой способ их заказать.</p>
        <div className="mt-8 flex flex-wrap items-center gap-3"><ApplicationButton /><Button asChild variant="outline" size="lg" className="h-12 rounded-full border-foreground/40 bg-transparent px-5 text-foreground hover:bg-foreground/10 hover:text-foreground"><a href="#real-store">Посмотреть пример<ArrowDown className="h-4 w-4" /></a></Button></div>
        <p className="mt-4 text-xs text-foreground/65">Заявка за 2 минуты. Подключение за 1 день.</p>
      </div>
    </section>

    <main>
      <section id="possibilities" className="scroll-mt-8 py-16 md:py-24">
        <div className={sectionClass}>
          <p className="mb-5 text-xs font-semibold uppercase text-primary">Меньше рутины. Больше своего дела.</p>
          <h2 className="sellers-heading max-w-4xl text-3xl md:text-5xl">Пеките. Создавайте. Выращивайте.<br /><span className="text-muted-foreground">А заказы пусть приходят на сайт.</span></h2>
          <div className="mt-10 grid gap-x-5 gap-y-9 md:mt-14 md:grid-cols-3">
            {[{ title: "Сайт, на котором заказывают", text: "Ваше название, товары и корзина. Одна ссылка вместо десятков ответов о цене и наличии.", visual: <StorePreview /> }, { title: "Всё важное — в одном месте", text: "Товары, заказы и время получения — в кабинете продавца. База клиентов доступна на платных тарифах.", visual: <CabinetPreview /> }, { title: "Сторис без вечера за экраном", text: "Готовые шаблоны с вашими товарами. Выберите нужное и сохраните изображение для соцсетей.", visual: <StoryPreview /> }].map(item => <article key={item.title}><div className="h-[330px] overflow-hidden rounded-lg">{item.visual}</div><h3 className="mt-5 text-lg font-semibold">{item.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p></article>)}
          </div>
        </div>
      </section>

      <section className="border-y border-border py-16 md:py-24">
        <div className={sectionClass}>
          <div className="grid gap-5 md:grid-cols-2 md:gap-16"><div><p className="mb-5 text-xs font-semibold uppercase text-primary">Из разговоров с продавцами</p><h2 className="sellers-heading text-3xl md:text-5xl">Знакомые проблемы.<br /><span className="text-muted-foreground">Уже есть решение.</span></h2></div><p className="max-w-md self-end text-base leading-relaxed text-muted-foreground">Это не отзывы о Locus — это то, что продавцы рассказывали о своей ежедневной работе. Мы сделали инструменты, чтобы эту работу упростить.</p></div>
          <div className="mt-10 grid gap-x-12 md:mt-14 md:grid-cols-2">
            {interviewProblems.map(({ quote, title, text, icon: Icon }, index) => <article key={title} className="border-t border-border py-8"><div className="mb-5 flex items-center justify-between"><span className="text-xs text-muted-foreground">0{index + 1}</span><Icon className="h-5 w-5 text-primary" /></div><blockquote className="min-h-[76px] text-lg leading-relaxed text-muted-foreground">«{quote}»</blockquote><div className="mt-6 flex items-start gap-3"><Check className="mt-1 h-5 w-5 shrink-0 text-primary" /><div><h3 className="text-xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-relaxed text-secondary-foreground">{text}</p></div></div></article>)}
          </div>
        </div>
      </section>

      <section id="real-store" className="scroll-mt-8 bg-brand-deep py-16 md:py-24">
        <div className={`${sectionClass} grid items-center gap-10 md:grid-cols-2 md:gap-20`}>
          <div><p className="mb-5 text-xs font-semibold uppercase text-primary">Не макет. Настоящий сайт.</p><h2 className="sellers-heading text-3xl md:text-5xl">Более 40 продавцов уже сделали себе сайт</h2><p className="mt-6 max-w-md text-base leading-relaxed text-brand-deep-foreground/70">Кондитеры, пекари, сыровары, пасечники. У каждого — своё дело. На Locus у каждого есть своя страница для заказов.</p><div className="mt-8"><ApplicationButton label="Хочу свой сайт" /></div><Button asChild variant="link" className="mt-4 h-auto p-0 text-brand-deep-foreground"><Link to="/seller/knyazhetsky">Открыть «Княжеское подворье»<ArrowRight /></Link></Button></div>
          <figure className="mx-auto w-full max-w-[360px]"><div className="overflow-hidden rounded-3xl border-[5px] border-border bg-card"><video src={sellerPageVideo} poster={sellerPageScreenshot} aria-label="Видео настоящего сайта Княжеское подворье на Locus" width={430} height={932} autoPlay muted loop playsInline controls preload="metadata" className="block aspect-[430/750] w-full object-cover object-top" /></div><figcaption className="mt-4 text-center text-xs leading-relaxed text-brand-deep-foreground/65">Страница фермерского хозяйства «Княжеское подворье»</figcaption></figure>
        </div>
      </section>

      <section id="for-whom" className="scroll-mt-8 py-16 md:py-24"><div className={sectionClass}><p className="mb-5 text-xs font-semibold uppercase text-primary">Сделано для малого бизнеса</p><h2 className="sellers-heading max-w-3xl text-3xl md:text-5xl">Для тех, чьё дело<br />начинается с любви к продукту.</h2><div className="mt-10 grid gap-8 md:mt-14 md:grid-cols-3">{audiences.map(({ image, title, text, alt }) => <article key={title}><img src={image} alt={alt} width={1200} height={912} loading="lazy" className="aspect-[4/3] w-full rounded-lg object-cover" /><h3 className="mt-5 text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p></article>)}</div></div></section>

      <section className="sellers-story py-16 md:py-24"><div className={`${sectionClass} grid items-center gap-10 md:grid-cols-[1.1fr_0.9fr] md:gap-20`}><div><p className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase"><Instagram className="h-4 w-4" />Ваши товары в соцсетях</p><h2 className="sellers-heading text-3xl md:text-5xl">Вечер — для себя.<br />Сторис — с Locus.</h2><p className="mt-6 max-w-md text-base leading-relaxed">«В наличии», «Новинка» или «Меню». Выберите ваши товары, добавьте фон и заголовок. Фото и цены уже на месте.</p><div className="mt-8"><ApplicationButton label="Начать бесплатно" /></div></div><div className="h-[340px] overflow-hidden md:h-[390px]"><StoryPreview /></div></div></section>

      <section id="start" className="scroll-mt-8 py-16 md:py-24"><div className={sectionClass}><p className="mb-5 text-xs font-semibold uppercase text-primary">Простой старт</p><h2 className="sellers-heading max-w-3xl text-3xl md:text-5xl">Современный сайт —<br />бесплатно и легко.</h2><div className="mt-12 grid gap-8 md:grid-cols-3">{[{ title: "Расскажите о себе", text: "Оставьте заявку. Это займёт около двух минут." }, { title: "Добавьте ваши товары", text: "Название, фото, цены и условия получения. Подключим страницу за один день." }, { title: "Дайте покупателям ссылку", text: "Добавьте её в соцсети и отправьте клиентам. Принимайте заказы в своём кабинете." }].map(({ title, text }, index) => <div key={title} className="border-t border-border pt-5"><span className="text-sm text-primary">0{index + 1}</span><h3 className="mt-6 text-xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p></div>)}</div><p className="mt-10 text-sm text-muted-foreground">Начать можно бесплатно. Дополнительные возможности — на платных тарифах.</p></div></section>

      <section className="border-t border-border bg-primary py-16 text-primary-foreground md:py-24"><div className={`${sectionClass} flex flex-col items-start justify-between gap-8 md:flex-row md:items-center`}><div><p className="mb-4 text-xs font-semibold uppercase">Ваше дело заслуживает своего сайта</p><h2 className="sellers-heading text-4xl md:text-6xl">Начните с Locus.</h2><p className="mt-4 text-base">Вы делаете продукт. Мы помогаем его заказать.</p></div><Button asChild size="lg" className="h-14 rounded-full bg-background px-8 text-base text-foreground hover:bg-background/90"><Link to={applicationPath}>Создать сайт бесплатно<ArrowRight /></Link></Button></div></section>
    </main>
    <Footer />
  </div>;
}
