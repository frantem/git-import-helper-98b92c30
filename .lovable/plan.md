## Проблема

Google Search Console не может разобрать sitemap.xml — ошибка на строке ~118 (`Ошибка разбора`).

Причина: в `<image:loc>` подставляется URL через wsrv.nl CDN-прокси с непроэкранированными амперсандами (`&w=800&h=800&q=78...`). В XML символ `&` обязан быть `&amp;`. Сейчас в файле 120 таких неэкранированных `&` — это делает весь XML невалидным.

## Решение

В `supabase/functions/sitemap/index.ts` экранировать URL изображения так же, как уже экранируется `title`:

```ts
const img = ogImageUrl(p.image_url);
const escapedImg = img.replace(/&/g, "&amp;");
// ...
<image:loc>${escapedImg}</image:loc>
```

После правки — задеплоить функцию `sitemap` и попросить Google повторно обработать sitemap в Search Console.

## Технические детали

- Файл: `supabase/functions/sitemap/index.ts`, строки 100 и 112.
- Только `&` в `<image:loc>` (другие колонки уже валидны). `title`/`caption` уже экранируются.
- После деплоя: `curl -sL https://locusfood.by/sitemap.xml | grep -c '&w='` должен вернуть 0, а `grep -c '&amp;w='` — около 120.