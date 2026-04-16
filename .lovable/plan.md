
## Plan: Swap price and product name in ProductCard

Swap the order of the price block and the product name in the card's content area (`div.p-2.5`), so the name appears first and the price below it.

### Changes

**`src/components/ProductCard.tsx`** — In the `flex-col p-2.5` container, move the `<h3>` (product name) above the price `<div className="mb-1">` block. Adjust margins accordingly (remove `mb-1` from price div, add it to the name heading).
