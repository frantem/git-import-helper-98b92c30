import { memo } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { cdnImage } from "@/lib/imageCdn";
import type { SellerPromo } from "@/hooks/useSellerPage";

interface SellerPromosProps {
  promos: SellerPromo[];
}

function PromoCard({ promo }: { promo: SellerPromo }) {
  return (
    <div className="flex w-[45%] max-w-[190px] flex-shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-card shadow-sm md:w-auto md:max-w-none">
      <div className="aspect-square overflow-hidden bg-secondary">
        {promo.image_url && (
          <img
            src={cdnImage(promo.image_url, "card")}
            alt={promo.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col p-2">
        <h3 className="line-clamp-2 text-[13px] font-medium leading-tight text-foreground">
          {promo.title}
        </h3>
        {promo.description && (
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
            {promo.description}
          </p>
        )}
        {promo.link_url && (
          <span className="mt-2 inline-flex items-center justify-center gap-1 rounded-xl bg-[hsl(var(--seller-deep))] py-2 text-[13px] font-medium text-primary-foreground">
            Смотреть <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </div>
  );
}

/** Акции и наборы: карточки того же размера, что товарные. */
export const SellerPromos = memo(function SellerPromos({ promos }: SellerPromosProps) {
  if (promos.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-3 font-serif text-lg font-bold text-foreground md:text-2xl">
        Акции и наборы
      </h2>

      <div className="-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-1 scrollbar-hide md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
        {promos.map((promo) =>
          promo.link_url ? (
            promo.link_url.startsWith("http") ? (
              <a
                key={promo.id}
                href={promo.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="contents"
              >
                <PromoCard promo={promo} />
              </a>
            ) : (
              <Link key={promo.id} to={promo.link_url} className="contents">
                <PromoCard promo={promo} />
              </Link>
            )
          ) : (
            <PromoCard key={promo.id} promo={promo} />
          )
        )}
      </div>
    </section>
  );
});
