import { describe, expect, it } from "bun:test";
import { compareSellerCategories } from "./sellerCategoryOrder";

describe("personal seller category order", () => {
  it("puts Наборы first regardless of its global sort order", () => {
    const categories = [
      { name: "Сыры", sort: 1 },
      { name: "Наборы", sort: 100 },
      { name: "Хлеб", sort: 0 },
    ];
    expect(categories.sort(compareSellerCategories).map((c) => c.name)).toEqual([
      "Наборы", "Хлеб", "Сыры",
    ]);
  });

  it("preserves existing ordering when the seller has no sets", () => {
    const categories = [{ name: "Сыры", sort: 5 }, { name: "Хлеб", sort: 2 }];
    expect(categories.sort(compareSellerCategories).map((c) => c.name)).toEqual(["Хлеб", "Сыры"]);
  });
});