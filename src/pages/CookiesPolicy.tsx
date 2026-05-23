import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BottomNavigation } from "@/components/BottomNavigation";
import { PageHeader } from "@/components/PageHeader";
import { SEO } from "@/components/SEO";

export default function CookiesPolicy() {
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <SEO
        title="Политика cookies | Locus"
        description="Как маркетплейс LOCUS (locusfood.by) использует cookies, localStorage и сторонние сервисы аналитики."
        canonical="https://locusfood.by/cookies"
      />
      <Header />
      <main className="container mx-auto px-3 py-4 max-w-3xl">
        <PageHeader title="Политика использования cookies" backPath="/profile" />

        <div className="rounded-2xl bg-card p-4 md:p-6 shadow-sm space-y-6 text-sm text-foreground leading-relaxed">
          <p className="text-xs text-muted-foreground">Дата публикации: 15 мая 2026 г.</p>

          <p className="italic text-muted-foreground">
            Мы используем технологии отслеживания, чтобы сайт работал корректно, а мы могли улучшать сервис. Эта страница объясняет что именно и зачем.
          </p>

          <section className="space-y-2">
            <h2 className="text-base font-bold">1. Что такое cookies и локальное хранилище</h2>
            <p>Cookies — это небольшие текстовые файлы, которые сайт сохраняет в вашем браузере. Они помогают сайту «запомнить» вас при следующем посещении.</p>
            <p>Сайт locusfood.by не использует традиционные cookie-файлы. Вместо них мы используем localStorage браузера — это технически другой механизм, но с аналогичным назначением: хранить данные на вашем устройстве между сессиями.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold">2. Что мы храним в вашем браузере</h2>
            <p>В localStorage вашего браузера сохраняются следующие данные:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Содержимое корзины (locus-cart) — чтобы товары не исчезали при закрытии вкладки</li>
              <li>Анонимный идентификатор посетителя (visitor_id) — случайный код без привязки к личности, нужен для аналитики посещаемости</li>
              <li>Токены авторизованной сессии — чтобы вы оставались в системе после входа</li>
            </ul>
            <p>Эти данные хранятся только у вас в браузере. Вы можете удалить их в любой момент через настройки браузера → «Очистить данные сайтов».</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold">3. Сторонние сервисы отслеживания</h2>

            <h3 className="font-semibold mt-3">3.1. Meta Pixel (Facebook Pixel)</h3>
            <p><strong>Что это:</strong> инструмент рекламной аналитики компании Meta (Facebook/Instagram).</p>
            <p><strong>Зачем:</strong> мы используем рекламу в Instagram и Facebook. Meta Pixel помогает нам понять какие объявления привели к заказам, чтобы не тратить рекламный бюджет впустую.</p>
            <p><strong>Что собирает:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>IP-адрес вашего устройства</li>
              <li>данные о браузере и устройстве</li>
              <li>страницы которые вы просматривали</li>
              <li>факт оформления заказа и его сумму</li>
            </ul>
            <p><strong>Управление:</strong> вы можете отказаться от персонализированной рекламы Meta в настройках вашего аккаунта Facebook/Instagram → «Настройки рекламы».</p>
            <p>Политика конфиденциальности Meta: <a href="https://facebook.com/privacy/policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">facebook.com/privacy/policy</a></p>

            <h3 className="font-semibold mt-3">3.2. Meta Conversions API</h3>
            <p><strong>Что это:</strong> серверный аналог Meta Pixel — события передаются напрямую с нашего сервера в Meta, минуя браузер.</p>
            <p><strong>Зачем:</strong> повышает точность измерения рекламы (некоторые браузеры блокируют Pixel).</p>
            <p><strong>Что передаётся:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>хэш вашего email-адреса (SHA-256 — необратимое шифрование, сам email не передаётся)</li>
              <li>IP-адрес</li>
              <li>данные о браузере (User-Agent)</li>
              <li>сумма и факт покупки</li>
            </ul>

            <h3 className="font-semibold mt-3">3.3. Яндекс.Метрика</h3>
            <p><strong>Что это:</strong> сервис веб-аналитики от Яндекса.</p>
            <p><strong>Зачем:</strong> мы видим сколько людей посещает сайт, какие страницы популярны, откуда приходят посетители. Это помогает улучшать сайт.</p>
            <p><strong>Что собирает:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>обезличенные данные о поведении на сайте (какие страницы смотрели, как долго)</li>
              <li>источник перехода на сайт</li>
              <li>тип устройства и браузера</li>
            </ul>
            <p>Данные передаются в анонимизированном виде и не позволяют идентифицировать вас лично.</p>
            <p><strong>Управление:</strong> <a href="https://metrica.yandex.ru/about" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">metrica.yandex.ru/about</a> — инструкция по отказу от отслеживания.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold">4. Как отказаться от отслеживания</h2>
            <p>Вы можете ограничить сбор данных следующими способами:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Очистить localStorage: настройки браузера → Конфиденциальность → Очистить данные сайтов</li>
              <li>Установить расширение для браузера: uBlock Origin, Privacy Badger или AdBlock — они блокируют пиксели отслеживания</li>
              <li>Включить «Не отслеживать» (Do Not Track) в настройках браузера</li>
              <li>Отказаться от персонализированной рекламы Meta: <a href="https://facebook.com/ads/preferences" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">facebook.com/ads/preferences</a></li>
              <li>Отказаться от Яндекс.Метрики: <a href="https://metrica.yandex.ru/about" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">metrica.yandex.ru/about</a> (раздел «Отказ от отслеживания»)</li>
            </ul>
            <p>Обратите внимание: отказ от отслеживания не влияет на работу сайта и оформление заказов.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold">5. Изменения в Политике</h2>
            <p>При существенных изменениях в использовании cookies мы обновим эту страницу и уведомим вас через сайт.</p>
            <p>Актуальная версия всегда доступна по адресу: <a href="https://locusfood.by/cookies" className="text-primary hover:underline">locusfood.by/cookies</a></p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold">6. Контакты</h2>
            <p>Если у вас есть вопросы по использованию cookies и данных отслеживания:</p>
            <p><strong>E-mail:</strong> <a href="mailto:support@locusfood.by" className="text-primary hover:underline">support@locusfood.by</a></p>
            <p>Срок ответа — не более 15 календарных дней.</p>
          </section>

          <p className="text-xs text-muted-foreground pt-4 border-t border-border">
            Котович Артём Владимирович, самозанятый, УНП CE6154534 • locusfood.by
          </p>
        </div>
      </main>
      <Footer />
      <BottomNavigation />
    </div>
  );
}
