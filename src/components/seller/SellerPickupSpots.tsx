import { MapPin } from "lucide-react";

interface SellerPickupSpotsProps {
  lines: string[];
  city?: string | null;
}

/**
 * «Примерить в магазинах» — редакционный блок без плашек:
 * тонкая линия сверху, крупный заголовок, адреса обычным списком.
 */
export function SellerPickupSpots({ lines, city }: SellerPickupSpotsProps) {
  if (lines.length === 0) return null;

  return (
    <section className="mt-8 border-t border-neutral-200 px-4 pb-2 pt-6">
      <p className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-neutral-500">
        Офлайн{city ? ` · ${city}` : ""}
      </p>
      <h2 className="mt-2 text-[24px] font-normal leading-[1.15] tracking-[-0.02em] text-neutral-900 sm:text-[28px]">
        {lines.length > 1 ? "Можно примерить в магазинах" : "Можно примерить в магазине"}
      </h2>
      <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-neutral-600">
        Оформите заказ онлайн — вещь подождёт вас в удобной точке.
      </p>

      <ul className="mt-4 divide-y divide-neutral-200 border-y border-neutral-200">
        {lines.map((line, index) => (
          <li key={`${line}-${index}`} className="flex items-start gap-2.5 py-3 text-[13.5px] leading-snug text-neutral-900">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-500" strokeWidth={1.5} aria-hidden="true" />
            <span className="break-words">{line.replace(/^\d+\.\s*/, "")}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
