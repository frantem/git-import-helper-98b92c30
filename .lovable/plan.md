

## Problem
There's a variable shadowing bug in `Checkout.tsx`. Two `sellerTimesMap` variables exist:
- **Line 335**: `let sellerTimesMap = {}` — outer scope, stays empty
- **Line 348**: `const sellerTimesMap = {}` — inner scope inside `if (deliveryType === "self")`, gets populated with per-seller times but is discarded when the block ends

At line 430, the **outer empty** `sellerTimesMap` is sent to the edge function, so every seller falls back to the combined `estimated_delivery_time` string.

## Fix
**`src/pages/Checkout.tsx`** — Remove the inner `const` declaration at line 348. Just reuse the outer variable:

```
// Line 348: change from
const sellerTimesMap: Record<string, string> = {};
// to (just remove the line — use the outer sellerTimesMap declared at line 335)
```

One line fix. The rest of the code (lines 363, 430) already works correctly with the outer variable.

