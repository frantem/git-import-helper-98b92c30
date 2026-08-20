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
    <div className="relative h-[220px] w-[80%] flex-shrink-0 snap-start overflow-hidden rounded-2xl bg-brand-deep md:h-[260px] md:w-auto">
      {promo.image_url && (
        <img
          src={cdnImage(promo.image_url, "detail")}
          alt={promo.title}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />
      <div className="relative flex h-full flex-col justify-end p-4">
        <h3 className="font-serif text-lg font-bold text-white">{promo.title}</h3>
        {promo.description && (
          <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[13px] leading-relaxed text-white/80">
            {promo.description}
          </p>
        )}
        {promo.link_url && (
          <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-[#faf5ea] px-4 py-1.5 text-xs font-medium text-foreground">
            Смотреть <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </div>
  );
}

/** Третий блок: акции и наборы продавца. */
export const SellerPromos = memo(function SellerPromos({ promos }: SellerPromosProps) {
  if (promos.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-3 font-serif text-lg font-bold text-foreground md:text-2xl">
        Акции и наборы
      </h2>

      <div className="-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-1 scrollbar-hide md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
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
