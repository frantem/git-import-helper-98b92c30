

## Plan: Round cart button overlapping content area

Move the "В корзину" button out of the image container and make it a circle that sits at the boundary between the image and the text area, offset so ~20% overlaps onto the white part.

### Changes

**`src/components/ProductCard.tsx`**

1. Remove the cart button from inside the image `div` (line 111-116).
2. Place it as a direct child of the outer `<Link>` wrapper, positioned absolutely at the right side, at the boundary between image and text areas.
3. Change classes:
   - From: `absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-tl-2xl text-primary-foreground transition-colors active:scale-95 bg-[#9ddc09]`
   - To: `absolute right-3 flex h-10 w-10 items-center justify-center rounded-full text-primary-foreground transition-colors active:scale-95 bg-[#9ddc09] z-10 shadow-md`
   - Position vertically using a style like `bottom` of the image area minus ~20% of button height, or use CSS: place the button so its top edge aligns near the bottom of the `aspect-square` container with a small downward offset. Since the image is `aspect-square`, we can use a calc or simply position it relative to the card with a `top` value that puts it at ~46% from top (so the button center is at the image/text boundary, with 20% below). A simpler approach: keep it `absolute` on the card, set `top: calc(100% / (1 + textRatio))` — but the simplest is to use `bottom` on the image div but shift it down with a negative bottom or use `translate-y`.

**Simplest approach**: Keep button inside the image container but use `-bottom-2` (negative positioning) + `rounded-full` + `right-3` + `z-10` + `shadow-md`. The `-bottom-2` (~8px, about 20% of 40px button) will push it below the image boundary into the white area.

Final className: `absolute -bottom-2 right-3 flex h-10 w-10 items-center justify-center rounded-full text-primary-foreground transition-colors active:scale-95 bg-[#9ddc09] z-10 shadow-md`

