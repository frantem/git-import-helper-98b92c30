

## План: Отзывы на странице продавца + удаление отзывов

### Что будет сделано

1. **Количество отзывов рядом с рейтингом** — в шапке профиля продавца добавить `(N отзывов)` как кликабельную ссылку, при нажатии — скролл к блоку отзывов
2. **Блок отзывов продавца** — после товаров показать все отзывы со всех товаров этого фермера (включая удалённые товары), с фото, рейтингом, именем товара
3. **Удаление своих отзывов** — кнопка удаления в `ProductReviews` + новый компонент для страницы продавца, миграция для RLS DELETE

### Изменения

**1. Миграция — RLS политики для удаления отзывов и фото**

```sql
CREATE POLICY "Users can delete own reviews" ON public.reviews
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own review_images" ON public.review_images
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM reviews WHERE reviews.id = review_images.review_id AND reviews.user_id = auth.uid())
  );
```

**2. `src/pages/SellerProfile.tsx`**

- Добавить состояние `sellerReviews` и `totalReviewCount`
- Fetch ALL отзывы со всех товаров фермера (включая `is_deleted=true`): запрос products по `farmer_id` (без фильтра `is_deleted`), затем reviews по этим product_id + review_images + product title через join
- В шапке: `(N отзывов)` — кликабельный `<button onClick={() => document.getElementById('seller-reviews')?.scrollIntoView(...)}>` 
- После блока товаров: секция `<div id="seller-reviews">` со списком отзывов (переиспользуем стили из ProductReviews), с названием товара у каждого отзыва
- Кнопка "Удалить" у своих отзывов

**3. `src/components/ProductReviews.tsx`**

- Добавить prop `onDeleteReview?: (reviewId: string) => void`
- У каждого отзыва, если `review.userId === user?.id`, показать кнопку 🗑 "Удалить" с подтверждением

**4. `src/pages/Product.tsx`**

- Добавить `handleDeleteReview`: удалить `review_images`, затем `reviews` по id, обновить список

### Результат
- Рейтинг в шапке продавца: `★ 4.8 (12 отзывов)` — клик скроллит к отзывам
- Все отзывы продавца внизу страницы с названием товара
- Отзывы сохраняются даже при удалении товара/пользователя
- Пользователи могут удалять свои отзывы

4 файла: 1 миграция + 3 tsx.

