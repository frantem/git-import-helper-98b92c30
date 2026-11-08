export function hasRequiredFoodDetails(details: { composition: string; shelf_life: string }): boolean {
  return Boolean(details.composition.trim() && details.shelf_life.trim());
}

export function optionalNutrition(value: string | number | null | undefined): number | null {
  if (value == null || String(value).trim() === "") return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}