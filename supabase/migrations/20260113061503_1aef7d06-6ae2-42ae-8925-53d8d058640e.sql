-- Добавить поле image_url в categories для фото категорий
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url text;

-- Добавить поле is_blocked в farmers для блокировки продавцов
ALTER TABLE public.farmers ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT false;

-- Создать таблицу favorites для избранных товаров
CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, product_id)
);

-- RLS для favorites
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favorites" 
ON public.favorites 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can add to favorites" 
ON public.favorites 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from favorites" 
ON public.favorites 
FOR DELETE 
USING (auth.uid() = user_id);

-- Заполнить категории начальными данными
INSERT INTO public.categories (slug, name, emoji, sort_order, image_url) VALUES
('honey', 'Мёд и пчеловодство', '🍯', 1, 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400'),
('vegetables', 'Овощи', '🥔', 2, 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400'),
('fruits', 'Фрукты и ягоды', '🍎', 3, 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400'),
('herbs', 'Травы и чаи', '🌿', 4, 'https://images.unsplash.com/photo-1515023115689-589c33041d3c?w=400'),
('dairy', 'Молочные продукты', '🥛', 5, 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400'),
('eggs', 'Яйца', '🥚', 6, 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400'),
('meat', 'Мясо и птица', '🥩', 7, 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400'),
('sets', 'Готовые наборы', '🧺', 8, 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400')
ON CONFLICT (slug) DO UPDATE SET 
  name = EXCLUDED.name,
  emoji = EXCLUDED.emoji,
  sort_order = EXCLUDED.sort_order,
  image_url = EXCLUDED.image_url;