/**
 * Готовые фоны для сторис. Пока — CSS-градиенты-плейсхолдеры.
 * Чтобы заменить на картинки: положите файлы в src/assets/story-backgrounds/,
 * импортируйте их и укажите `image` вместо `css`.
 */
export interface StoryBackground {
  id: string;
  label: string;
  /** URL изображения (приоритетнее css) */
  image?: string;
  /** CSS background (градиент) */
  css?: string;
}

export const STORY_BACKGROUNDS: StoryBackground[] = [
  { id: "cocoa", label: "Какао", css: "linear-gradient(160deg, #6b4130 0%, #4a2b1f 55%, #3a2118 100%)" },
  { id: "forest", label: "Лес", css: "linear-gradient(160deg, #2f5d45 0%, #234835 55%, #172f23 100%)" },
  { id: "cream", label: "Сливки", css: "linear-gradient(160deg, #f6ecd9 0%, #e9d9bd 60%, #d9c4a0 100%)" },
  { id: "olive", label: "Олива", css: "linear-gradient(160deg, #8a9a4a 0%, #647336 55%, #46522a 100%)" },
  { id: "terracotta", label: "Терракота", css: "linear-gradient(160deg, #c8734f 0%, #a95a3b 55%, #7d3f29 100%)" },
  { id: "slate", label: "Графит", css: "linear-gradient(160deg, #4b4f55 0%, #2f3338 55%, #1f2226 100%)" },
];

/** Тёмный ли фон — влияет на цвет заголовка/плашки */
export function isLightBackground(bg: StoryBackground): boolean {
  return bg.id === "cream";
}
