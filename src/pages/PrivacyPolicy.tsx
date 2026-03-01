import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { PageHeader } from "@/components/PageHeader";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />
      <main className="container mx-auto px-3 py-4 max-w-3xl">
        <PageHeader title="Политика конфиденциальности" backPath="/profile" />

        <div className="rounded-2xl bg-card p-4 md:p-6 shadow-sm space-y-6 text-sm text-foreground leading-relaxed">
          <p className="text-xs text-muted-foreground">
            Дата вступления в силу: 1 марта 2026 г.
          </p>

          <section className="space-y-2">
            <h2 className="text-base font-bold">1. Общие положения</h2>
            <p>
              Настоящая Политика конфиденциальности (далее — «Политика») определяет порядок сбора,
              хранения, обработки, использования и защиты персональных данных пользователей
              веб-приложения Locus (далее — «Приложение»), доступного по адресу{" "}
              <a href="https://locusfood.by" className="text-primary hover:underline">locusfood.by</a>.
            </p>
            <p>
              Оператором персональных данных является владелец Приложения — Locus (далее — «Оператор»).
            </p>
            <p>
              Политика разработана в соответствии с Законом Республики Беларусь от 7 мая 2021 г.
              № 99-З «О защите персональных данных» и иными нормативными правовыми актами
              Республики Беларусь.
            </p>
            <p>
              Используя Приложение, вы подтверждаете, что ознакомлены с настоящей Политикой и
              выражаете согласие на обработку ваших персональных данных в порядке и на условиях,
              описанных ниже.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold">2. Персональные данные, которые мы собираем</h2>

            <h3 className="font-semibold mt-3">2.1. Данные учётной записи</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Адрес электронной почты</li>
              <li>Полное имя</li>
              <li>Номер телефона</li>
              <li>Фотография профиля (аватар)</li>
            </ul>
            <p className="text-muted-foreground text-xs">
              Эти данные предоставляются вами при регистрации или входе через Google OAuth.
            </p>

            <h3 className="font-semibold mt-3">2.2. Данные заказов</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Адрес доставки</li>
              <li>Состав заказа (товары, количество, стоимость)</li>
              <li>Способ получения (доставка / самовывоз)</li>
              <li>Примечания к заказу</li>
            </ul>

            <h3 className="font-semibold mt-3">2.3. Данные продавцов</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Название компании / хозяйства</li>
              <li>Описание деятельности</li>
              <li>Адрес (район, населённый пункт, улица)</li>
              <li>Контактный телефон</li>
            </ul>

            <h3 className="font-semibold mt-3">2.4. Данные о посещениях</h3>
            <p>При посещении Приложения автоматически собираются:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Анонимный идентификатор посетителя (UUID, хранится в localStorage)</li>
              <li>Адрес просматриваемой страницы</li>
              <li>Источник перехода (referrer)</li>
              <li>Сведения о браузере (User-Agent)</li>
              <li>Продолжительность визита</li>
            </ul>

            <h3 className="font-semibold mt-3">2.5. Данные, сохраняемые в браузере (localStorage)</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Содержимое корзины (<code className="text-xs bg-muted px-1 rounded">locus-cart</code>)</li>
              <li>Идентификатор посетителя (<code className="text-xs bg-muted px-1 rounded">visitor_id</code>)</li>
              <li>Токены авторизации сессии Supabase</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold">3. Цели обработки персональных данных</h2>
            <p>Мы обрабатываем ваши персональные данные для следующих целей:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Регистрация и аутентификация пользователей</li>
              <li>Исполнение договора купли-продажи (оформление и доставка заказов)</li>
              <li>Связь с пользователем (уведомления о статусе заказа, ответы на обращения)</li>
              <li>Обработка заявок на получение статуса продавца</li>
              <li>Анализ посещаемости и улучшение работы Приложения</li>
              <li>Таргетированная реклама и оптимизация рекламных кампаний (Meta Pixel)</li>
              <li>Обеспечение безопасности и предотвращение мошенничества</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold">4. Правовые основания обработки</h2>
            <p>Обработка персональных данных осуществляется на следующих правовых основаниях:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Согласие субъекта персональных данных</strong> (ст. 5 Закона № 99-З) —
                при регистрации, подаче заявки продавца, использовании Приложения
              </li>
              <li>
                <strong>Исполнение договора</strong> (ст. 6 Закона № 99-З) — обработка данных,
                необходимых для оформления и доставки заказов
              </li>
              <li>
                <strong>Законные интересы оператора</strong> — аналитика посещаемости,
                обеспечение безопасности
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold">5. Cookies и технологии отслеживания</h2>
            <p>Приложение не использует файлы cookie в традиционном понимании. Вместо этого используются:</p>

            <h3 className="font-semibold mt-3">5.1. localStorage браузера</h3>
            <p>
              Для хранения содержимого корзины, идентификатора посетителя и токенов сессии.
              Эти данные хранятся только в вашем браузере и не передаются третьим лицам напрямую.
            </p>

            <h3 className="font-semibold mt-3">5.2. Meta Pixel (Facebook Pixel)</h3>
            <p>
              Мы используем пиксель Meta (Facebook) для отслеживания событий на сайте, включая
              просмотры страниц и совершённые покупки. Meta Pixel может собирать:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>IP-адрес</li>
              <li>Данные о браузере и устройстве</li>
              <li>Просмотренные страницы</li>
              <li>Сумму покупки (в BYN)</li>
            </ul>

            <h3 className="font-semibold mt-3">5.3. Meta Conversions API</h3>
            <p>
              Для повышения точности аналитики мы передаём серверные события в Meta, включая:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Хэш адреса электронной почты (SHA-256)</li>
              <li>Сведения о браузере (User-Agent)</li>
              <li>IP-адрес (для сопоставления событий)</li>
              <li>Данные о покупке (сумма, валюта)</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold">6. Третьи лица и передача данных</h2>
            <p>Для обеспечения работы Приложения мы используем услуги следующих третьих лиц:</p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-border rounded-lg mt-2">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-left p-2 border-b border-border font-semibold">Сервис</th>
                    <th className="text-left p-2 border-b border-border font-semibold">Назначение</th>
                    <th className="text-left p-2 border-b border-border font-semibold">Страна</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border-b border-border">Supabase (США)</td>
                    <td className="p-2 border-b border-border">Хранение данных, аутентификация, серверные функции</td>
                    <td className="p-2 border-b border-border">США</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-b border-border">Google (Google OAuth)</td>
                    <td className="p-2 border-b border-border">Аутентификация через аккаунт Google</td>
                    <td className="p-2 border-b border-border">США</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-b border-border">Meta Platforms (Facebook)</td>
                    <td className="p-2 border-b border-border">Аналитика, таргетированная реклама</td>
                    <td className="p-2 border-b border-border">США / ЕС</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-2">
              Передача данных указанным третьим лицам осуществляется в объёме, необходимом для
              выполнения их функций, и на основании договорных обязательств по обеспечению
              конфиденциальности.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold">7. Трансграничная передача данных</h2>
            <p>
              В связи с использованием сервисов Supabase, Google и Meta персональные данные
              могут передаваться и обрабатываться на серверах, расположенных за пределами
              Республики Беларусь, в том числе в Соединённых Штатах Америки и странах
              Европейского союза.
            </p>
            <p>
              Используя Приложение, вы даёте согласие на такую трансграничную передачу данных
              в соответствии со ст. 9 Закона Республики Беларусь № 99-З.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold">8. Сроки хранения данных</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Данные учётной записи</strong> — хранятся в течение всего периода
                существования аккаунта и удаляются по запросу пользователя
              </li>
              <li>
                <strong>Данные заказов</strong> — хранятся в течение 3 (трёх) лет с момента
                совершения заказа (в соответствии с требованиями законодательства о бухгалтерском
                учёте)
              </li>
              <li>
                <strong>Данные о посещениях</strong> — хранятся в течение 12 месяцев с момента
                визита
              </li>
              <li>
                <strong>Данные в localStorage</strong> — хранятся до момента очистки браузера
                пользователем
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold">9. Права субъекта персональных данных</h2>
            <p>
              В соответствии с Законом Республики Беларусь № 99-З вы имеете следующие права:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Право на доступ</strong> — получить информацию о том, какие ваши
                персональные данные обрабатываются
              </li>
              <li>
                <strong>Право на исправление</strong> — потребовать исправления неточных или
                неполных данных
              </li>
              <li>
                <strong>Право на удаление</strong> — потребовать удаления ваших персональных
                данных при отсутствии законных оснований для их дальнейшей обработки
              </li>
              <li>
                <strong>Право на отзыв согласия</strong> — отозвать ранее данное согласие на
                обработку персональных данных
              </li>
              <li>
                <strong>Право на ограничение обработки</strong> — потребовать ограничения
                обработки данных в определённых случаях
              </li>
            </ul>
            <p>
              Для реализации своих прав направьте запрос по контактным данным, указанным в
              разделе 11 настоящей Политики.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold">10. Защита персональных данных</h2>
            <p>
              Оператор принимает необходимые правовые, организационные и технические меры для
              защиты персональных данных от неправомерного или случайного доступа, уничтожения,
              изменения, блокирования, копирования, распространения, а также от иных
              неправомерных действий в отношении персональных данных, в том числе:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Шифрование данных при передаче (HTTPS/TLS)</li>
              <li>Аутентификация и авторизация пользователей</li>
              <li>Ограничение доступа к персональным данным (Row Level Security)</li>
              <li>Регулярное обновление программного обеспечения</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold">11. Контактная информация</h2>
            <p>
              По всем вопросам, связанным с обработкой персональных данных, вы можете обратиться:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Электронная почта:{" "}
                <a href="mailto:support@locusfood.by" className="text-primary hover:underline">
                  support@locusfood.by
                </a>
              </li>
              <li>Через раздел «Настройки» в Приложении</li>
            </ul>
            <p>
              Срок ответа на обращение — не более 15 (пятнадцати) календарных дней с момента
              получения запроса.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold">12. Изменения в Политике</h2>
            <p>
              Оператор оставляет за собой право вносить изменения в настоящую Политику.
              Актуальная версия Политики размещается по адресу{" "}
              <a href="/privacy-policy" className="text-primary hover:underline">
                locusfood.by/privacy-policy
              </a>.
            </p>
            <p>
              Продолжение использования Приложения после внесения изменений означает ваше
              согласие с обновлённой Политикой.
            </p>
          </section>
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
}
