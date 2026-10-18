/**
 * «Своё Подворье Own_Farmstead» → «Своё Подворье».
 *
 * Латиницу в конце убираем только если основа имени русская:
 * иначе «Honey Bird» превратился бы в «Honey».
 */
export function cleanSellerName(raw: string) {
  const trimmed = (raw || "").trim();
  const candidate = trimmed.replace(/\s+[A-Za-z@][A-Za-z0-9_.@]*$/, "");
  return candidate !== trimmed && /[А-Яа-яЁё]/.test(candidate) ? candidate : trimmed;
}
