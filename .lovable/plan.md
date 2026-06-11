# Надёжное восстановление скролла при «Назад»

## Проблема

Сейчас при переходе с главной/каталога в карточку товара и обратно скролл сбрасывается в начало или попадает «не туда». Причины в текущей реализации `src/components/ScrollManager.tsx`:

1. **Жёсткий дедлайн 1.5 с.** Если ленивый чанк страницы (`Catalog` и др. через `React.lazy`) загружается дольше, или данные/изображения подтягиваются медленнее — `restoreWithRetry` сдаётся и оставляет страницу на 0 или на промежуточной высоте.
2. **Suspense fallback={null}.** Во время загрузки чанка страница пуста (высота 0), поэтому даже сохранённая позиция «недостижима» до тех пор, пока контент не отрисуется. Браузер при этом успевает показать прыжок.
3. **Позиции хранятся только в памяти** (`Map`). Любая перезагрузка чанка/ошибка/обновление страницы — и позиции потеряны.
4. **Нет хука на рост высоты документа.** Используется rAF-поллинг, который заканчивается по таймеру, а не по факту, что контент дорисовался.
5. **На главной** `savedAllBlockLimit` сохраняет число карточек — хорошо. На `/catalog` и `/vitebsk/:slug` ничего подобного нет, но они и так показывают весь список, поэтому проблема в основном по пунктам 1–4.

## Решение

Полностью переписать `ScrollManager` так, чтобы восстановление было детерминированным:

### 1. Хранилище позиций — `sessionStorage`
- Сохранять `{ [historyKey]: scrollY }` в `sessionStorage` под ключом `locus:scroll`.
- Писать на каждом изменении скролла (rAF-throttle) и обязательно перед сменой маршрута.
- Это переживёт перезагрузку чанка, ошибку Suspense, hard-reload.

### 2. Резервирование высоты до отрисовки
- При POP-навигации, сразу после смены `location.key`, выставлять `document.documentElement.style.minHeight = (savedScroll + innerHeight) + 'px'`.
- Это позволяет немедленно вызвать `window.scrollTo(0, savedScroll)` ещё до того, как ленивый чанк отрисует контент — браузер не «прыгнет» в 0.
- `minHeight` снимается, как только реальная высота документа превысит цель (через `ResizeObserver`), либо по финальному таймауту.

### 3. `ResizeObserver` вместо таймера
- Подписываемся на `ResizeObserver(document.body)`.
- На каждое изменение высоты: если `scrollY !== target` и `maxScroll >= target` — `scrollTo(target)` и снимаем резерв высоты.
- Финальный safety-таймер 8 секунд (вместо 1.5 с), после которого наблюдатель отключается.

### 4. Корректная фиксация позиции при клике на карточку
- Сейчас позиция сохраняется в эффекте смены маршрута, но между `click` и сменой `location.key` может проскочить лишний `scroll`-евент. Дополнительно вешаем `pagehide`/`beforeunload` и перехват кликов по `<a>` (через делегирование на `window` с `capture`) — на самом старте навигации делаем синхронный snapshot.

### 5. На главной — оставляем `savedAllBlockLimit`
Уже работает, ничего не трогаем. Список рендерится сразу с прежним размером → высота восстанавливается мгновенно.

### 6. На `/catalog`, `/vitebsk/:slug`, `/favorites` и пр.
Дополнительных изменений не требуется: данные кэшируются React Query, при возврате список отрисовывается одним кадром после распаковки чанка, а резерв `minHeight` страхует промежуток.

### 7. Native scroll restoration
Оставляем `history.scrollRestoration = 'manual'` (уже стоит).

## Технические детали

Файлы:

- `src/components/ScrollManager.tsx` — полная переработка по схеме выше.
- `src/pages/Index.tsx` — без изменений (логика `savedAllBlockLimit` уже корректна).
- Опционально: убрать `src/hooks/useScrollRestoration.tsx` (уже no-op), оставлю как есть, чтобы не плодить лишних правок.

Псевдо-API нового `ScrollManager`:

```text
on mount:
  history.scrollRestoration = 'manual'
  load positions from sessionStorage

on scroll (rAF):
  positions[currentKey] = scrollY
  persist to sessionStorage (debounced 200 ms)

on click capture (a[href] internal) / pagehide:
  positions[currentKey] = scrollY  (sync)

on location.key change:
  snapshot prev key scroll
  if navigationType === POP and savedScroll > 0:
    documentElement.style.minHeight = savedScroll + innerHeight + 'px'
    scrollTo(0, savedScroll)
    observe body resize → when reachable, scrollTo(target), clear minHeight
    safety timeout 8 s → disconnect observer, clear minHeight
  else:
    scrollTo(0, 0)
```

## Что получит пользователь

- На «Назад» из карточки товара страница открывается ровно на той же позиции, где была карточка — без видимых прыжков.
- Работает на медленном интернете (ленивый чанк до 8 с).
- Переживает обновление страницы в той же вкладке (sessionStorage).
- Не меняет внешний вид и поведение других экранов.
