# 🛒 LOCUS MARKETPLACE - Полная Документация Проекта

**Дата создания:** 26 февраля 2026 г.  
**Статус:** Активная разработка  
**Язык:** TypeScript (95.2%), PLpgSQL (3.7%)  
**ID репозитория:** 1167328270

---

## 📋 Оглавление
1. [Описание проекта](#описание-проекта)
2. [Технологический стек](#технологический-стек)
3. [Архитектура приложения](#архитектура-приложения)
4. [Структура базы данных](#структура-базы-данных)
5. [Основные функции и модули](#основные-функции-и-модули)
6. [Маршруты приложения](#маршруты-приложения)
7. [Контексты и провайдеры](#контексты-и-провайдеры)
8. [Особенности реализации](#особенности-реализации)
9. [Известные проблемы и ошибки](#известные-проблемы-и-ошибки)
10. [Как запустить и разворачивать](#как-запустить-и-разворачивать)

---

## 📖 Описание проекта

**LOCUS** — это полнофункциональная **маркетплейс-платформа** (e-commerce) для продажи товаров фермерами и производителями. Приложение предназначено для:

- 👨‍🌾 **Фермеров/Продавцов** — управление товарами, заказами, профилем
- 🛍️ **Покупателей** — каталог товаров, оформление заказов, доставка
- 👨‍💼 **Администраторов** — управление продавцами, заказами, баннерами, точками выдачи

Платформа создана для локального рынка Витебска (Беларусь) и поддерживает многоуровневую систему ролей с различными правами доступа.

### Целевая аудитория:
- Местные фермеры и малые производители
- Потребители органических/локальных продуктов
- Администраторы платформы для управления экосистемой

---

## 🛠️ Технологический стек

### Frontend (95.2% TypeScript)
| Технология | Версия | Назначение |
|---|---|---|
| **React** | 18.3.1 | UI фреймворк |
| **TypeScript** | 5.8.3 | Типизация кода |
| **Vite** | 5.4.19 | Сборка и dev-сервер |
| **Tailwind CSS** | 3.4.17 | Утилитарные стили |
| **shadcn-ui** | - | Компонентная библиотека (Radix UI) |
| **React Router** | 6.30.1 | Маршрутизация |
| **React Hook Form** | 7.61.1 | Управление формами |
| **TanStack React Query** | 5.83.0 | Управление состоянием данных |
| **Zod** | 3.25.76 | Валидация схем |
| **Lucide React** | 0.462.0 | SVG иконки |
| **Recharts** | 2.15.4 | Графики и диаграммы |
| **Sonner** | 1.7.4 | Toast уведомления |
| **react-easy-crop** | 5.5.7 | Обрезка изображений |
| **react-zoom-pan-pinch** | 4.0.3 | Масштабирование изображений |
| **embla-carousel-react** | 8.6.0 | Карусель/слайдер |

### Backend (3.7% PLpgSQL)
| Технология | Версия | Назначение |
|---|---|---|
| **Supabase** | - | Backend-as-a-Service (БД, Auth, API) |
| **PostgreSQL** | 14.1 | Реляционная база данных |
| **Supabase JS Client** | 2.90.1 | SDK для работы с Supabase |

### Утилиты и инструменты
| Инструмент | Версия | Назначение |
|---|---|---|
| **Lovable Tagger** | 1.1.13 | Теггирование компонентов |
| **ESLint** | 9.32.0 | Линтинг кода |
| **PostCSS** | 8.5.6 | Обработка CSS |
| **Autoprefixer** | 10.4.21 | Автопрефиксы для браузеров |
| **bun** | - | Альтернативный пакетный менеджер (используется bun.lock) |
| **npm** | - | Пакетный менеджер (используется package-lock.json) |

### Deployment
- **Lovable.dev** — платформа для развертывания (автоматическое развертывание из GitHub)
- **Custom Domain** — поддержка собственных доменов

---

## 🏗️ Архитектура приложения

### Уровни приложения

```
┌─────────────────────────────────────────────────────┐
│          FRONTEND (Vite + React + TypeScript)       │
├─────────────────────────────────────────────────────┤
│  App.tsx (Router) → Lazy-loaded Pages               │
├─────────────────────────────────────────────────────┤
│  Contexts (Auth, Cart)                              │
│  Hooks (useDraftState, usePendingOrdersCount)       │
│  Components (UI, Forms, Headers)                    │
├─────────────────────────────────────────────────────┤
│  React Query (Data State Management)                │
├─────────────────────────────────────────────────────┤
│  Supabase Client (Realtime API)                     │
├─────────────────────────────────────────────────────┤
│  BACKEND (Supabase PostgreSQL + RLS Policies)       │
│  Database, Auth, Edge Functions                     │
└─────────────────────────────────────────────────────┘
```

### Файловая структура

```
git-import-helper-98b92c30/
├── src/
│   ├── App.tsx                          # Главный компонент с маршрутами
│   ├── main.tsx                         # Entry point
│   ├── index.css                        # Глобальные стили
│   ├── contexts/
│   │   ├── AuthContext.tsx              # Контекст аутентификации
│   │   └── CartContext.tsx              # Контекст корзины
│   ├── pages/
│   │   ├── Index.tsx                    # Главная страница
│   │   ├── Catalog.tsx                  # Каталог товаров
│   │   ├── Product.tsx                  # Страница товара
│   │   ├── Cart.tsx                     # Корзина
│   │   ├── Checkout.tsx                 # Оформление заказа
│   │   ├── Profile.tsx                  # Профиль пользователя
│   │   ├── Auth.tsx                     # Аутентификация
│   │   ├── Orders.tsx                   # Мои заказы
│   │   ├── Favorites.tsx                # Избранное
│   │   ├── SellerApplication.tsx        # Заявка на продавца
│   │   ├── SellerProfile.tsx            # Профиль продавца
│   │   ├── Settings.tsx                 # Настройки пользователя
│   │   ├── PrivacyPolicy.tsx            # Политика приватности
│   │   ├── LocalLanding.tsx             # Локальная страница (Витебск)
│   │   ├── NotFound.tsx                 # 404
│   │   ├── seller/
│   │   │   ├── SellerDashboard.tsx      # Панель продавца
│   │   │   ├── SellerProducts.tsx       # Мои товары (продавец)
│   │   │   ├── SellerOrders.tsx         # Мои заказы (продавец)
│   │   │   └── SellerSettings.tsx       # Настройки продавца
│   │   └── admin/
│   │       ├── Admin.tsx                # Панель администратора
│   │       ├── AdminSellers.tsx         # Управление продавцами
│   │       ├── AdminSellerApplications.tsx  # Заявки на продавца
│   │       ├── AdminOrders.tsx          # Управление заказами
│   │       ├── AdminProducts.tsx        # Управление товарами
│   │       ├── AdminBanners.tsx         # Управление баннерами
│   │       ├── AdminPickupPoints.tsx    # Точки выдачи
│   │       ├── AdminBlocks.tsx          # Блоки главной страницы
│   │       └── AdminSettings.tsx        # Настройки приложения
│   ├── components/
│   │   ├── Header.tsx                   # Заголовок
│   │   ├── BottomNavigation.tsx         # Нижняя навигация
│   │   ├── SellerApplicationForm.tsx    # Форма заявки продавца
│   │   ├── CartComponent.tsx            # Компонент корзины
│   │   ├── DynamicMeta.tsx              # Meta теги
│   │   ├── MetaPageTracker.tsx          # Аналитика
│   │   └── ui/                          # shadcn/ui компоненты
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       ├── dialog.tsx
│   │       ├── select.tsx
│   │       ├── textarea.tsx
│   │       ├── form.tsx
│   │       ├── card.tsx
│   │       └── ...другие компоненты
│   ├── hooks/
│   │   ├── useDraftState.ts             # Сохранение черновиков в localStorage
│   │   ├── usePendingOrdersCount.ts     # Подсчет ожидающих заказов
│   │   └── ...другие hooks
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts                # Инициализация Supabase
│   │       └── types.ts                 # Автогенерируемые типы БД
│   ├── data/
│   │   └── products.ts                  # Интерфейсы продуктов
│   └── lib/
│       └── ...утилиты
├── supabase/
│   └── migrations/
│       ├── 20260109083827_*.sql         # Первая миграция (роли)
│       └── 20260226084417_*.sql         # Полная схема БД (Locus Marketplace)
├── public/                              # Статические файлы
├── vite.config.ts                       # Конфигурация Vite
├── tsconfig.json                        # Конфигурация TypeScript
├── tailwind.config.ts                   # Конфигурация Tailwind CSS
├── postcss.config.js                    # Конфигурация PostCSS
├── eslint.config.js                     # Конфигурация ESLint
├── package.json                         # Зависимости проекта
├── index.html                           # HTML entry point
├── components.json                      # Конфигурация shadcn/ui
├── .env                                 # Переменные окружения
├── .gitignore                           # Git исключения
├── bun.lock / bun.lockb                 # Lock файлы (Bun)
├── package-lock.json                    # Lock файл (npm)
└── .lovable/                            # Metaданные Lovable
```

---

## 🗄️ Структура базы данных

### PostgreSQL с Supabase

#### 1. **profiles** (Профили пользователей)
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL,          -- Ссылка на auth.users
  full_name TEXT,                        -- Полное имя
  phone TEXT,                            -- Телефон
  avatar_url TEXT,                       -- URL аватара
  email TEXT,                            -- Email
  delivery_address TEXT,                 -- Адрес доставки
  pickup_slots JSONB,                    -- Слоты выдачи (JSON)
  max_orders_per_day INTEGER DEFAULT 5,  -- Макс заказов в день
  busy_dates JSONB,                      -- Занятые даты
  vacation_dates JSONB,                  -- Даты отпуска
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
**RLS:** Пользователи могут читать/редактировать свой профиль

#### 2. **user_roles** (Роли пользователей)
```sql
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,                 -- Ссылка на auth.users
  role TEXT NOT NULL DEFAULT 'buyer',    -- 'buyer' | 'seller' | 'admin'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);
```
**Роли приоритета:** admin > seller > buyer  
**RLS:** Пользователи видят только свои роли, администраторы видят все

#### 3. **categories** (Категории товаров)
```sql
CREATE TABLE public.categories (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,                    -- Название категории
  slug TEXT NOT NULL UNIQUE,             -- URL-friendly слаг
  emoji TEXT,                            -- Эмодзи категории
  image_url TEXT,                        -- Изображение
  sort_order INTEGER DEFAULT 0,          -- Порядок сортировки
  created_at TIMESTAMPTZ DEFAULT now()
);
```
**Примеры:** Овощи, Фрукты, Молочное, Мясо, Зерно и т.д.

#### 4. **farmers** (Продавцы/Фермеры)
```sql
CREATE TABLE public.farmers (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE,                   -- Ссылка на auth.users
  name TEXT NOT NULL,                    -- Название фермы/продавца
  description TEXT,                      -- Описание
  district TEXT NOT NULL DEFAULT '',     -- Район (Витебский, Бешенковичский и т.д.)
  village TEXT,                          -- Деревня/поселение
  photo_url TEXT,                        -- Фото
  city TEXT,                             -- Город
  street TEXT,                           -- Улица
  rating NUMERIC,                        -- Рейтинг продавца
  is_blocked BOOLEAN DEFAULT false,      -- Заблокирован ли
  created_at TIMESTAMPTZ DEFAULT now()
);
```
**RLS:** Любой может читать, админ может управлять, продавец может обновить свой профиль

#### 5. **products** (Товары)
```sql
CREATE TABLE public.products (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,                   -- Название товара
  description TEXT,                      -- Описание
  price INTEGER NOT NULL DEFAULT 0,      -- Цена в копейках
  old_price INTEGER,                     -- Старая цена (для скидок)
  unit TEXT NOT NULL DEFAULT 'шт',       -- Единица измерения (кг, л, шт)
  image_url TEXT,                        -- Основное изображение
  farmer_id UUID REFERENCES farmers(id),
  category_id UUID REFERENCES categories(id),
  stock INTEGER NOT NULL DEFAULT 100,    -- Остаток товара
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_new BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  prep_time_minutes INTEGER DEFAULT 0,   -- Время подготовки (для заказов)
  composition TEXT,                      -- Состав
  calories NUMERIC,                      -- Калории
  protein NUMERIC,                       -- Белки
  fat NUMERIC,                           -- Жиры
  carbs NUMERIC,                         -- Углеводы
  shelf_life TEXT,                       -- Срок хранения
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
**RLS:** Продавцы могут управлять своими товарами

#### 6. **product_categories** (Many-to-Many для товаров и категорий)
```sql
CREATE TABLE public.product_categories (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  UNIQUE(product_id, category_id)
);
```

#### 7. **product_images** (Дополнительные изображения товара)
```sql
CREATE TABLE public.product_images (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 8. **product_variants** (Варианты товара)
```sql
CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label TEXT NOT NULL,                   -- Название варианта (0.5л, 1кг и т.д.)
  price INTEGER NOT NULL,                -- Цена варианта
  unit TEXT NOT NULL DEFAULT 'шт',
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  discount_percent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 9. **product_addons** (Доп. услуги/добавки)
```sql
CREATE TABLE public.product_addons (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- Название добавки
  price INTEGER NOT NULL DEFAULT 0,
  selection_type TEXT NOT NULL DEFAULT 'checkbox', -- 'checkbox' | 'radio'
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 10. **product_custom_fields** (Пользовательские поля товара)
```sql
CREATE TABLE public.product_custom_fields (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  field_type TEXT NOT NULL DEFAULT 'text', -- 'text' | 'number' | 'select'
  label TEXT NOT NULL,
  placeholder TEXT,
  max_length INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 11. **product_custom_field_options** (Опции для select полей)
```sql
CREATE TABLE public.product_custom_field_options (
  id UUID PRIMARY KEY,
  field_id UUID NOT NULL REFERENCES product_custom_fields(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);
```

#### 12. **reviews** (Отзывы)
```sql
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,               -- 1-5
  text TEXT,                             -- Текст отзыва
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 13. **favorites** (Избранные товары)
```sql
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, product_id)
);
```

#### 14. **pickup_points** (Точки выдачи)
```sql
CREATE TABLE public.pickup_points (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,                    -- Название точки (пр. "ПВЗ на ул. Ленина")
  address TEXT NOT NULL,                 -- Адрес
  working_hours TEXT,                    -- Часы работы (пр. "9:00-21:00")
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 15. **orders** (Заказы)
```sql
CREATE TABLE public.orders (
  id UUID PRIMARY KEY,
  buyer_id UUID NOT NULL,                -- Кто заказывает
  pickup_point_id UUID REFERENCES pickup_points(id),
  total_amount INTEGER NOT NULL DEFAULT 0, -- Сумма в копейках
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  delivery_type TEXT NOT NULL DEFAULT 'pickup', -- 'pickup' | 'delivery'
  delivery_address TEXT,                 -- Адрес доставки (если delivery_type='delivery')
  delivery_cost INTEGER DEFAULT 0,       -- Стоимость доставки
  delivery_date TEXT,                    -- Дата доставки
  notes TEXT,                            -- Заметки заказчика
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 16. **order_items** (Товары в заказе)
```sql
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  farmer_id UUID NOT NULL REFERENCES farmers(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL,          -- Цена за единицу на момент заказа
  variant_label TEXT,                   -- Выбранный вариант (если был)
  status TEXT NOT NULL DEFAULT 'pending', -- Статус товара в заказе
  custom_fields JSONB,                  -- Пользовательские данные (JSON)
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 17. **banners** (Баннеры главной)
```sql
CREATE TABLE public.banners (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  discount_text TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,                        -- Прямая ссылка
  link_category TEXT,                   -- или категория
  link_product_id TEXT,                 -- или товар
  color_gradient TEXT DEFAULT 'from-black/60 to-black/30',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 18. **homepage_blocks** (Блоки главной страницы)
```sql
CREATE TABLE public.homepage_blocks (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,                  -- "Популярное", "Новинки" и т.д.
  emoji TEXT,
  block_type TEXT NOT NULL DEFAULT 'all', -- 'all' | 'category' | 'featured' | 'new'
  category_filter TEXT,
  max_items INTEGER DEFAULT 4,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 19. **homepage_block_products** (Товары в блоках)
```sql
CREATE TABLE public.homepage_block_products (
  id UUID PRIMARY KEY,
  block_id UUID NOT NULL REFERENCES homepage_blocks(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(block_id, product_id)
);
```

#### 20. **app_settings** (Настройки приложения)
```sql
CREATE TABLE public.app_settings (
  id UUID PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,              -- Ключ настройки
  value TEXT NOT NULL DEFAULT '',        -- Значение
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Значения по умолчанию:
-- cutoff_time_minutes: 1050 (время до которого можно заказать)
-- avg_delivery_time_minutes: 70 (среднее время доставки)
-- delivery_start_hour: 6 (начало доставки)
-- delivery_end_hour: 24 (конец доставки)
-- favicon_url: (URL иконки)
-- og_image_url: (URL изображения для сео)
```

#### 21. **seller_applications** (Заявки на продавца)
```sql
CREATE TABLE public.seller_applications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,                -- Кто подавал заявку
  name TEXT NOT NULL,                   -- ФИО
  phone TEXT NOT NULL,                  -- Телефон
  district TEXT NOT NULL,               -- Район (Витебский, Бешенковичский и т.д.)
  village TEXT,                         -- Деревня
  description TEXT,                     -- Описание бизнеса
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  admin_comment TEXT,                   -- Комментарий администратора
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 22. **site_visits** (Аналитика посещений)
```sql
CREATE TABLE public.site_visits (
  id UUID PRIMARY KEY,
  visitor_id TEXT NOT NULL,             -- Анонимный ID посетителя
  page_path TEXT NOT NULL DEFAULT '/',  -- Какую страницу посетил
  referrer TEXT,                        -- Откуда пришел
  user_agent TEXT,                      -- Браузер/устройство
  duration_seconds INTEGER,             -- Время на странице
  visited_at TIMESTAMPTZ DEFAULT now()
);
```

### Триггеры и Функции

#### Автоматическое создание профиля при регистрации
```plpgsql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

#### RPC: get_seller_pickup_settings
Получает настройки выдачи продавца (слоты, max заказов, занятые даты)

#### RPC: get_orders_count_by_dates
Подсчитывает заказы по датам для проверки лимитов

---

## 📄 Основные функции и модули

### 🔐 Аутентификация (AuthContext)

**Файл:** `src/contexts/AuthContext.tsx`

**Функции:**
- `signUp()` — Регистрация с ролью (buyer/seller/admin)
- `signIn()` — Вход по email/password
- `signOut()` — Выход
- `resetPassword()` — Восстановление пароля
- `updatePassword()` — Изменение пароля

**Система ролей:**
- Приоритет: admin > seller > buyer
- Извлекается из таблицы `user_roles`
- Интегрирована с Supabase Auth

```typescript
interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;          // 'buyer' | 'seller' | 'admin'
  isLoading: boolean;
  isSigningOut: boolean;
}
```

### 🛒 Корзина (CartContext)

**Файл:** `src/contexts/CartContext.tsx`

**Функции:**
- Добавление/удаление товаров
- Изменение количества
- Расчет итогов
- Сохранение в localStorage

### 📱 Модуль заявок на продавца

**Файл:** `src/components/SellerApplicationForm.tsx`

**Форма включает:**
- ФИО/Контакты
- Выбор района (21 район Витебской области)
- Описание бизнеса
- Валидация по Zod
- Сохранение черновика в localStorage
- Загрузка данных профиля

**Статусы заявки:**
- `pending` — На рассмотрении
- `approved` — Одобрена
- `rejected` — Отклонена

**Процесс одобрения (для администратора):**
1. Добавить роль `seller` в `user_roles`
2. Создать запись в `farmers`
3. Обновить статус заявки на `approved`

### 🏪 Панель продавца

**Файлы:**
- `src/pages/seller/SellerDashboard.tsx` — Главная панель
- `src/pages/seller/SellerProducts.tsx` — Мои товары
- `src/pages/seller/SellerOrders.tsx` — Мои заказы
- `src/pages/seller/SellerSettings.tsx` — Настройки

**Функции:**
- Управление товарами (добавление, редактирование, удаление)
- Просмотр заказов со статусами
- Управление расписанием выдачи
- Настройка лимитов заказов

### 👨‍💼 Панель администратора

**Файлы:**
- `src/pages/admin/AdminSellers.tsx` — Управление продавцами
- `src/pages/admin/AdminSellerApplications.tsx` — Заявки
- `src/pages/admin/AdminOrders.tsx` — Заказы
- `src/pages/admin/AdminProducts.tsx` — Товары
- `src/pages/admin/AdminBanners.tsx` — Баннеры
- `src/pages/admin/AdminPickupPoints.tsx` — ПВЗ
- `src/pages/admin/AdminBlocks.tsx` — Блоки главной
- `src/pages/admin/AdminSettings.tsx` — Глобальные настройки

**Основные права:**
- Просмотр/одобрение всех заявок продавцов
- Создание и управление товарами всех продавцов
- Управление точками выдачи
- Редактирование баннеров и блоков главной
- Изменение глобальных настроек (времена доставки, сообщения и т.д.)

### 🎯 Главная страница и каталог

**Файлы:**
- `src/pages/Index.tsx` — Главная
- `src/pages/Catalog.tsx` — Каталог
- `src/pages/Product.tsx` — Страница товара

**Функции:**
- Отображение баннеров
- Динамические блоки с товарами
- Фильтрация по категориям
- Поиск товаров
- Просмотр деталей и отзывов

### 🚚 Оформление заказа

**Файлы:**
- `src/pages/Checkout.tsx`

**Особенности:**
- Расчет сроков доставки/выдачи
- Проверка лимитов заказов продавца
- Выбор точки выдачи или адреса доставки
- Расчет стоимости доставки
- Сохранение заказа в БД

---

## 🛣️ Маршруты приложения

```
/                               → Главная страница
/catalog                        → Каталог товаров
/product/:id                    → Страница товара
/cart                           → Корзина
/checkout                       → Оформление заказа
/profile                        → Профиль пользователя
/auth                           → Вход/Регистрация
/orders                         → Мои заказы (покупатель)
/favorites                      → Избранное
/settings                       → Настройки профиля
/seller                         → Панель продавца (главная)
/seller/products                → Управление товарами
/seller/orders                  → Заказы продавца
/seller/settings                → Настройки продавца
/seller/:id                     → Профиль продавца (публичный)
/seller-application             → Заявка на продавца
/admin                          → Панель администратора
/admin/sellers                  → Управление продавцами
/admin/applications             → Заявки на продавца
/admin/orders                   → Управление заказами
/admin/products                 → Управление товарами
/admin/banners                  → Управление баннерами
/admin/pickup-points            → Управление ПВЗ
/admin/blocks                   → Управление блоками
/admin/settings                 → Глобальные настройки
/privacy-policy                 → Политика приватности
/vitebsk/:slug                  → Локальные страницы
/*                              → 404
```

---

## 🎭 Контексты и провайдеры

### Иерархия провайдеров

```typescript
<QueryClientProvider>
  <AuthProvider>
    <CartProvider>
      <TooltipProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </TooltipProvider>
    </CartProvider>
  </AuthProvider>
</QueryClientProvider>
```

### AuthContext
- Управляет аутентификацией
- Отслеживает текущую роль пользователя
- Обрабатывает вход/выход
- Синхронизирует состояние сессии с Supabase

### CartContext
- Управляет товарами в корзине
- Хранит настройки доставки
- Рассчитывает стоимость заказа

### QueryClientProvider (React Query)
- Кэширует данные с сервера
- Автоматически обновляет при изменениях
- Управляет состоянием загрузки/ошибок

### TooltipProvider
- Обеспечивает контекст для всплывающих подсказок Radix UI

### BrowserRouter
- Управляет маршрутизацией
- Работает с React Router v6

---

## 💡 Особенности реализации

### 1. **Ленивая загрузка страниц (Code Splitting)**
```typescript
const Catalog = lazy(() => import("./pages/Catalog"));
const Product = lazy(() => import("./pages/Product"));
// ...
<Suspense fallback={null}>
  <Routes>
    <Route path="/catalog" element={<Catalog />} />
  </Routes>
</Suspense>
```
✅ Улучшает скорость загрузки главной страницы

### 2. **Система ролей с приоритетами**
```typescript
const getPriorityRole = (roles: { role: string }[]): AppRole => {
  if (roles.some(r => r.role === 'admin')) return 'admin';
  if (roles.some(r => r.role === 'seller')) return 'seller';
  return 'buyer';
};
```
✅ Один пользователь может иметь несколько ролей, но используется высшая по приоритету

### 3. **Локальное сохранение черновиков форм**
```typescript
const useDraftState = (key: string, state: T, setState: Function) => {
  // Сохраняет состояние формы в localStorage при изменении
  // Восстанавливает при перезагрузке
};
```
✅ Пользователь не потеряет введенные данные при случайном выходе

### 4. **Row-Level Security (RLS) в БД**
Все таблицы защищены RLS политиками:
- Пользователи видят только свои данные
- Продавцы могут редактировать только свои товары
- Администраторы имеют полный доступ

✅ Безопасность на уровне БД, а не только на фронтенде

### 5. **Оптимистичные обновления UI**
React Query позволяет обновлять UI перед получением ответа сервера

### 6. **Мобильный-первый дизайн**
- Bottom Navigation для мобильных
- Responsive Tailwind классы
- Max-width контейнеры

### 7. **Поддержка локализации (Витебск)**
Роут `/vitebsk/:slug` для локальных страниц, специфичных для Витебской области

### 8. **Meta теги и SEO**
```typescript
<DynamicMeta /> // Автоматически обновляет title, description, og:image
<MetaPageTracker /> // Отслеживает аналитику
```

### 9. **Валидация форм через Zod + React Hook Form**
```typescript
const schema = z.object({
  phone: z.string().regex(/^\+375/),
  email: z.string().email(),
  // ...
});
```

### 10. **Интеграция с Lovable.dev**
- Автоматическое развертывание из GitHub
- Компонентный теггинг (`lovable-tagger`)
- Синхронизация между редактором Lovable и GitHub

---

## ⚠️ Известные проблемы и ошибки

### 1. **Deadlock при первой загрузке ролей**
**Описание:** При получении ролей пользователя может возникнуть deadlock с RLS.

**Решение в коде:**
```typescript
setTimeout(async () => {
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", session.user.id);
}, 0);
```
Используется `setTimeout` для асинхронности.

**Статус:** ⚠️ Требует оптимизации через RPC функции

### 2. **Отсутствие обновленного поля в seller_applications**
**Описание:** Таблица `seller_applications` может не иметь поля `updated_at` в миграции.

**Статус:** ⚠️ Требует проверки и добавления при необходимости

### 3. **Отсутствие индексов для оптимизации запросов**
**Описание:** Нет индексов на часто используемые поля:
- `user_roles(user_id)`
- `products(farmer_id)`
- `orders(buyer_id)`
- `order_items(farmer_id)`

**Рекомендация:**
```sql
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_products_farmer_id ON public.products(farmer_id);
CREATE INDEX idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX idx_order_items_farmer_id ON public.order_items(farmer_id);
```

**Статус:** ⚠️ Требует добавления для оптимизации

### 4. **Нет миграции для добавления ограничений на удаление (ON DELETE CASCADE)**
**Описание:** Некоторые таблицы не имеют явных ограничений на удаление.

**Статус:** ⚠️ Требует проверки целостности данных при удалении

### 5. **Отсутствие обработки ошибок в некоторых компонентах**
**Описание:** Не все компоненты корректно обрабатывают ошибки от API.

**Статус:** ⚠️ Требует добавления Try-Catch и error boundaries

### 6. **Отсутствие аутентификации на некоторых protected routes**
**Описание:** Маршруты `/seller/*` и `/admin/*` могут быть доступны без проверки.

**Решение:** Нужны ProtectedRoute компоненты:
```typescript
function ProtectedRoute({ role, children }) {
  const { user, role: userRole } = useAuth();
  if (!user) return <Navigate to="/auth" />;
  if (userRole !== role && role !== null) return <Navigate to="/" />;
  return children;
}
```

**Статус:** ⚠️ Требует реализации

### 7. **Нет тестов (unit, integration, e2e)**
**Статус:** ⚠️ Требует добавления Vitest/Jest/Playwright

### 8. **Переменные окружения в коде**
**Файл:** `src/integrations/supabase/client.ts`

**Проблема:** SUPABASE_URL и ключи в коде (хотя это нормально для публичных ключей)

**Рекомендация:** Использовать `.env` для дополнительной безопасност��

### 9. **Отсутствие обработки оффлайн режима**
**Статус:** ⚠️ Требует реализации Service Worker

### 10. **Нет документации API**
**Статус:** ⚠️ Требует добавления Swagger/OpenAPI документации для RPC функций

---

## 🚀 Как запустить и разворачивать

### Локальная разработка

#### Требования
- Node.js 18+ или Bun
- npm или Bun пакетный менеджер
- Git

#### Установка

```bash
# 1. Клонировать репозиторий
git clone https://github.com/frantem/git-import-helper-98b92c30.git
cd git-import-helper-98b92c30

# 2. Установить зависимости
npm install
# или
bun install

# 3. Установить переменные окружения
cp .env.example .env
# Отредактировать .env с вашими Supabase ключами

# 4. Запустить dev сервер
npm run dev
# или
bun run dev
```

#### Доступ
- **Frontend:** http://localhost:8080
- **Host:** `::` (IPv6 и IPv4)

### Команды

```bash
# Развитие
npm run dev                    # Запуск dev-сервера с hot-reload

# Сборка
npm run build                  # Production сборка
npm run build:dev              # Development сборка

# Проверка кода
npm run lint                   # Запуск ESLint

# Просмотр собранного приложения
npm run preview                # Локальный просмотр build
```

### Развертывание на Lovable.dev

1. **Подключить GitHub репозиторий** к Lovable.dev
2. **Авторизовать доступ** к репозиторию
3. **Нажать "Share → Publish"** в интерфейсе Lovable
4. Приложение автоматически будет развернуто

### Развертывание на Vercel / Netlify

```bash
# Vercel
vercel

# Netlify
netlify deploy --prod
```

### Переменные окружения (.env)

```dotenv
VITE_SUPABASE_PROJECT_ID="jxklppwhgmndlivvtxdd"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGc..."
VITE_SUPABASE_URL="https://jxklppwhgmndlivvtxdd.supabase.co"
```

⚠️ **Важно:** Используйте только публичные ключи в переменных окружения!

### Миграции базы данных

Все миграции уже применены к Supabase. Для локальной разработки:

```bash
# Синхронизировать локальную БД со схемой из Supabase
supabase link --project-ref jxklppwhgmndlivvtxdd
supabase db pull

# Применить новые миграции
supabase migration list
supabase db push
```

---

## 📊 Статистика проекта

| Метрика | Значение |
|---|---|
| Размер репо | 1450 КБ |
| Основной язык | TypeScript (95.2%) |
| Вспомогательный язык | PLpgSQL (3.7%) |
| Количество таблиц БД | 22 |
| Количество страниц | 30+ |
| Количество компонентов | 50+ |
| RLS политик | 40+ |
| Статус | Активная разработка |
| Дата создания | 26 февраля 2026 г. |

---

## 🎯 Дорожная карта развития

### ✅ Завершено
- [x] Базовая аутентификация
- [x] Система ролей (buyer/seller/admin)
- [x] Каталог товаров
- [x] Корзина и оформление заказов
- [x] Панель продавца
- [x] Панель администратора
- [x] Заявки на продавца
- [x] Интеграция с Supabase

### 🚧 В разработке
- [ ] Улучшение производительности (индексы, оптимизация запросов)
- [ ] Покрытие тестами
- [ ] Оффлайн режим
- [ ] Push-уведомления
- [ ] Интеграция платежей (Stripe/PayPal)

### 📋 Планируется
- [ ] Мобильное приложение (React Native)
- [ ] Email рассылки (SendGrid)
- [ ] СМС уведомления (Twilio)
- [ ] Аналитика и reporting
- [ ] API для третьих сторон (REST/GraphQL)
- [ ] Интеграция с 1С
- [ ] Поддержка нескольких языков

---

## 📞 Контакты и поддержка

- **GitHub:** https://github.com/frantem/git-import-helper-98b92c30
- **Создатель:** @frantem
- **Статус:** Public репозиторий

---

## 📝 Лицензия

Не указана в репозитории. Требует добавления.

---

**Документ сгенерирован:** 15 мая 2026 г.  
**Версия приложения:** 0.0.0  
**Последний коммит:** 3f336b40195dddd0e3d3ea40bb7694f3513b48af
