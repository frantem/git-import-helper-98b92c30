## Диагноз (по данным GSC)

- **231 «Просканирована, но не проиндексирована»** — Google посчитал контент низкокачественным/дублирующим. Главная причина: у товаров одинаковые шаблонные meta-описания и тонкий контент в prerender HTML.
- **98 «Обнаружена, не проиндексирована»** — краулинговый бюджет расходуется на слабые URL.
- **75 URL «Не найдено (404)»** — старые удалённые товары в индексе. Обрабатываются корректно (404 + noindex), Google их постепенно выкинет сам.
- **7 «Заблокировано robots.txt»** — URL с `?category=`, `?discount=`, `?new=`, `?search=`. Они закрыты, но Google их видит из внешних/внутренних ссылок и держит как «indexed though blocked» без возможности прочитать canonical.
- **Дубликаты в `index.html` и prerender**: разные title/description для главной, что путает Google (у главной в live-версии React перезаписывает head, но социальные краулеры видят статический).

## Что чиню

### 1. `supabase/functions/prerender/index.ts` — качество контента для товаров
- **`productMeta`**: description сейчас всегда шаблон «Заказать X от локальных мастеров...». Меняю: если у товара есть `product.description` (реальный текст продавца) — брать его как основу meta-description (`truncateMeta(product.description, 160)`). Шаблон остаётся только фолбэком.
- **Body content** товара: добавить категорию, вес/единицу, короткие характеристики — чтобы страница не выглядела «пустой» для Google. Добавить `<h2>Характеристики</h2>` со списком.
- **title**: у товаров с одинаковыми названиями («Торт», «Торт-2») сейчас идентичный title до бренда. Добавляю имя продавца в title: `${title} от ${sellerName} купить в Витебске | Locus` — это уникализирует.

### 2. `supabase/functions/prerender/index.ts` — canonical + noindex для параметрических URL
- Для `/catalog?discount=true`, `?new=true`, `?search=...` — прописать `<meta name="robots" content="noindex, follow">` и canonical на `/catalog`.
- Для `/catalog?category=X` — уже стоит canonical на `/vitebsk/X` (оставляем).
- Убрать мёртвый `generateSitemap` из prerender (nginx его не вызывает, живой sitemap — из отдельной `supabase/functions/sitemap`).

### 3. `public/robots.txt` — разблокировать параметры каталога
- Убираю `Disallow: /catalog?category=`, `?discount=`, `?new=`, `?search=` для всех User-agent. Google сможет крауилить, увидеть `noindex`/`canonical` и правильно консолидировать. Robots-disallow БЕЗ noindex — антипаттерн: URL всё равно попадает в индекс без сниппета.
- Оставляю блокировку `/admin`, `/auth`, `/checkout`, `/cart` для `*` (это приватные страницы, canonical/noindex для них смысла нет).

### 4. `index.html` — согласовать meta с prerender
- Синхронизировать `<title>` и `<meta name="description">` со значениями из prerender `homeMeta()`, чтобы для соц-краулеров и SPA был один текст.
- Убрать `<meta name="keywords">` (Google игнорирует, у Yandex небольшой минус за спам-подобные keywords).

### 5. `src/pages/Index.tsx` — видимый H1
- Добавить в самое начало `<main>` семантический `<h1>` (визуально малозаметный, но читаемый). Сейчас на главной вообще нет h1 в отрендеренном DOM — только в `<noscript>` prerender-версии. Googlebot исполняет JS и видит SPA без h1 → минус в оценке страницы.

### 6. `supabase/functions/sitemap/index.ts` — убрать шум
- Товары без изображения и без описания понижать priority до 0.5 (или исключать), чтобы Google не тратил бюджет.
- Продавцов без описания и товаров понижать до 0.4 (сейчас 0.6 у всех подряд).

## Технические детали

- Категории с латинскими/капитализированными slug (`Bread`, `Confectioner`, `Tort`, `Ova et Producta Lactis`) — отдельная проблема для UX и SEO (некрасивые URL, чувствительность к регистру), но это data-миграция с рисками для существующих ссылок. **В этот план не включаю** — предложу отдельно после утверждения.
- Данные о попадании страниц в индекс обновляются в GSC 2–4 недели после фикса. После деплоя нужно: в GSC → «Проверка URL» → «Запросить индексирование» для ~10 ключевых страниц (главная, `/catalog`, топ-6 `/vitebsk/*`, топ-5 товаров).

## Файлы

- `supabase/functions/prerender/index.ts` — переработка `productMeta`, noindex для параметров каталога, удаление dead-code `generateSitemap`.
- `supabase/functions/sitemap/index.ts` — приоритеты по качеству.
- `public/robots.txt` — убрать disallow параметров.
- `index.html` — синхронизация meta, убрать keywords.
- `src/pages/Index.tsx` — h1.
