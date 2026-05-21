import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BottomNavigation } from "@/components/BottomNavigation";
import { PageHeader } from "@/components/PageHeader";
import { SEO } from "@/components/SEO";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <SEO title="Политика конфиденциальности | Locus" description="Политика конфиденциальности маркетплейса LOCUS (locusfood.by) — порядок обработки и защиты персональных данных." canonical="https://locusfood.by/privacy-policy" />
      <Header />
      <main className="container mx-auto px-3 py-4 max-w-3xl">
        <PageHeader title="Политика конфиденциальности" backPath="/profile" />

        <div className="rounded-2xl bg-card p-4 md:p-6 shadow-sm space-y-6 text-sm text-foreground leading-relaxed">
          <p className="text-xs text-muted-foreground">Дата вступления в силу: 15 мая 2026 г.</p>

          <section className="space-y-2">
            <h2 className="text-base font-bold">1. Общие положения</h2>
            <p>Настоящая Политика конфиденциальности (далее — «Политика») определяет порядок сбора, хранения, обработки, использования и защиты персональных данных пользователей веб-сайта маркетплейса LOCUS, доступного по адресу <a href="https://locusfood.by" className="text-primary hover:underline">locusfood.by</a>.</p>
            <p>Оператором персональных данных является:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Котович Артём Владимирович, самозанятый</li>
              <li>УНП: CE6154534</li>
              <li>Адрес: г. Витебск, ул. 1-я Целинная, д. 47</li>
              <li>E-mail: <a href="mailto:support@locusfood.by" className="text-primary hover:underline">support@locusfood.by</a></li>
            </ul>
            <p>Политика разработана в соответствии с Законом Республики Беларусь от 7 мая 2021 г. № 99-З «О защите персональных данных».</p>
            <p>Используя сайт и оформляя заказы, вы подтверждаете, что ознакомлены с настоящей Политикой и выражаете согласие на обработку ваших персональных данных в порядке и на условиях, описанных ниже.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold">2. Персональные данные, которые мы собираем</h2>
            <h3 className="font-semibold mt-3">2.1. Данные учётной записи</h3>
            <p>При регистрации на сайте вы предоставляете:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Адрес электронной почты</li>
              <li>Полное имя</li>
              <li>Номер телефона</li>
              <li>Фотография профиля (при желании)</li>
            </ul>
            <h3 className="font-semibold mt-3">2.2. Данные заказов</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Адрес доставки</li>
              <li>Состав заказа (товары, количество, стоимость)</li>
              <li>Способ получения (доставка / самовывоз)</li>
              <li>Примечания к заказу</li>
            </ul>
            <h3 className="font-semibold mt-3">2.3. Данные продавцов</h3>
            <p>При подаче заявки на регистрацию в качестве продавца:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Полное имя / название организации</li>
              <li>Контактный телефон</li>
              <li>Адрес (район, населённый пункт, улица)</li>
              <li>Описание деятельности</li>
            </ul>
            <h3 className="font-semibold mt-3">2.4. Технические данные (собираются автоматически)</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Анонимный идентификатор посетителя</li>
              <li>Адрес просматриваемой страницы</li>
              <li>Источник перехода (referrer)</li>
              <li>Сведения о браузере и устройстве (User-Agent)</li>
              <li>IP-адрес (для аналитики и защиты от мошенничества)</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold">3. Цели обработки персональных данных</h2>
            <p>Мы обрабатываем ваши персональные данные исключительно для следующих целей:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Регистрация и идентификация пользователей на сайте</li>
              <li>Оформление, обработка и доставка заказов</li>
              <li>Направление SMS-уведомлений о подтверждении регистрации</li>
              <li>Направление email-уведомлений о статусе заказа</li>
              <li>Связь с пользователем по вопросам заказа</li>
              <li>Передача данных продавцу для организации отгрузки товара</li>
              <li>Анализ посещаемости и улучшение работы сайта (Яндекс.Метрика)</li>
              <li>Таргетированная реклама (Meta Pixel и Meta Conversions API)</li>
              <li>Обеспечение безопасности и предотвращение мошенничества</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold">4. Правовые основания обработки</h2>
            <p>Обработка персональных данных осуществляется на следующих основаниях (Закон № 99-З):</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Согласие субъекта персональных данных — при регистрации, оформлении заказа, подаче заявки продавца</li>
              <li>Исполнение договора — обработка данных, необходимых для выполнения заказа и доставки товара</li>
              <li>Законные интересы оператора — аналитика, обеспечение безопасности сайта</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold">5. Передача данных третьим лицам</h2>
            <p>Мы не продаём и не передаём ваши персональные данные третьим лицам в коммерческих целях. Передача данных осуществляется только в следующих случаях:</p>
            <h3 className="font-semibold mt-3">5.1. Продавцам маркетплейса</h3>
            <p>Для организации сборки и отгрузки заказа продавцу передаётся: имя покупателя и номер телефона. Продавцы обязуются не использовать эти данные в иных целях.</p>
            <h3 className="font-semibold mt-3">5.2. Сервисам аналитики и рекламы</h3>
            <p>Яндекс.Метрика — собирает обезличенные данные о поведении на сайте. Политика: metrika.yandex.ru</p>
            <p>Meta Pixel и Meta Conversions API — используются для измерения эффективности рекламы. Передаются: хэш email (SHA-256), IP-адрес, данные о браузере, сумма покупки. Политика Meta: facebook.com/privacy/policy</p>
            <h3 className="font-semibold mt-3">5.3. Государственным органам</h3>
            <p>По требованию уполномоченных органов Республики Беларусь в объёме и порядке, установленном законодательством.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold">6. Cookies и локальное хранилище</h2>
            <p>Сайт использует localStorage браузера для хранения:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Содержимого корзины покупок</li>
              <li>Анонимного идентификатора посетителя</li>
              <li>Токенов авторизованной сессии</li>
            </ul>
            <p>Эти данные хранятся только в вашем браузере. Вы можете очистить их в настройках браузера в любое время.</p>
            <p>Также используются технологии отслеживания Meta Pixel и Яндекс.Метрика — подробнее в разделе 5.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold">7. Сроки хранения данных</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Данные учётной записи — в течение всего периода существования аккаунта, удаляются по запросу</li>
              <li>Данные заказов — 3 (три) года с момента совершения заказа</li>
              <li>Данные о посещениях — 12 месяцев с момента визита</li>
              <li>Данные в localStorage — до момента очистки браузера пользователем</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold">8. Права субъекта персональных данных</h2>
            <p>В соответствии с Законом Республики Беларусь № 99-З вы имеете право:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Получить информацию о том, какие ваши данные обрабатываются (право на доступ)</li>
              <li>Потребовать исправления неточных или неполных данных</li>
              <li>Потребовать удаления персональных данных при отсутствии законных оснований для их хранения</li>
              <li>Отозвать ранее данное согласие на обработку данных</li>
              <li>Потребовать ограничения обработки данных</li>
            </ul>
            <p>Для реализации своих прав направьте запрос по контактным данным из раздела 10. Срок ответа — не более 15 календарных дней.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold">9. Защита персональных данных</h2>
            <p>Оператор принимает следующие меры для защиты персональных данных:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Шифрование данных при передаче (HTTPS/TLS)</li>
              <li>Аутентификация и авторизация пользователей</li>
              <li>Ограничение доступа к данным на уровне базы данных (Row Level Security)</li>
              <li>Регулярное обновление программного обеспечения</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold">10. Контактная информация</h2>
            <p>По всем вопросам, связанным с обработкой персональных данных:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>E-mail: <a href="mailto:support@locusfood.by" className="text-primary hover:underline">support@locusfood.by</a></li>
              <li>Почтовый адрес: г. Витебск, ул. 1-я Целинная, д. 47</li>
            </ul>
            <p>Срок ответа на обращение — не более 15 (пятнадцати) календарных дней с момента получения запроса.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold">11. Изменения в Политике</h2>
            <p>Оператор оставляет за собой право вносить изменения в настоящую Политику. Актуальная версия всегда размещена по адресу: <a href="/privacy-policy" className="text-primary hover:underline">locusfood.by/privacy-policy</a></p>
            <p>Продолжение использования сайта после внесения изменений означает ваше согласие с обновлённой Политикой. При существенных изменениях мы уведомим вас по email.</p>
          </section>

          <p className="text-xs text-muted-foreground pt-4 border-t border-border">Котович Артём Владимирович, самозанятый, УНП CE6154534 • locusfood.by</p>
        </div>
      </main>
      <Footer />
      <BottomNavigation />
    </div>
  );
}
