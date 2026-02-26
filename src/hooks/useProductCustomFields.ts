import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CustomFieldOption {
  id: string;
  label: string;
  sort_order: number;
}

export interface ProductCustomField {
  id: string;
  product_id: string;
  field_type: "text" | "select";
  label: string;
  placeholder: string | null;
  max_length: number | null;
  sort_order: number;
  options: CustomFieldOption[];
}

export function useProductCustomFields(productId: string | undefined) {
  return useQuery({
    queryKey: ["product-custom-fields", productId],
    queryFn: async (): Promise<ProductCustomField[]> => {
      if (!productId) return [];

      const { data: fields, error: fieldsError } = await (supabase as any)
        .from("product_custom_fields")
        .select("*")
        .eq("product_id", productId)
        .order("sort_order");

      if (fieldsError) throw fieldsError;
      if (!fields || fields.length === 0) return [];

      const fieldIds = fields.map((f: any) => f.id);
      const { data: options, error: optionsError } = await (supabase as any)
        .from("product_custom_field_options")
        .select("*")
        .in("field_id", fieldIds)
        .order("sort_order");

      if (optionsError) throw optionsError;

      return fields.map((field) => ({
        id: field.id,
        product_id: field.product_id,
        field_type: field.field_type as "text" | "select",
        label: field.label,
        placeholder: field.placeholder,
        max_length: field.max_length,
        sort_order: field.sort_order,
        options: (options || []).filter((o) => o.field_id === field.id),
      }));
    },
    enabled: !!productId,
    staleTime: 2 * 60 * 1000,
  });
}
