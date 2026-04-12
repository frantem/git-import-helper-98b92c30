

## План: Фотографии в отзывах

### Что нужно сделать

Покупатели смогут прикреплять до 3 фотографий к отзыву. Фото загружаются в Supabase Storage, ссылки хранятся в новой таблице `review_images`.

### Изменения

**1. Миграция БД — создать таблицу `review_images` и storage bucket**

```sql
CREATE TABLE public.review_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.review_images ENABLE ROW LEVEL SECURITY;

-- Все могут читать фото отзывов
CREATE POLICY "Anyone can read review_images" ON public.review_images
  FOR SELECT USING (true);

-- Авторы отзывов могут добавлять фото
CREATE POLICY "Users can insert own review_images" ON public.review_images
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM reviews WHERE reviews.id = review_images.review_id AND reviews.user_id = auth.uid())
  );

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('review-images', 'review-images', true);

-- Storage policies
CREATE POLICY "Anyone can read review images" ON storage.objects
  FOR SELECT USING (bucket_id = 'review-images');

CREATE POLICY "Auth users can upload review images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'review-images' AND auth.uid() IS NOT NULL);
```

**2. `src/components/ProductReviews.tsx`**
- Добавить `images?: string[]` в интерфейс `Review`
- Добавить состояние `selectedFiles: File[]` (макс 3)
- Добавить кнопку 📷 "Добавить фото" с `<input type="file" accept="image/*" multiple capture="environment">` — работает на смартфоне
- Показывать превью выбранных фото перед отправкой
- Изменить `onAddReview` сигнатуру: `(rating: number, text: string, files: File[]) => void`
- В списке отзывов — показывать миниатюры фото с возможностью открыть на весь экран (dialog)

**3. `src/pages/Product.tsx`**
- Обновить `handleAddReview` — после insert в `reviews`:
  1. Сжать фото через `compressImage` (уже есть в проекте)
  2. Загрузить в `review-images/{user_id}/{review_id}/`
  3. Вставить записи в `review_images`
- Обновить `fetchReviews` — подгружать `review_images` для каждого отзыва

### Результат
- Кнопка 📷 в форме отзыва, до 3 фото
- `capture="environment"` открывает камеру на смартфоне
- Сжатие перед загрузкой (уже есть `compressImage`)
- Фото отображаются в отзывах как миниатюры

3 файла: 1 миграция + 2 tsx.

