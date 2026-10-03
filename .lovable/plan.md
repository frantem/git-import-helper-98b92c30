Заменить картинку на видео в блоке «Более 40 продавцов уже сделали себе сайт» на странице /for-sellers.

- Вместо скриншота показывать уже загруженное видео страницы «Княжеское подворье» (public/media/knyazhetsky-page.mp4).
- Видео играет само, без звука, по кругу, на телефонах тоже (autoplay, muted, loop, playsInline).
- Скриншот остаётся обложкой (poster), пока видео грузится.
- Рамка, размеры и подпись под видео не меняются.

Технически: в src/pages/ForSellers.tsx `<img>` (строка ~261) заменить на `<video src="/media/knyazhetsky-page.mp4" poster={sellerPageScreenshot} autoPlay muted loop playsInline preload="metadata">` с теми же классами.
