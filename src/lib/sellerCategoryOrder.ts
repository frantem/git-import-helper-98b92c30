interface SellerCategoryOrder {
  name: string;
  sort: number;
}

/** Only personal storefronts prioritize sets; global category ordering stays unchanged. */
export function compareSellerCategories(a: SellerCategoryOrder, b: SellerCategoryOrder): number {
  const aIsSet = a.name.trim().toLocaleLowerCase("ru") === "наборы";
  const bIsSet = b.name.trim().toLocaleLowerCase("ru") === "наборы";
  if (aIsSet !== bIsSet) return aIsSet ? -1 : 1;
  return a.sort - b.sort;
}