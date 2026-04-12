
## План: Оптимизация сайта — удаление неиспользуемого кода

### Что удаляется

**Неиспользуемые UI-компоненты (17 файлов):**
Эти компоненты не импортируются нигде в проекте (кроме друг друга):
- `accordion.tsx`, `aspect-ratio.tsx`, `breadcrumb.tsx`, `chart.tsx`
- `collapsible.tsx`, `command.tsx`, `context-menu.tsx`, `drawer.tsx`
- `hover-card.tsx`, `input-otp.tsx`, `menubar.tsx`, `navigation-menu.tsx`
- `pagination.tsx`, `resizable.tsx`, `slider.tsx`
- `toggle.tsx`, `toggle-group.tsx`
- `sidebar.tsx` (используется только внутри себя, в проекте не применяется)
- `form.tsx`, `table.tsx`, `scroll-area.tsx`, `progress.tsx`, `sheet.tsx` — используются **только** внутри `sidebar.tsx`, который сам не используется. Но `sheet.tsx` используется в sidebar — нужно проверить точнее.

Уточнение: `sheet.tsx` и другие зависимости `sidebar.tsx` — sidebar не используется нигде в проекте, но `sheet`, `table`, `form`, `scroll-area`, `progress` нужно проверить отдельно.

**Дополнительная проверка показала:**
- `form.tsx`, `table.tsx`, `scroll-area.tsx`, `progress.tsx`, `sheet.tsx` — используются только в `sidebar.tsx`, который сам не используется → можно удалить все вместе с sidebar

**Неиспользуемая страница:**
- `src/pages/admin/AdminCategories.tsx` — перенаправляет на главную, категории управляются через `/admin/blocks`
- Удалить маршрут `/admin/categories` и импорт из `App.tsx`

### Что остаётся без изменений
- Все используемые компоненты (button, input, dialog, select, checkbox, switch, tabs, alert-dialog, carousel, calendar, popover, radio-group, badge, card, separator, skeleton, sonner, toast, toaster, textarea, tooltip, avatar, label, dropdown-menu, byn-symbol, optimized-image)
- `src/data/products.ts` — используется как тип в CartContext, ProductCard, Favorites
- `DynamicMeta.tsx` — загружает favicon/OG из Supabase

### Изменения

| Действие | Файлы |
|----------|-------|
| Удалить 22 неиспользуемых UI-компонента | `accordion`, `aspect-ratio`, `breadcrumb`, `chart`, `collapsible`, `command`, `context-menu`, `drawer`, `hover-card`, `input-otp`, `menubar`, `navigation-menu`, `pagination`, `resizable`, `slider`, `toggle`, `toggle-group`, `sidebar`, `form`, `table`, `scroll-area`, `progress`, `sheet` |
| Удалить страницу | `src/pages/admin/AdminCategories.tsx` |
| Обновить App.tsx | Убрать импорт и маршрут AdminCategories |

~23 файла удалено, 1 файл отредактирован. Функциональность сайта не затрагивается.
