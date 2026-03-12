

## Problem
All image uploads (product images, banners, avatars, seller avatars, site assets) go to Supabase Storage raw — no compression, no resizing. A photo from a phone camera can easily be 5-10 MB. On mobile internet this kills loading speed.

## Solution
Create a shared `compressImage()` utility that resizes and compresses images client-side before uploading to Supabase Storage. Apply it in all 5 upload locations.

## Technical Details

### 1. New utility: `src/lib/imageUtils.ts`
A `compressImage(file: File, options?)` function that:
- Uses `<canvas>` to resize the image to a max dimension (e.g., 1200px for products/banners, 400px for avatars)
- Outputs JPEG at 0.8 quality (or WebP if browser supports it)
- Returns a `File` object ready for upload
- Handles edge cases (already small files, non-image files)

```ts
export async function compressImage(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.82
): Promise<File> {
  // Load into Image → draw on canvas at reduced size → toBlob as JPEG
}
```

### 2. Apply compression in all upload handlers

**5 files to update** (one line change each — wrap file in `await compressImage(file)` before `.upload()`):

- `src/pages/seller/SellerProducts.tsx` — product images (maxWidth=1200)
- `src/pages/admin/AdminBanners.tsx` — banner images (maxWidth=1920)
- `src/pages/Settings.tsx` — user avatars (maxWidth=400)
- `src/pages/seller/SellerSettings.tsx` — farmer avatars (maxWidth=400)
- `src/pages/admin/AdminSettings.tsx` — favicon/OG images (maxWidth=1200)

### Result
- 10 MB photo → ~100-200 KB compressed JPEG
- No external dependencies needed (native Canvas API)
- Existing images won't be affected (only new uploads)

