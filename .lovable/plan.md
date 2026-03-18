

## Проблема

В `index.html` на строках 16 и 20 захардкожена ссылка на OG-картинку Lovable:
```
https://lovable.dev/opengraph-image-p98pqg.png
```

Telegram (и другие мессенджеры) читают HTML **до выполнения JavaScript**, поэтому `DynamicMeta.tsx` не успевает подменить значение — бот Telegram видит именно эту дефолтную картинку Lovable.

## Решение

Заменить URL og:image и twitter:image в `index.html` на актуальное изображение из `app_settings` (то, что сейчас установлено в админке как "Превью для соцсетей"). Нужно узнать текущий URL из базы.

### Шаги

1. **Прочитать из БД** текущее значение `og_image_url` из `app_settings`
2. **`index.html`** строка 16 и 20 — заменить `https://lovable.dev/opengraph-image-p98pqg.png` на актуальный URL из БД

Одна правка в одном файле — две строки.

