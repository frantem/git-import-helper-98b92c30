

## Проблема

### 1. «Вариант страницы с тегом canonical» (`/catalog?category=meat`)

Сейчас в `SEO.tsx`:
```ts
const pageCanonical = canonical || `${DOMAIN}${window.location.pathname}`;
```
`window.location.pathname` для `/catalog?category=meat` = `/catalog` → canonical = `https://locusfood.by/catalog`.  
Но в `sitemap.xml` мы при этом отдаём `https://locusfood.by/catalog?category=meat` как самостоятельный URL. Google заходит, видит canonical, указывающий на `/catalog`, и помечает: «страница не индексируется, есть canonical-вариант». Конфликт sitemap ↔ canonical.

**Решение:** canonical для страниц категорий должен совпадать с URL в sitemap — `https://locusfood.by/catalog?category={slug}`. То же самое для `?discount=true` и `?new=true`. А для страниц поиска (`?search=`) и других query-вариантов — наоборот, явно указывать canonical на чистый `/catalog`, плюс ставить `noindex` (поиск индексировать не нужно).

### 2. «Страница с переадресацией» (`http://locusfood.by/`)

Это нормальное поведение HTTP→HTTPS-редиректа на сервере, и Google так и должен его обрабатывать. Эта запись в Search Console — **не ошибка**, а информационный отчёт. Решение — убедиться, что:
- В `sitemap.xml` все URL только с `https://` ✓ (уже так).
- В `robots.txt` ссылка на sitemap с `https://` ✓.
- Все внутренние og/canonical ссылки тоже с `https://` ✓.

Реальное действие: ничего менять не нужно, но добавим **HSTS-намёк через canonical и og:url** (всегда https) — уже есть. Дополнительно явно сообщим Google через canonical, что главная — `https://locusfood.by/` (сейчас canonical правильный — `https://locusfood.by/`, проблема в том, что Google проверяет `http://` версию и видит редирект; это ожидаемо и со временем исчезнет из отчёта).

Если есть желание — можем добавить запрос **«валидировать исправление»** в Search Console после обновления canonical для категорий: Google перепроверит и снимет уведомление о редиректе для главной.

## Реализация

### Файл: `src/pages/Catalog.tsx`

В блоке `seoData` для каждой ветки добавить явный `canonical`:

```ts
if (categoryFilter && category) {
  return {
    title: ...,
    description: ...,
    keywords: ...,
    jsonLd,
    canonical: `https://locusfood.by/catalog?category=${category.slug}`,
  };
}
if (discountFilter) {
  return {
    title: ...,
    description: ...,
    canonical: "https://locusfood.by/catalog?discount=true",
  };
}
if (newFilter) {
  return {
    title: ...,
    description: ...,
    canonical: "https://locusfood.by/catalog?new=true",
  };
}
if (searchQuery) {
  return {
    title: ...,
    description: ...,
    canonical: "https://locusfood.by/catalog",
    noindex: true, // поиск не индексируем
  };
}
return {
  title: ...,
  description: ...,
  canonical: "https://locusfood.by/catalog",
};
```

И передать `canonical` и `noindex` в `<SEO />`.

### Файл: `src/components/SEO.tsx`

1. Добавить новый проп `noindex?: boolean`.
2. Если `noindex === true` — поставить `<meta name="robots" content="noindex, follow">`, иначе убрать.
3. Логика canonical уже работает корректно — она использует переданное значение (`canonical` имеет приоритет над `pathname`). Изменений не требуется, кроме добавления `noindex`.

### Что не трогаем

- `supabase/functions/sitemap/index.ts` — URLs категорий с `?category=slug` остаются (теперь они согласованы с canonical).
- `public/robots.txt` — уже корректный.
- Никаких изменений на серверной стороне (HTTP→HTTPS редирект обрабатывается nginx и работает правильно).

## После деплоя

1. Открыть Google Search Console.
2. В отчёте «Вариант страницы с тегом canonical» нажать **«Проверить исправление»** для `/catalog?category=meat` — Google перепроверит и страницы пойдут в индекс.
3. Отчёт «Страница с переадресацией» для `http://locusfood.by/` — это информационное сообщение, не блокирует индексацию `https://locusfood.by/`. Можно тоже нажать «Проверить» — он уберёт запись после повторного сканирования.

## Файлы

- `src/pages/Catalog.tsx` — добавить `canonical` и (для поиска) `noindex` в `seoData`.
- `src/components/SEO.tsx` — поддержка пропа `noindex`.

