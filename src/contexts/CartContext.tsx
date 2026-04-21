import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Product } from "@/data/products";
import { trackMetaEvent } from "@/lib/metaPixel";

export interface CartItemVariant {
  id: string;
  label: string;
  price: number;
  unit: string;
}

export interface CartItemCustomField {
  fieldId: string;
  label: string;
  value: string;
  fieldType: 'text' | 'select';
}

export interface CartItemAddon {
  addonId: string;
  name: string;
  price: number; // kopecks
}

interface CartItem {
  product: Product;
  quantity: number;
  variant?: CartItemVariant;
  customFields?: CartItemCustomField[];
  addons?: CartItemAddon[];
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, variant?: CartItemVariant, customFields?: CartItemCustomField[], addons?: CartItemAddon[]) => void;
  removeFromCart: (itemKey: string) => void;
  updateQuantity: (itemKey: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  getItemKey: (item: CartItem) => string;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Helper to generate unique key for cart item
const getItemKey = (item: CartItem): string => {
  let key = item.variant ? `${item.product.id}-${item.variant.id}` : item.product.id;
  if (item.addons && item.addons.length > 0) {
    const addonIds = item.addons.map(a => a.addonId).sort().join('-');
    key += `-addons-${addonIds}`;
  }
  if (item.customFields && item.customFields.length > 0) {
    const cfParts = item.customFields
      .filter(cf => cf.value && cf.value.trim().length > 0)
      .sort((a, b) => a.fieldId.localeCompare(b.fieldId))
      .map(cf => `${cf.fieldId}:${cf.value}`)
      .join('-');
    if (cfParts) {
      key += `-cf-${cfParts}`;
    }
  }
  return key;
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('locus-cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('locus-cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (product: Product, variant?: CartItemVariant, customFields?: CartItemCustomField[], addons?: CartItemAddon[]) => {
    // Meta Pixel + CAPI: AddToCart (global — fires for any source)
    const unitPrice = variant?.price ?? product.price;
    const addonsPrice = addons?.reduce((s, a) => s + a.price, 0) || 0;
    trackMetaEvent("AddToCart", {
      content_ids: [product.id],
      content_name: product.name,
      content_type: "product",
      value: (unitPrice + addonsPrice) / 100,
      currency: "BYN",
    });

    setItems((prev) => {
      const tempItem = { product, quantity: 1, variant, customFields, addons } as CartItem;
      const itemKey = getItemKey(tempItem);
      const existing = prev.find((item) => getItemKey(item) === itemKey);

      if (existing) {
        return prev.map((item) =>
          getItemKey(item) === itemKey
            ? { ...item, quantity: item.quantity + 1, customFields: customFields || item.customFields, addons: addons || item.addons }
            : item
        );
      }
      return [...prev, { product, quantity: 1, variant, customFields, addons }];
    });
  };

  const removeFromCart = (itemKey: string) => {
    setItems((prev) => prev.filter((item) => getItemKey(item) !== itemKey));
  };

  const updateQuantity = (itemKey: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemKey);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        getItemKey(item) === itemKey ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => {
    const price = item.variant?.price ?? item.product.price;
    const addonsPrice = item.addons?.reduce((a, addon) => a + addon.price, 0) || 0;
    return sum + (price + addonsPrice) * item.quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        getItemKey,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
