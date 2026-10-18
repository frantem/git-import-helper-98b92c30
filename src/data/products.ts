export interface Product {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  discount?: number;
  image: string;
  category: string;
  categoryName?: string | null;
  rating: number;
  reviews: number;
  seller: string;
  description: string;
  composition?: string | null;
  shelfLife?: string | null;
  warning?: string | null;
  inStock: boolean;
  deliveryDays: number;
  unit: string;
  district?: string;
  village?: string;
  harvestDate?: string;
  packaging?: string;
  isNew?: boolean;
  farmer_id?: string;
  prep_time_minutes?: number;
  order_lead_time_hours?: number;
  slug?: string;
  defaultVariant?: {
    id: string;
    label: string;
    price: number;
    unit: string;
  };
}

// Products now come from database - this array is kept for type compatibility
export const products: Product[] = [];
