/**
 * Client-side image compression using Canvas API.
 * Resizes and compresses images before uploading to Supabase Storage.
 *
 * Supports presets for different image types so each use case (banner, category,
 * product, avatar) gets aggressive but appropriate dimensions and quality.
 */

export type CompressPreset = "banner" | "category" | "product" | "avatar";

interface PresetConfig {
  maxWidth: number;
  maxHeight: number;
  quality: number; // 0..1
  /** Skip files smaller than this (bytes). */
  skipBelow: number;
}

const PRESETS: Record<CompressPreset, PresetConfig> = {
  banner:   { maxWidth: 1200, maxHeight: 600,  quality: 0.7,  skipBelow:  60 * 1024 },
  category: { maxWidth: 200,  maxHeight: 200,  quality: 0.75, skipBelow:  10 * 1024 },
  product:  { maxWidth: 1000, maxHeight: 1000, quality: 0.8,  skipBelow:  50 * 1024 },
  avatar:   { maxWidth: 400,  maxHeight: 400,  quality: 0.8,  skipBelow:  40 * 1024 },
};

/**
 * Compress an image. Two call signatures supported:
 *   compressImage(file, "product")
 *   compressImage(file, 1200, 1200, 0.82)  // legacy
 */
export async function compressImage(
  file: File,
  presetOrMaxWidth?: CompressPreset | number,
  maxHeight = 1200,
  quality = 0.82
): Promise<File> {
  // Resolve config from preset or legacy args
  let cfg: PresetConfig;
  if (typeof presetOrMaxWidth === "string") {
    cfg = PRESETS[presetOrMaxWidth];
  } else {
    cfg = {
      maxWidth: presetOrMaxWidth ?? 1200,
      maxHeight,
      quality,
      skipBelow: 200 * 1024,
    };
  }

  // Skip non-image files
  if (!file.type.startsWith("image/")) return file;

  // Skip already small files
  if (file.size < cfg.skipBelow) return file;

  // Skip SVGs — vector
  if (file.type === "image/svg+xml") return file;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // If already within limits AND not too heavy, just return as-is
      if (width <= cfg.maxWidth && height <= cfg.maxHeight && file.size < cfg.skipBelow * 2) {
        URL.revokeObjectURL(img.src);
        resolve(file);
        return;
      }

      // Calculate new dimensions preserving aspect ratio
      if (width > cfg.maxWidth || height > cfg.maxHeight) {
        const ratio = Math.min(cfg.maxWidth / width, cfg.maxHeight / height);
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
        cfg.quality
      );
    };

    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}
