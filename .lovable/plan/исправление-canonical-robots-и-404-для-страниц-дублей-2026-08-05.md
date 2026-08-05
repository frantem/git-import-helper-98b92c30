# Исправление canonical, robots и 404 для страниц-дублей

## Что реально сломано (проверено в коде)

1. **Все статические страницы отдают ботам главную страницу.** В `supabase/functions/prerender/index.ts` роутер знает только `/`, `/catalog`, `/product/*`, `/vitebsk/*`, `/seller/*`. Всё остальное падает в `if (!meta) meta = homeMeta()` — то есть `/delivery`, `/privacy-policy`, `/oferta`, `/seller-terms`, `/cookies` получают HTTP 200 с title, description и **`<link rel="canonical" href="https://locusfood.by/">`**. При этом все пять страниц есть в sitemap. Для Google это ровно «Страница является копией. Отправленный URL не выбран в качестве канонического» — URL исключается, хотя страница нормальная.

2. **Служебные и несуществующие URL тоже отдают 200 + canonical на главную.** `/auth`, `/cart`, `/settings`, `/profile`, `/favorites`, `/orders`, `/seller-application`, `/seller/products`, `/seller/orders`, `/seller/settings`, а также любой опечаточный путь вида `/produkt/xxx` — всё это отвечает ботам 200 с канониклом главной вместо честного 404/noindex. Отсюда же часть «404 Not Found» и «страница-дубль» в отчётах GSC: Googlebot видит 200 там, где сайт для человека показывает 404.

3. **В `index.html` нет `<link rel="canonical">`.** Каноникал ставится только клиентски (`src/components/SEO.tsx`), а `Index.tsx` не задаёт `canonical` явно — он подставляется из `window.location.pathname`, поэтому `/?utm_source=...` и подобные варианты получают каноникал с параметрами.

4. **`public/robots.txt` не совпадает с реальными маршрутами.** Есть `Disallow: /seller/dashboard` (такого маршрута нет), но нет закрытия реальных `/seller` (кабинет), `/seller/products`, `/seller/orders`, `/seller/settings`, `/seller-application`. Одновременно нельзя закрывать `/seller/` целиком — публичные страницы фермеров живут на `/seller/:slug`.

## Что будет сделано

### prerender (главная правка)
- Добавить таблицу статических страниц с собственными title/description/H1/canonical: `/delivery`, `/privacy-policy`, `/oferta`, `/seller-terms`, `/cookies`. Каноникал каждой страницы — на саму себя.
- Служебные приватные маршруты (`/auth`, `/cart`, `/checkout`, `/profile`, `/settings`, `/favorites`, `/orders`, `/seller`, `/seller/products`, `/seller/orders`, `/seller/settings`, `/seller-application`, `/admin*`) — отдавать `noindex, follow`, `X-Robots-Tag: noindex, follow` и **без** `canonical` на главную.
- Любой неизвестный путь — настоящий **404** с `noindex, follow` (сейчас 200 + каноникал главной). У 404-ответа убрать `canonical` вообще: канонизировать несуществующий URL некорректно.
- `/catalog` с неизвестным `category=` — `noindex` + canonical `/catalog`, чтобы мусорные параметры не считались дублями каталога.
- Нормализация пути перед роутингом: срезать завершающий `/` (кроме корня), привести `/index.html` к `/`, игнорировать трекинговые параметры (`utm_*`, `fbclid`, `gclid`, `yclid`, `ref`) при построении canonical.

### index.html и SEO-компонент
- Добавить `<link rel="canonical" href="https://locusfood.by/">` и `og:url` в статический `<head>`.
- В `src/components/SEO.tsx` строить canonical с нормализацией: без query-параметров по умолчанию, без завершающего слэша, чтобы клиентский каноникал совпадал с пререндер-версией.
- `src/pages/Index.tsx` — явный `canonical="https://locusfood.by/"`.

### robots.txt
- Убрать несуществующий `Disallow: /seller/dashboard`.
- Добавить точные запреты: `/seller$`-кабинет и его подстраницы (`/seller/products`, `/seller/orders`, `/seller/settings`), `/seller-application`.
- Оставить `Allow: /` и `Sitemap:` как есть; публичные `/seller/:slug` остаются открытыми.

### Страница 404 в приложении
- `src/pages/NotFound.tsx`: добавить `<SEO noindex />` и русский текст со ссылками на главную и каталог (сейчас страница индексируемая и на английском).

## Проверка
- Запросы `curl -A Googlebot` по каждой из статических страниц: свой title и self-canonical, статус 200.
- Запрос несуществующего URL и удалённого товара: статус 404 + `X-Robots-Tag: noindex, follow`, без canonical.
- Запрос `/auth`, `/cart`, `/seller/products`: 200 + noindex, без каноникала на главную.
- Прогон всех URL из sitemap под Googlebot: 0 ответов с каноникалом, указывающим на другой URL.

## Отдельно: www и nginx (вне кода проекта)
В конфиге nginx `return 301 https://$host$request_uri` сохраняет `www.locusfood.by`, то есть сайт доступен на двух хостах с одинаковым контентом. Каноникал везде указывает на `locusfood.by`, так что критично это не ломает, но правильнее добавить редирект `www` → `locusfood.by`. Это правка на сервере — дам готовый блок конфига, применять нужно на сервере вручную.
