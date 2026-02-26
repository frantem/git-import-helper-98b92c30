import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { PageHeader } from "@/components/PageHeader";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatPrice } from "@/lib/priceUtils";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Cart() {
  const { items, updateQuantity, removeFromCart, totalItems, clearCart, getItemKey } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Sync selected items when cart items change
  useEffect(() => {
    setSelectedItems(items.map(getItemKey));
  }, [items, getItemKey]);

  const toggleItem = (key: string) => {
    setSelectedItems(prev => 
      prev.includes(key) ? prev.filter(i => i !== key) : [...prev, key]
    );
  };

  const toggleAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map(getItemKey));
    }
  };

  const selectedTotal = items
    .filter(item => selectedItems.includes(getItemKey(item)))
    .reduce((sum, item) => {
      const price = item.variant?.price ?? item.product.price;
      const addonsPrice = item.addons?.reduce((a, addon) => a + addon.price, 0) || 0;
      return sum + (price + addonsPrice) * item.quantity;
    }, 0);

  const selectedCount = items
    .filter(item => selectedItems.includes(getItemKey(item)))
    .reduce((sum, item) => sum + item.quantity, 0);

  const priceFormatted = formatPrice(selectedTotal);

  const [isCheckingProfile, setIsCheckingProfile] = useState(false);

  const handleCheckout = async () => {
    if (!user) {
      localStorage.setItem('locus-return-to', '/cart');
      navigate("/auth");
      return;
    }

    setIsCheckingProfile(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile?.full_name || !profile?.phone) {
        navigate("/settings?from=cart");
        return;
      }

      navigate("/checkout");
    } catch (error) {
      console.error("Error checking profile:", error);
      navigate("/checkout");
    } finally {
      setIsCheckingProfile(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Header />
        <main className="container mx-auto flex flex-col items-center justify-center px-4 py-16">
          <ShoppingBag className="mb-4 h-16 w-16 text-muted-foreground" />
          <h1 className="mb-2 text-xl font-bold text-foreground">Корзина пуста</h1>
          <p className="mb-6 text-center text-muted-foreground">
            Добавьте товары для оформления заказа
          </p>
          <Link to="/catalog">
            <Button>Перейти в каталог</Button>
          </Link>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-0">
      <Header />

      <main className="container mx-auto px-3 py-4">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <PageHeader title="Корзина" />
          <button
            onClick={toggleAll}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <Checkbox 
              checked={selectedItems.length === items.length}
              onCheckedChange={toggleAll}
            />
            Выбрать все
          </button>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row">
          {/* Cart items */}
          <div className="flex-1 space-y-2">
            {items.map((item) => {
              const itemKey = getItemKey(item);
              const itemPrice = item.variant?.price ?? item.product.price;
              const addonsPrice = item.addons?.reduce((a, addon) => a + addon.price, 0) || 0;
              const priceItem = formatPrice((itemPrice + addonsPrice) * item.quantity);
              const isSelected = selectedItems.includes(itemKey);
              
              return (
                <div
                  key={itemKey}
                  className={cn(
                    "flex gap-3 rounded-2xl bg-card p-3 shadow-sm transition-all",
                    isSelected && "ring-2 ring-primary"
                  )}
                >
                  <Checkbox 
                    checked={isSelected}
                    onCheckedChange={() => toggleItem(itemKey)}
                    className="mt-8"
                  />
                  
                  <Link
                    to={`/product/${item.product.id}`}
                    className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl"
                  >
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="h-full w-full object-cover"
                    />
                  </Link>

                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between">
                      <Link
                        to={`/product/${item.product.id}`}
                        className="line-clamp-2 text-sm font-medium text-foreground hover:text-primary"
                      >
                        {item.product.name}
                        {item.variant && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({item.variant.label})
                          </span>
                        )}
                      </Link>
                        {item.customFields && item.customFields.length > 0 && (
                        <div className="mt-0.5 space-y-0.5">
                          {item.customFields.map((cf) => (
                            <p key={cf.fieldId} className="text-xs text-muted-foreground">
                              {cf.label}: <span className="text-foreground">{cf.value}</span>
                            </p>
                          ))}
                        </div>
                      )}
                      {item.addons && item.addons.length > 0 && (
                        <div className="mt-0.5 space-y-0.5">
                          {item.addons.map((addon) => {
                            const ap = formatPrice(addon.price);
                            return (
                              <p key={addon.addonId} className="text-xs text-muted-foreground">
                                + {addon.name} <span className="text-foreground">(+{ap.rubles}р.{ap.kopecks > 0 && ` ${ap.kopecks.toString().padStart(2, '0')}к.`})</span>
                              </p>
                            );
                          })}
                        </div>
                      )}
                      <button
                        onClick={() => removeFromCart(itemKey)}
                        className="ml-2 rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-auto flex items-center justify-between">
                      {/* Quantity controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(itemKey, item.quantity - 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(itemKey, item.quantity + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Price */}
                      <span className="text-sm font-bold text-foreground">
                        {priceItem.rubles} р. {priceItem.kopecks > 0 && `${priceItem.kopecks.toString().padStart(2, '0')} к.`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order summary - desktop */}
          <aside className="hidden w-80 flex-shrink-0 lg:block">
            <div className="sticky top-20 rounded-2xl bg-card p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-foreground">Ваш заказ</h2>
              <div className="mb-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Товары ({selectedCount})</span>
                  <span className="text-foreground">
                    {priceFormatted.rubles} р. {priceFormatted.kopecks > 0 && `${priceFormatted.kopecks.toString().padStart(2, '0')} к.`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Доставка</span>
                  <span className="text-primary font-medium">Бесплатно</span>
                </div>
              </div>
              <div className="mb-4 border-t border-border pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Итого</span>
                  <span>
                    {priceFormatted.rubles} р. {priceFormatted.kopecks > 0 && `${priceFormatted.kopecks.toString().padStart(2, '0')} к.`}
                  </span>
                </div>
              </div>
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleCheckout}
                disabled={selectedCount === 0}
              >
                К оформлению
              </Button>
            </div>
          </aside>
        </div>
      </main>

      {/* Mobile checkout bar */}
      <div className="fixed bottom-14 left-0 right-0 z-40 border-t border-border bg-card p-3 shadow-lg md:hidden">
        <Button 
          className="w-full" 
          size="lg"
          onClick={handleCheckout}
          disabled={selectedCount === 0}
        >
          К оформлению • {selectedCount} шт. • {priceFormatted.rubles} р. {priceFormatted.kopecks > 0 && `${priceFormatted.kopecks.toString().padStart(2, '0')} к.`}
        </Button>
      </div>

      <BottomNavigation />
    </div>
  );
}
