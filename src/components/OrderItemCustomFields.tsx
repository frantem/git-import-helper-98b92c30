import { formatPrice } from "@/lib/priceUtils";
import { BynSymbol } from "@/components/ui/byn-symbol";

interface CustomFieldsData {
  fields?: Array<{ fieldId: string; label: string; value: string; fieldType: string }>;
  addons?: Array<{ addonId: string; name: string; price: number }>;
}

interface OrderItemCustomFieldsProps {
  customFields: CustomFieldsData | null | undefined;
  className?: string;
}

export function OrderItemCustomFields({ customFields, className = "pl-5 space-y-0.5" }: OrderItemCustomFieldsProps) {
  const parsed: CustomFieldsData | null = typeof customFields === 'string'
    ? JSON.parse(customFields)
    : customFields ?? null;

  const hasFields = parsed?.fields && parsed.fields.length > 0;
  const hasAddons = parsed?.addons && parsed.addons.length > 0;
  if (!hasFields && !hasAddons) return null;

  return (
    <div className={className}>
      {customFields?.fields?.map((f, i) => (
        <p key={i} className="text-xs text-muted-foreground">
          {f.label}: <span className="font-medium">«{f.value}»</span>
        </p>
      ))}
      {customFields?.addons?.map((a, i) => {
        const ap = formatPrice(a.price);
        return (
          <p key={i} className="text-xs text-muted-foreground">
            + {a.name}{a.price > 0 && <> ({ap.formatted}<BynSymbol />)</>}
          </p>
        );
      })}
    </div>
  );
}
