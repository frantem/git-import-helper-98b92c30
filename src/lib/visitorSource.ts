const KEY = "locus_visitor_source";

export type VisitorSource = "seller" | "market";

/** Откуда посетитель пришёл: по личной ссылке продавца или с маркетплейса. */
export function getVisitorSource(): VisitorSource | null {
  try {
    const value = sessionStorage.getItem(KEY);
    return value === "seller" || value === "market" ? value : null;
  } catch {
    return null;
  }
}

const listeners = new Set<() => void>();

export function setVisitorSource(source: VisitorSource) {
  try {
    sessionStorage.setItem(KEY, source);
  } catch {
    /* приватный режим — просто не запоминаем */
  }
  listeners.forEach((notify) => notify());
}

export function subscribeVisitorSource(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Источник фиксируется на первом экране визита:
 * вход на /seller/* — трафик продавца, любой другой экран — маркетплейс.
 * Переход на главную или в каталог переключает посетителя в режим маркетплейса.
 */
export function trackVisitorSource(pathname: string) {
  if (pathname === "/" || pathname === "/catalog") {
    setVisitorSource("market");
    return;
  }
  const current = getVisitorSource();
  if (!current) {
    setVisitorSource(pathname.startsWith("/seller/") ? "seller" : "market");
  }
}

/** Нижнее меню показываем только посетителям маркетплейса. */
export function isSellerTraffic() {
  return getVisitorSource() === "seller";
}
