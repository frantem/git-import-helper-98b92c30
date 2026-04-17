
The cart button on product cards uses `z-50`, which makes it stack above other page elements like the sticky header search bar. It should only be on top within the card, not above the entire page.

The header is `sticky top-0 z-50`. The card button shouldn't compete with that.

### Fix
**`src/components/ProductCard.tsx`** — change the cart button's `z-50` to `z-10`. This keeps it above the card's own layers (image, badges, content) but below the sticky header (`z-50`).
