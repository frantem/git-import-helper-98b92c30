import { memo } from "react";
import { cdnImage } from "@/lib/imageCdn";

interface SellerAboutProps {
  name: string;
  aboutText?: string | null;
  photoUrl?: string | null;
}

/** Блок «О нас»: человек, история. */
export const SellerAbout = memo(function SellerAbout({
  name,
  aboutText,
  photoUrl,
}: SellerAboutProps) {
  const hasAbout = !!aboutText?.trim();

  if (!hasAbout) return null;

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
        <div className="min-w-0 flex-1">
          <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-foreground">
            {aboutText}
          </p>
        </div>
      </div>
    </section>
  );
});
