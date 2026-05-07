## Проблема

Nginx проксирует все запросы Яндекс-бота на prerender Edge Function. Для неизвестных путей (включая `/yandex_e2c0e8feb84ad7f1.html`) prerender возвращает HTML главной страницы вместо реального файла, поэтому Яндекс видит «неправильное содержимое».

## Решение

В `supabase/functions/prerender/index.ts` добавить в начало основного хэндлера (сразу после парсинга `pathname`/`search`, до создания supabase-клиента) passthrough для статических файлов:

```ts
const STATIC_FILE_RE = /\.(html?|txt|xml|svg|ico|png|jpe?g|webp|gif|js|css|map|woff2?|json|pdf)$/i;
if (STATIC_FILE_RE.test(pathname) && pathname !== "/index.html") {
  try {
    const origin = await fetch(`${DOMAIN}${pathname}${search ? `?${search}` : ""}`, {
      headers: { "User-Agent": "prerender-static-passthrough" },
      redirect: "follow",
    });
    const body = await origin.arrayBuffer();
    return new Response(body, {
      status: origin.status,
      headers: {
        ...corsHeaders,
        "Content-Type": origin.headers.get("Content-Type") || "application/octet-stream",
        "Cache-Control": "public, max-age=300, s-maxage=600",
        "X-Robots-Tag": "all",
      },
    });
  } catch (err) {
    console.error("prerender static passthrough error:", err);
    return new Response("Not found", { status: 404, headers: corsHeaders });
  }
}
```

`pathname !== "/index.html"` — чтобы не зациклиться на SPA-шелле.

## Результат

- `/yandex_e2c0e8feb84ad7f1.html` → отдаётся файл из `public/` (162 байта, `Verification: e2c0e8feb84ad7f1`).
- `robots.txt`, `sitemap.xml`, изображения, JS/CSS бандлы, любые будущие файлы верификации — отдаются без подмены.
- HTML-маршруты SPA (`/`, `/catalog`, `/product/:id`, `/vitebsk/:slug`, `/seller/:id`) продолжают работать как раньше.

После деплоя — нажать «Проверить» в Яндекс.Вебмастере.
