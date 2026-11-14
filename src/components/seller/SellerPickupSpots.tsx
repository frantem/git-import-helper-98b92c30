import { MapPin, Store } from "lucide-react";

interface SellerPickupSpotsProps {
  lines: string[];
  city?: string | null;
}

/**
 * Блок «Примерить в магазинах» для витрины одежды.
 * Адреса продавец пишет сам, каждую точку с новой строки.
 */
export function SellerPickupSpots({ lines, city }: SellerPickupSpotsProps) {
  if (lines.length === 0) return null;

  return (
    <section className="mx-3 mb-4 mt-5 rounded-2xl border border-[#E8E4DB] bg-white p-4">
      <div className="mb-3 flex items-start gap-2">
        <Store className="mt-0.5 h-5 w-5 shrink-0 text-[#2F5D45]" aria-hidden="true" />
        <div>
          <h2 className="text-[16px] font-bold leading-tight text-[#1A1A1A]">
            {lines.length > 1 ? "Примерить в наших магазинах" : "Примерить в магазине"}
          </h2>
          <p className="mt-0.5 text-[12.5px] leading-snug text-[#7A7469]">
            Заказ оформляйте онлайн — вещь подождёт вас в удобной точке
            {city ? `, ${city}` : ""}
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {lines.map((line, index) => (
          <li
            key={`${line}-${index}`}
            className="flex items-start gap-2.5 rounded-xl bg-[#FAF8F3] px-3 py-2.5 text-[13.5px] leading-snug text-[#1A1A1A]"
          >
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#B4553A]" aria-hidden="true" />
            <span className="break-words">{line.replace(/^\d+\.\s*/, "")}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
