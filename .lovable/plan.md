

## Problem

When navigating back from a product page to the homepage, the user lands at the wrong scroll position. Root cause: `allBlockLimit` is stored in React `useState` which resets to `10` on every component mount. When the user presses back, the Index component re-mounts, `allBlockLimit` resets to 10, fewer products render, and the saved scroll position (e.g. 3000px) points to content that no longer exists. The scroll restoration fires before the full list is rendered.

## Fix

Two changes:

### 1. Persist `allBlockLimit` outside the component (module-level variable)
Store the "all" block limit in a module-scoped variable (like `scrollPositions` in the scroll restoration hook) so it survives re-mounts. On back navigation, the same number of products will render immediately.

**File: `src/pages/Index.tsx`**
- Replace `useState(ALL_BLOCK_STEP)` with a module-level `let savedAllBlockLimit = 10`
- Use `useState(savedAllBlockLimit)` as initial value
- Sync the module variable on every limit change

### 2. Delay scroll restoration until content renders
**File: `src/hooks/useScrollRestoration.tsx`**
- Increase the `setTimeout` delay from `0` to `100` for POP navigation to allow the DOM to settle after products render

