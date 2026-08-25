import { memo } from "react";
import { Link } from "react-router-dom";
import { Star, ChevronRight } from "lucide-react";

export interface SellerContacts {
  phone?: string | null;
  instagram?: string | null;
  telegram?: string | null;
  viber?: string | null;
  whatsapp?: string | null;
}

interface SellerTrustFooterProps {
  name: string;
  sellerSlug: string;
  rating?: number | null;
  reviewCount?: number;
}

/** Футер доверия: отзывы живут на маркетплейсе. */
export const SellerTrustFooter = memo(function SellerTrustFooter({
  name,
  sellerSlug,
  rating,
  reviewCount = 0,
}: SellerTrustFooterProps) {
  return (
    <section className="mb-4">
      <Link
        to={`/seller/${encodeURIComponent(sellerSlug)}/reviews`}
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

      <p className="mt-2 text-[11px] text-muted-foreground">
        {name} — витрина продавца на площадке LOCUS.
      </p>
    </section>
  );
});
