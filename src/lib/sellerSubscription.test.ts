/// <reference types="node" />
import { it } from "node:test";
import { strictEqual, deepStrictEqual } from "node:assert/strict";
import { SELLER_SUBSCRIPTION, subscriptionAmount, sellerFeatureAccess } from "./sellerSubscription";

it("provides 30 trial days", () => strictEqual(SELLER_SUBSCRIPTION.trialDays, 30));
it("charges 14.90 BYN for one month", () => strictEqual(subscriptionAmount(1), 1490));
it("charges 9.90 BYN per month for six months", () => {
  strictEqual(subscriptionAmount(6), 5940);
  strictEqual(subscriptionAmount(6) / 6, 990);
});
it("has zero commission", () => strictEqual(SELLER_SUBSCRIPTION.commissionPercent, 0));
it("does not lock seller contacts or clients", () => {
  deepStrictEqual(sellerFeatureAccess(), { canUseClients: true, canShowContacts: true });
});