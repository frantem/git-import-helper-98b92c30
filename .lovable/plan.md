## Проблема

Письмо `send-review-request` попадает в спам: subject с эмоцией, нет plain-text альтернативы, нет `Reply-To` и `List-Unsubscribe`, много цветных ссылок и рекламный тон.

## Что сделать

Только правки в `supabase/functions/send-review-request/index.ts` (дублирование в Telegram админу НЕ делаем):

- Subject: `Ваш заказ на LocusFood — как всё прошло?` (нейтральный, без «Спасибо!»).
- Добавить скрытый preheader.
- Полноценный `<!DOCTYPE html>` с `<head>`, `lang="ru"`, viewport.
- Добавить plain-text версию (`text`) с теми же ссылками — сильно снижает spam score.
- В теле POST к Resend добавить:
  - `reply_to: "info@locusfood.by"`
  - `headers: { "List-Unsubscribe": "<mailto:info@locusfood.by?subject=unsubscribe>, <https://locusfood.by/settings>", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }`
- Убрать зелёный `#22c55e` у ссылок → нейтральный `#1a1a1a` с подчёркиванием.
- Сократить контактный блок (убрать Telegram/Viber, оставить телефон + предложение ответить на письмо → повышает engagement).
- В футер добавить: «Вы получили это письмо, потому что оформили заказ на locusfood.by. Отписаться: info@locusfood.by».

Задеплоить `send-review-request`. Никаких изменений в других функциях, конфиге, БД или клиенте.
