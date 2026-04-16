

## План: Скидка в левом нижнем углу со скруглением только справа

### Изменение

**`src/components/ProductCard.tsx`**, строка 106:

Заменить классы значка скидки — убрать отступ `left-1.5 bottom-1.5`, прижать к углу (`left-0 bottom-0`), скруглить только правую сторону (`rounded-r-md rounded-l-none`).

```
// Было:
"absolute left-1.5 bottom-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-[#ea3939] bg-[#fce9e9]"

// Станет:
"absolute left-0 bottom-0 rounded-tr-lg px-1.5 py-0.5 text-[10px] font-bold text-[#ea3939] bg-[#fce9e9]"
```

Скруглён только правый верхний угол (`rounded-tr-lg`), прижат к левому нижнему углу фото.

