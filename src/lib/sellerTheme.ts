import type { CSSProperties } from "react";

/**
 * Цветовая тема витрины продавца.
 *
 * В `farmers.theme` хранится либо HEX-цвет бренда («#2F5D45»), либо — для
 * совместимости со старыми магазинами — имя пресета (`forest`, `terracotta`,
 * `night`, `sand`). Пресеты рисует CSS-класс `.seller-theme-*`, свободный
 * HEX-цвет мы раскладываем в HSL и вешаем инлайн-стилем.
 */

export interface BrandPreset {
  hex: string;
  label: string;
  hint: string;
}

/** Готовые проверенные стили онбординга и редактора оформления. */
export const BRAND_PRESETS: BrandPreset[] = [
  { hex: "#1A1A1A", label: "Чёрный", hint: "Минимализм — идеален для одежды" },
  { hex: "#B4553A", label: "Терракота", hint: "Тёплый крафт" },
  { hex: "#2F5D45", label: "Шалфей", hint: "Натуральный лес" },
  { hex: "#243A56", label: "Cиний", hint: "Спокойный премиум" },
];

/** Старые значения `theme` → их HEX-эквивалент для редактора оформления. */
export const LEGACY_THEME_HEX: Record<string, string> = {
  forest: "#2F5D45",
  terracotta: "#B4553A",
  night: "#243A56",
  sand: "#C2A878",
};

const LEGACY_THEMES = ["forest", "terracotta", "night", "sand"] as const;

export function isLegacyTheme(value: string | null | undefined): boolean {
  return !!value && (LEGACY_THEMES as readonly string[]).includes(value);
}

/** true, если значение — валидный HEX-цвет (с `#` или без, 3 или 6 цифр). */
export function isHexColor(value: string | null | undefined): value is string {
  if (!value) return false;
  return /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

function hexToRgb(hex: string): [number, number, number] | null {
  let value = hex.trim().replace(/^#/, "");
  if (value.length === 3) value = value.split("").map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/i.test(value)) return null;
  const num = parseInt(value, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Светлый фон → тёмный текст, тёмный фон → белый. */
export function isLightColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  return relativeLuminance(rgb[0], rgb[1], rgb[2]) > 0.5;
}

/** Приводит значение `theme` к HEX для редактора оформления. */
export function themeToHex(theme: string | null | undefined): string {
  if (!theme) return "#2F5D45";
  if (LEGACY_THEME_HEX[theme]) return LEGACY_THEME_HEX[theme];
  if (isHexColor(theme)) return theme;
  return "#2F5D45";
}

/**
 * Инлайн-стиль с HSL-переменными для свободного HEX-цвета бренда.
 * Для имён пресетов возвращает пустой объект — их рисует `.seller-theme-*`.
 */
export function sellerThemeStyle(theme: string | null | undefined): CSSProperties {
  if (!isHexColor(theme)) return {};
  const rgb = hexToRgb(theme);
  if (!rgb) return {};
  const [h, s, l] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
  const foreground = isLightColor(theme) ? "0 0% 8%" : "0 0% 100%";
  return {
    "--seller-deep": `${h} ${s}% ${l}%`,
    "--seller-deep-foreground": foreground,
    "--seller-accent": `${h} ${s}% ${l}%`,
    "--seller-accent-foreground": foreground,
  } as CSSProperties;
}
