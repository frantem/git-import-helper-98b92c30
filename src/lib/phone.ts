// Belarusian phone helpers — shared between PhoneAuthForm and SellerApplicationForm.

export const BY_OPERATOR_CODES = ["25", "29", "33", "44"];

export function formatBYPhone(value: string): string {
  const digits = value.replace(/\D/g, "").replace(/^375/, "").slice(0, 9);
  if (digits.length === 0) return "+375";
  if (digits.length <= 2) return `+375 (${digits}`;
  if (digits.length <= 5) return `+375 (${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 7) return `+375 (${digits.slice(0, 2)}) ${digits.slice(2, 5)}-${digits.slice(5)}`;
  return `+375 (${digits.slice(0, 2)}) ${digits.slice(2, 5)}-${digits.slice(5, 7)}-${digits.slice(7, 9)}`;
}

export function isValidBYPhone(formatted: string): boolean {
  const digits = formatted.replace(/\D/g, "");
  if (digits.length !== 12 || !digits.startsWith("375")) return false;
  return BY_OPERATOR_CODES.includes(digits.substring(3, 5));
}
