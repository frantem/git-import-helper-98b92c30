/// <reference types="node" />
import { it } from "node:test";
import { strictEqual } from "node:assert/strict";
import { hasRequiredFoodDetails, optionalNutrition } from "./productFoodDetails";

it("allows food details without any nutrition values", () => {
  strictEqual(hasRequiredFoodDetails({ composition: "Мука, яйца", shelf_life: "3 дня" }), true);
  for (const value of ["", " ", null, undefined]) strictEqual(optionalNutrition(value), null);
});
it("preserves partial nutrition and explicit zero", () => {
  strictEqual(optionalNutrition("8,5"), 8.5);
  strictEqual(optionalNutrition(0), 0);
  strictEqual(optionalNutrition(""), null);
});
it("keeps composition and shelf life required", () => {
  strictEqual(hasRequiredFoodDetails({ composition: "", shelf_life: "3 дня" }), false);
  strictEqual(hasRequiredFoodDetails({ composition: "Мука", shelf_life: " " }), false);
});