import { memo } from "react";
import { cdnImage } from "@/lib/imageCdn";
import { SellerContactIcons } from "./SellerContactIcons";
import type { SellerContacts } from "./SellerTrustFooter";

interface SellerAboutProps {
  name: string;
  aboutText?: string | null;
  photoUrl?: string | null;
  contacts?: SellerContacts | null;
}

/** Блок «О нас»: человек, история и контакты-иконки. */
export const SellerAbout = memo(function SellerAbout({
  name,
  aboutText,
  photoUrl,
  contacts,
}: SellerAboutProps) {
  if (!aboutText?.trim() && !contacts) return null;

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
          {aboutText?.trim() && (
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-foreground">
              {aboutText}
            </p>
          )}
          <SellerContactIcons contacts={contacts} />
        </div>
      </div>
    </section>
  );
});
