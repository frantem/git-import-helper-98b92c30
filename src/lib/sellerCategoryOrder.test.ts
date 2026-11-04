/// <reference types="node" />
import { describe, it } from "node:test";
import { deepStrictEqual } from "node:assert/strict";
import { compareSellerCategories } from "./sellerCategoryOrder";

describe("personal seller category order", () => {
  it("puts Наборы first regardless of its global sort order", () => {
    const categories = [
      { name: "Сыры", sort: 1 },
      { name: "Наборы", sort: 100 },
      { name: "Хлеб", sort: 0 },
    ];
    deepStrictEqual(categories.sort(compareSellerCategories).map((c) => c.name), [
      "Наборы", "Хлеб", "Сыры",
    ]);
  });

  it("preserves existing ordering when the seller has no sets", () => {
    const categories = [{ name: "Сыры", sort: 5 }, { name: "Хлеб", sort: 2 }];
    deepStrictEqual(categories.sort(compareSellerCategories).map((c) => c.name), ["Хлеб", "Сыры"]);
  });
});