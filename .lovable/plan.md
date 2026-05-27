## Проблема

Текущий `useScrollRestoration` ненадёжен:

1. **POP (назад)**: восстанавливает позицию через `setTimeout(100ms)`. Но списки товаров (`Index`, `Catalog`) грузятся асинхронно — на 100мс высота страницы ещё маленькая, браузер обрезает `scrollTo` до доступного максимума → пользователя кидает в начало.
2. **PUSH (вперёд)**: `window.scrollTo(0, 0)` вызывается в эффекте на маунте. Но `Product`/`Cart` лениво грузятся через `Suspense` + есть нативное `history.scrollRestoration = 'auto'` браузера — браузер сам пытается восстановить старую позицию и побеждает наш `scrollTo`. Поэтому при «Купить сейчас» с середины товара кидает в середину `/cart`.
3. **Хук per-page**: каждая страница инстанцирует свой хук, `prevPathRef` локален. Между размонтированием Index и маунтом Product есть зазор — сохранение позиции теряется.
4. **Кнопка «Главная»**: `Link to="/"` на уже открытой `/` не триггерит навигацию, ничего не происходит.

## Решение

Заменить per-page хук на **единый глобальный** компонент `ScrollManager`, смонтированный один раз внутри `BrowserRouter` в `App.tsx`. Полностью убрать вызовы `useScrollRestoration()` со страниц.

### Что делает `ScrollManager`

1. **Один раз при маунте**: `history.scrollRestoration = 'manual'` — отключает нативное восстановление браузера (главная причина «кидает в середину»).
2. **Хранит позиции** в `Map<historyKey, number>`, ключ — `location.key` (уникален для каждой записи истории, переживает forward/back).
3. **Сохранение позиции**:
   - на каждом `scroll` (throttled через `requestAnimationFrame`) — пишет `window.scrollY` под текущим `location.key`;
   - дополнительно в cleanup эффекта при смене `location.key` — финальный snapshot.
4. **При навигации**:
   - `PUSH` / `REPLACE` → немедленно `window.scrollTo(0, 0)` + повтор в `requestAnimationFrame` (страхует от Suspense-фоллбэка, который меняет высоту);
   - `POP` → берём сохранённую позицию для нового `location.key`. Если её нет — `scrollTo(0,0)`. Если есть — запускаем **polling-loop** через `requestAnimationFrame`, который ждёт пока `document.documentElement.scrollHeight >= saved + window.innerHeight`, и только тогда скроллит. Максимум ~1500мс ожидания, после чего скроллит «как получится».

### Кнопка «Главная» в `BottomNavigation`

В элементе пункта `/` добавить `onClick`: если `location.pathname === '/'` — `window.scrollTo({ top: 0, behavior: 'smooth' })` и `preventDefault`. Поведение «Главная при нахождении на главной — скролл наверх» — стандартный паттерн, не сломает остальное.

## Технические детали

### Файлы

- **создать** `src/components/ScrollManager.tsx` — описанный выше компонент. Без UI, возвращает `null`.
- **`src/App.tsx`** — добавить `<ScrollManager />` сразу под `<BrowserRouter>` (рядом с `MetaPageTracker`).
- **`src/hooks/useScrollRestoration.tsx`** — оставить файл, но превратить функции в no-op (на случай если что-то ещё импортирует), либо удалить вызовы и сам файл.
- **`src/pages/Index.tsx`** — убрать `useScrollRestoration()` и его импорт.
- **`src/pages/Catalog.tsx`** — то же.
- **`src/pages/Product.tsx`** — то же.
- **`src/components/BottomNavigation.tsx`** — добавить `onClick` на пункт «Главная».

### Ключевая логика polling-restore (POP)

```ts
function restoreWithRetry(target: number, deadline = performance.now() + 1500) {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  if (maxScroll >= target || performance.now() > deadline) {
    window.scrollTo(0, Math.min(target, Math.max(0, maxScroll)));
    return;
  }
  // если ещё не доскроллить — пробуем доскроллить до доступного и продолжаем ждать
  if (window.scrollY !== Math.min(target, maxScroll)) {
    window.scrollTo(0, Math.min(target, maxScroll));
  }
  requestAnimationFrame(() => restoreWithRetry(target, deadline));
}
```

Это устраняет «работает через раз» — независимо от того, сколько грузятся товары, как только высота позволяет — позиция восстановится.

### Сохранение «всегда наверх» при PUSH

```ts
window.scrollTo(0, 0);
requestAnimationFrame(() => window.scrollTo(0, 0));
```

Двойной вызов: первый — мгновенно, второй — после того как React отрисует Suspense-фоллбэк или новый контент, перекрывая любые попытки браузера/контента сместить позицию.

### Зачем `history.scrollRestoration = 'manual'`

Без этого Chrome/Safari при `PUSH`/`POP` пытаются восстановить позицию сами, конкурируя с нашим кодом. Это и есть главная причина пункта 2 («кидает в середину `/cart`»). Установка `manual` — стандартное решение для SPA.

## Что НЕ меняем

- Логику Suspense, lazy-роутинг, скелетоны, данные.
- Никаких изменений в Edge-функциях, БД, бизнес-логике.
- Только клиентский скролл-менеджмент + одна `onClick` в нижнем меню.
