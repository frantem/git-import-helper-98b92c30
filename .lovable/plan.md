# Контакты-иконки в блоке «О нас» страницы продавца

## Цель
Убрать крупные кнопки телефона/мессенджеров из футера страницы продавца и перенести контакты в блок «О нас» в виде компактных круглых иконок, которые открывают нативные приложения по deep-ссылкам с готовым текстом сообщения.

## Что меняется

### 1. `src/components/seller/SellerTrustFooter.tsx` — убрать контакты
- Удалить весь блок `hasContacts` (телефон, Instagram, Telegram pill-кнопки) и проп `contacts`.
- Оставить ссылку «Все отзывы на LOCUS» и подпись «витрина продавца».

### 2. `src/components/seller/SellerAbout.tsx` — иконки контактов
- Добавить проп `contacts?: SellerContacts`.
- Под текстом «О нас» — ряд круглых иконок (только для заполненных контактов):
  - **Телефон** → `tel:+375…` (звонилка, без текста)
  - **Telegram** → `https://t.me/{username}?text=Здравствуйте! Пишу с сайта LOCUS`
  - **Instagram** → `https://instagram.com/{username}`
  - **Viber** → `viber://chat?number=%2B{digits}` (без текста)
  - **WhatsApp** → `https://wa.me/{digits}?text=Здравствуйте! Пишу с вашего сайта на LOCUS 👋`
- Иконки: Phone и Instagram из lucide; Telegram, Viber, WhatsApp — инлайн SVG brand-иконки (lucide их не предоставляет).
- Каждая иконка — `<a target="_blank" rel="noopener noreferrer">` в круглом контейнере `bg-card`, размер ~36px.
- Импорт типа `SellerContacts` перенести из SellerTrustFooter в общий (оставить в SellerTrustFooter и импортировать оттуда, либо продублировать интерфейс).

### 3. `src/pages/SellerProfile.tsx` — передать контакты
- В `<SellerAbout …/>` добавить `contacts={farmer.contacts}`.

### 4. `src/pages/seller/SellerPage.tsx` — поля редактора
- В state `hero` добавить `contact_viber` и `contact_whatsapp`.
- При загрузке читать из `contacts.viber` / `contacts.whatsapp`.
- В `saveHero` писать их в JSONB `contacts` (вместе с phone/instagram/telegram).
- В UI добавить 2 поля ввода (Viber, WhatsApp) рядом с существующими телефон/instagram/telegram — сетка `md:grid-cols-3` расширить до 5 полей (или 2 строки).
- Pluralholders: `+375 29 000-00-00` для Viber/WhatsApp (номер в международном формате).

### 5. Тип `SellerContacts`
- Расширить интерфейс `SellerContacts` полями `viber?: string | null` и `whatsapp?: string | null`.

## Не требуется
- Миграции БД: `farmers.contacts` — JSONB, новые ключи добавляются без изменения схемы.

## Проверка
- Сборка проходит.
- На `/seller/knyazhetsky` иконки появляются в блоке «О нас», футер без кнопок.
- Клик по иконке открывает нативное приложение / deep-ссылку с готовым текстом.
- В редакторе «Моя страница» есть поля Viber и WhatsApp, они сохраняются.
