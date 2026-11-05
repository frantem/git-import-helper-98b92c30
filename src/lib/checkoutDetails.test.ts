/// <reference types="node" />
import { describe, it } from "node:test";
import { deepStrictEqual, strictEqual } from "node:assert/strict";
import { buyerDetailsKey, formatPickupSchedule, getReceivingOptions, mergeBuyerDetails, normalizeCheckoutPhone } from "./checkoutDetails";

describe("checkout uses seller settings", () => {
  it("offers only the receiving methods enabled by the seller", () => {
    deepStrictEqual(getReceivingOptions({ delivery_enabled: false, pickup_enabled: true }), ["self"]);
    deepStrictEqual(getReceivingOptions({ delivery_enabled: true, pickup_enabled: false }), ["courier"]);
    deepStrictEqual(getReceivingOptions(null), []);
    deepStrictEqual(getReceivingOptions({ delivery_enabled: false, pickup_enabled: false }), []);
  });
  it("uses the seller's actual pickup hours, without default hours", () => {
    deepStrictEqual(formatPickupSchedule({ mon: { active: true, start: "10:00", end: "21:00" }, tue: { active: false, start: "09:00", end: "18:00" } }), ["Пн: 10:00–21:00"]);
    deepStrictEqual(formatPickupSchedule(null), []);
  });
});

describe("repeat checkout contacts", () => {
  it("fills empty fields from the signed-in buyer profile", () => {
    deepStrictEqual(mergeBuyerDetails({ name: "", phone: "", address: "" }, { full_name: "Анна", phone: "+375 29 123-45-67", delivery_address: "Витебск, дом 19" }), { name: "Анна", phone: "291234567", address: "Витебск, дом 19" });
  });
  it("keeps the buyer's previously entered details", () => {
    const saved = { name: "Ирина", phone: "331234567", address: "Дом 5" };
    deepStrictEqual(mergeBuyerDetails(saved, { full_name: "Анна", phone: "+375291234567", delivery_address: "Дом 19" }), saved);
  });
  it("separates guest contacts from each registered account", () => {
    strictEqual(buyerDetailsKey(), "locus-checkout-details:guest");
    strictEqual(buyerDetailsKey("buyer-1"), "locus-checkout-details:buyer-1");
  });
  it("normalizes saved full Belarus phone numbers", () => {
    strictEqual(normalizeCheckoutPhone("+375 29 123-45-67"), "291234567");
    strictEqual(normalizeCheckoutPhone("80 29 123-45-67"), "291234567");
  });
});