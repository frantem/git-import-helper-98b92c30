## Проблема

На странице `/admin/products` (создание/редактирование товара админом) при добавлении фото:
- не открывается диалог обрезки 1:1
- файл уходит в Supabase Storage как есть (только лёгкое сжатие через `compressImage`, без кадрирования под квадрат превью)

Причина — в `src/pages/admin/AdminProducts.tsx` функция `handleImageUpload` (стр. 113-127) грузит файл напрямую. Компонент `ImageCropDialog` там не подключён. В аналогичной странице продавца `src/pages/seller/SellerProducts.tsx` логика обрезки + сжатия присутствует (стр. 123-150 + рендер `<ImageCropDialog>` на стр. 753) и работает корректно — её и переносим.

## Что сделаем

Только фронтенд, один файл — `src/pages/admin/AdminProducts.tsx`:

1. Импортировать `ImageCropDialog` из `@/components/ImageCropDialog`.
2. Добавить состояние `cropSrc: string | null`.
3. Переписать `handleImageUpload`: вместо немедленной загрузки — читать файл через `FileReader` в `cropSrc`, сбрасывать `e.target.value` (чтобы можно было выбрать тот же файл повторно).
4. Добавить `handleCroppedUpload(blob)` — создаёт `File` из кропнутого blob, прогоняет через `compressImage(..., "product")` (1000×1000, q=0.8 — пресет уже настроен) и загружает в bucket `product-images`. Логика идентична `SellerProducts.handleCroppedUpload`.
5. В JSX добавить `<ImageCropDialog open={!!cropSrc} imageSrc={cropSrc} onCancel={() => setCropSrc(null)} onCropped={handleCroppedUpload} />` рядом с формой товара.

## Что НЕ трогаем

- `src/lib/imageUtils.ts` и `ImageCropDialog.tsx` — работают корректно.
- `SellerProducts.tsx` — там уже всё правильно.
- Бэкенд, RLS, storage policies — без изменений.

## Проверка

После сборки: на `/admin/products` → создать/редактировать товар → кнопка загрузки фото → должен открыться диалог 1:1 с зумом → после «Применить» картинка сжимается до ≤1000px JPEG q=0.8 и появляется в превью.
