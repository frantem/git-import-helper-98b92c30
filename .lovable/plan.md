## Что на самом деле говорит Google Search Console

Сначала уточню цифры — в отчёте **нет 164 страниц с 404**. Реальная картина из CSV:


| Причина                                | Страниц | Серьёзность      |
| -------------------------------------- | ------- | ---------------- |
| Обнаружена, не проиндексирована        | **142** | Главная проблема |
| Просканирована, но не проиндексирована | **16**  | Главная проблема |
| Вариант страницы с canonical           | 4       | Норма, игнор     |
| Страница с переадресацией              | 1       | Норма, игнор     |
| **Не найдено (404)**                   | **1**   | Незначительно    |


И ещё подсказка из графика: 19 мая число неиндексированных скакнуло с 8 → 155. В этот день в sitemap резко добавилось ~150 URL (товары/категории), и Google решил их **не сканировать**, потому что не увидел смысла.

## Главная причина — prerender для ботов отключён

Я проверил, что отдаёт сайт Googlebot для конкретного товара:

```
curl -A "Googlebot/2.1" https://locusfood.by/product/f1b6e518-...
→ <title>Locus — Маркетплейс локальных продуктов</title>
→ <meta name="description" content="Locus — маркетплейс локальных продуктов...">
→ Размер HTML: 5 КБ (пустой SPA-шаблон)
```

Это значит: на **всех** 198 URL в sitemap Googlebot видит один и тот же дефолтный `index.html` без названия товара, без описания, без цены, без JSON-LD. Для краулера это выглядит как 200 одинаковых страниц-дублей с пустым контентом — он их обнаруживает, но не индексирует. Именно этим объясняются 142 «обнаружено» и 16 «просканировано, но не проиндексировано».

Edge Function `supabase/functions/prerender/index.ts` существует и в `sitemap` работает корректно, но nginx-конструкция, которая должна перенаправлять ботов на неё, в текущем `locusfood-minimal` конфиге **отсутствует** (в project-knowledge явно: «Prerender для ботов требует доработки. Пока отключено»).

## План действий

### 1. Включить prerender для ботов в nginx (главное, делает пользователь на сервере)

Безопасная конструкция через `map` (без `proxy_set_header` внутри `if`, которая ломалась раньше). Добавить в `/etc/nginx/nginx.conf` в блок `http {}`:

```nginx
map $http_user_agent $is_bot {
    default 0;
    "~*googlebot|bingbot|yandex|duckduckbot|baiduspider|twitterbot|facebookexternalhit|linkedinbot|telegrambot|slackbot|whatsapp|applebot|petalbot|ahrefsbot|semrushbot" 1;
}
```

И в `/etc/nginx/sites-available/locusfood-minimal` заменить `location / { try_files ... }` на:

```nginx
location / {
    if ($is_bot = 1) {
        rewrite ^ /__prerender last;
    }
    try_files $uri $uri/ /index.html;
}

location = /__prerender {
    internal;
    proxy_pass https://jxklppwhgmndlivvtxdd.supabase.co/functions/v1/prerender$request_uri;
    proxy_set_header Host jxklppwhgmndlivvtxdd.supabase.co;
    proxy_set_header Authorization "Bearer sb_publishable_4BsZPljQh_EjEdeWnIDjUA_q1JkMlxP";
    proxy_set_header X-Original-Host $host;
    proxy_set_header X-Original-Path $request_uri;
    proxy_ssl_server_name on;
    proxy_read_timeout 15s;
    add_header X-Prerendered "true" always;
}
```

Затем `sudo nginx -t && sudo systemctl reload nginx`.

Проверка после включения: `curl -A "Googlebot/2.1" https://locusfood.by/product/<id>` должен вернуть HTML с реальным названием товара в `<title>` и блоком `application/ld+json` с Product schema.

### 2. Доработать prerender Edge Function (это сделаю я в коде)

Я прочитаю текущий `supabase/functions/prerender/index.ts` и проверю, что он:

- читает путь из заголовка `X-Original-Path` (а не из `req.url`, которым он становится `/functions/v1/prerender/...`)
- корректно обрабатывает `/product/:id`, `/seller/:slug`, `/vitebsk/:slug`, `/catalog`, `/`
- ставит уникальный `<title>`, `<meta name="description">`, `og:*`, `<link rel="canonical">`, JSON-LD Product/BreadcrumbList на каждый URL
- отдаёт `200` (а не 404) для активных товаров и `404` только для реально удалённых

Если найду расхождения — поправлю под новую nginx-схему выше.

### 3. Починить 1 настоящий 404

Один URL в отчёте реально отдаёт 404. После включения prerender я смогу попросить GSC прислать его URL через Inspection API, либо вы его пришлёте из раздела «Не найдено (404) → Примеры» в GSC, и я разберусь (вероятно, удалённый товар, который ещё висит в sitemap — допилю фильтр `is_deleted`).

### 4. Что НЕ нужно трогать

- 4 страницы «вариант с canonical» и 1 «с переадресацией» — это нормальное поведение, не ошибка.
- Sitemap уже корректный (фильтрует заблокированных фермеров и `is_deleted` товары).
- robots.txt уже правильно закрывает `/catalog?category=` (они canonicalize в `/vitebsk/<slug>`).

### 5. После деплоя

1. Открыть GSC → Inspection → проверить любой `/product/...` URL → «Test live URL» → убедиться, что в Rendered HTML виден настоящий title и JSON-LD.
2. На странице отчёта «Обнаружена, не проиндексирована» нажать **Validate fix**.
3. Подождать 1–3 недели — Google заново обойдёт страницы и большая часть из 158 должна перейти в «Проиндексировано».

## Что я делаю прямо сейчас, если вы одобрите план

- Читаю `supabase/functions/prerender/index.ts`, при необходимости правлю под схему `X-Original-Path` + добавляю/проверяю JSON-LD и meta для каждого типа страниц.
- Если пришлёте URL единственной 404-страницы — починю.  
  
я сделал что бы на сервере `curl` показал уникальный заголовок `Камамбер стабилизированный купить в Витебске | Натуральные продукты Locus` — значит, prerender для ботов работает.  
URL единственной 404-страницы: [https://locusfood.by/seller/kamlux](https://locusfood.by/seller/kamlux)  
  
