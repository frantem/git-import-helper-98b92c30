import { memo } from "react";
import { cdnImage } from "@/lib/imageCdn";

interface SellerAboutProps {
  name: string;
  aboutText?: string | null;
  photoUrl?: string | null;
}

/** Блок «О нас»: только человек и история, без товаров. */
export const SellerAbout = memo(function SellerAbout({ name, aboutText, photoUrl }: SellerAboutProps) {
  if (!aboutText?.trim()) return null;

  return (
    <section className="mb-6">
      <div className="flex items-start gap-3 rounded-2xl bg-card p-4">
        {photoUrl && (
          <img
            src={cdnImage(photoUrl, "thumb")}
            alt={name}
            loading="lazy"
            decoding="async"
            className="h-16 w-16 flex-shrink-0 rounded-full object-cover"
          />
        )}
        <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-foreground">
          {aboutText}
        </p>
      </div>
    </section>
  );
});
