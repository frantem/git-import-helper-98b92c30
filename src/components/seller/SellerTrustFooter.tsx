import { memo } from "react";
import { Link } from "react-router-dom";
import { Star, ChevronRight, Phone, Instagram, Send } from "lucide-react";

export interface SellerContacts {
  phone?: string | null;
  instagram?: string | null;
  telegram?: string | null;
}

interface SellerTrustFooterProps {
  name: string;
  sellerSlug: string;
  rating?: number | null;
  reviewCount?: number;
  contacts?: SellerContacts | null;
}

function normalizeUrl(value: string, base: string) {
  if (value.startsWith("http")) return value;
  return base + value.replace(/^@/, "");
}

/** Футер доверия: отзывы живут на маркетплейсе + контакты продавца. */
export const SellerTrustFooter = memo(function SellerTrustFooter({
  name,
  sellerSlug,
  rating,
  reviewCount = 0,
  contacts,
}: SellerTrustFooterProps) {
  const hasContacts = !!(contacts?.phone || contacts?.instagram || contacts?.telegram);

  return (
    <section className="mb-4">
      <Link
        to={`/catalog?seller=${encodeURIComponent(sellerSlug)}`}
        className="flex items-center gap-3 rounded-2xl bg-[hsl(var(--seller-deep))] p-4 text-primary-foreground"
      >
        <Star className="h-5 w-5 flex-shrink-0 fill-accent text-accent" />
        <div className="flex-1">
          <p className="text-[14px] font-medium">Все отзывы о нас — на площадке LOCUS</p>
          {rating != null && reviewCount > 0 && (
            <p className="mt-0.5 text-[12px] opacity-80">
              {rating.toFixed(1)} · {reviewCount} отзывов покупателей
            </p>
          )}
        </div>
        <ChevronRight className="h-5 w-5 flex-shrink-0" />
      </Link>

      {hasContacts && (
        <div className="mt-3 flex flex-wrap gap-2">
          {contacts?.phone && (
            <a
              href={`tel:${contacts.phone.replace(/[^\d+]/g, "")}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-card px-4 py-2 text-[13px] font-medium text-foreground"
            >
              <Phone className="h-4 w-4" /> {contacts.phone}
            </a>
          )}
          {contacts?.instagram && (
            <a
              href={normalizeUrl(contacts.instagram, "https://instagram.com/")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-card px-4 py-2 text-[13px] font-medium text-foreground"
            >
              <Instagram className="h-4 w-4" /> Instagram
            </a>
          )}
          {contacts?.telegram && (
            <a
              href={normalizeUrl(contacts.telegram, "https://t.me/")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-card px-4 py-2 text-[13px] font-medium text-foreground"
            >
              <Send className="h-4 w-4" /> Telegram
            </a>
          )}
        </div>
      )}

      <p className="mt-2 text-[11px] text-muted-foreground">
        {name} — витрина продавца на площадке LOCUS.
      </p>
    </section>
  );
});
