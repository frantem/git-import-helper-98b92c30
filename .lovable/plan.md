

## Plan: Fix cart button z-index and position

### Problem
The cart button is clipped/hidden behind the white content area, and needs to be moved closer to the right edge.

### Changes

**`src/components/ProductCard.tsx`**

1. Move the cart button from inside the image `div` to be a direct child of the outer `<Link>` wrapper — this ensures it's not clipped by `overflow-hidden` on the image container.
2. Position it at the image/content boundary: use `top-[calc(50vw-8px)]` or simpler — calculate based on aspect-square. Since the image is `aspect-square`, the button should sit at the bottom of that square. Use `style={{ top: 'calc(50% - ...)'}}` — actually simplest: keep absolute positioning on the `<Link>`, place at the boundary using a percentage or by setting `bottom` relative to the content area height. 

**Simplest fix**: The image div has `overflow-hidden` which clips the button. Two changes:
1. Remove `overflow-hidden` from the image div — but that would show the scaled image on hover. Instead, move the button outside the image div.
2. Place button as sibling after the image div, absolutely positioned on the card with `z-50`, `right-2`, and vertically at the image/content boundary.

Since the image is `aspect-square` and the card is a flex column, the image takes up a square portion. The button needs to sit at that boundary. We can position it with `top` equal to the aspect-square height minus half the button. But since aspect-square is responsive, we need: the image div's bottom edge. 

**Approach**: Move the button out of the image container to be a direct child of the `<Link>`. Set `z-50` and position with CSS to sit at the image boundary right side.

- className: `absolute right-2 z-50 flex h-10 w-10 items-center justify-center rounded-full text-primary-foreground transition-colors active:scale-95 bg-[#9ddc09] shadow-md`
- Add inline style: `style={{ top: 'calc(100vw / 2 - 12px)' }}` — no, that won't work for grid layouts.

**Better approach**: Use a wrapper div around the image with `relative` and NO `overflow-hidden`, then put the button there. Or simply change the image div from `overflow-hidden` to `overflow-visible` and increase the card's z-stacking.

**Actually the simplest**: Just move the button outside the image `div.overflow-hidden` to be a direct child of the `<Link>` (which already has `relative`), and position it so it aligns at the bottom of the aspect-square image area. We can wrap both the image area and button in a relative div without overflow-hidden on the outer wrapper.

**Final approach** (minimal change):
1. Move button out of the `div.aspect-square.overflow-hidden` to be placed right after it, as a child of the `<Link>`.
2. Use negative margin-top (`-mt-5`) on a wrapper, or use absolute positioning on the `<Link>` with the right offset.
3. className: `absolute right-2 z-50 flex h-10 w-10 items-center justify-center rounded-full text-primary-foreground transition-colors active:scale-95 bg-[#9ddc09] shadow-md` with a `style` to position vertically at the image boundary. Since the card structure is flex-col with aspect-square image, we can approximate: the button should be near where the image ends. Use a CSS approach: place a relative wrapper around image + button with `overflow-visible`.

Let me just look at the actual current structure to be precise.

The image container div has `overflow-hidden`. The button is inside it with `-bottom-2`. The overflow-hidden clips the part that goes below. That's the bug.

**Fix**: Move button outside the image div. Place it between image div and content div, using relative positioning (negative margin-top) or absolute on the Link.

