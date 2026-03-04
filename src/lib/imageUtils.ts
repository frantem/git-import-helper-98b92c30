/**
 * Client-side image compression using Canvas API.
 * Resizes and compresses images before uploading to Supabase Storage.
 */
export async function compressImage(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.82
): Promise<File> {
  // Skip non-image files
  if (!file.type.startsWith("image/")) return file;

  // Skip already small files (< 200 KB)
  if (file.size < 200 * 1024) return file;

  // Skip SVGs — they're vector and can't be rasterized well
  if (file.type === "image/svg+xml") return file;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // If already within limits, just re-encode at target quality
      if (width <= maxWidth && height <= maxHeight && file.size < 500 * 1024) {
        URL.revokeObjectURL(img.src);
        resolve(file);
        return;
      }

      // Calculate new dimensions preserving aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(img.src);
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(img.src);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const compressed = new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          // If compression made it bigger somehow, return original
          resolve(compressed.size < file.size ? compressed : file);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}
