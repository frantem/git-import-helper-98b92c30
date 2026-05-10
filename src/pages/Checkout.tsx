import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/priceUtils";
import { BynSymbol } from "@/components/ui/byn-symbol";
import {
  calculatePickupTime,
  calculatePickupReadyDate,
  PickupTimeResult,
  calculateDeliveryTime,
  calculateDeliveryTimePerSeller,
  DeliveryTimeResult,
  parseWorkingHoursEnd,
  safePrepTime,
  getPickupTimeSlotsForDate,
  isPickupDateAvailable,
  getDeliveryTimeSlotsForDate,
  isDeliveryDateAvailable,
  getMinskTime,
} from "@/lib/pickupUtils";
import type { PickupSlots } from "@/components/PickupSettingsSection";
import { Check, MapPin, Truck, Banknote, RefreshCw, LogIn, Settings, Home, Package, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { trackMetaEvent } from "@/lib/metaPixel";
import { EmailChangePrompt } from "@/components/EmailChangePrompt";
interface PickupPoint {
  id: string;
  name: string;
  address: string;
  working_hours: string | null;
}
interface FarmerInfo {
  id: string;
  city: string | null;
  street: string | null;
  address_details: string | null;
  district: string;
  name: string;
}
type FarmersMap = Map<string, FarmerInfo>;

interface SellerPickupSettings {
  farmer_id: string;
  pickup_slots: PickupSlots | null;
  max_orders_per_day: number;
  busy_dates: string[] | null;
  vacation_dates: string[] | null;
}
type OrderCountsMap = Record<string, number>; // "farmerId:YYYY-MM-DD" -> count
export default function Checkout() {
  const {
    items,
    totalPrice,
    clearCart,
    getItemKey
  } = useCart();
  const {
    user,
    role,
    isLoading: isAuthLoading
  } = useAuth();
  const navigate = useNavigate();
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPoints, setIsLoadingPoints] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [emailPromptDismissed, setEmailPromptDismissed] = useState(false);
  const showEmailPrompt = !emailPromptDismissed && !!user?.email?.toLowerCase().endsWith("@phone.locusfood.by");

  // Delivery type state
  const [deliveryType, setDeliveryType] = useState<"pickup" | "courier" | "self" | "">("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [profileDeliveryAddress, setProfileDeliveryAddress] = useState<string | null>(null);
  const [farmersMap, setFarmersMap] = useState<FarmersMap>(new Map());
  const [sellerPickupSettings, setSellerPickupSettings] = useState<Map<string, SellerPickupSettings>>(new Map());
  const [orderCountsMap, setOrderCountsMap] = useState<OrderCountsMap>({});
  const [isPickupDialogOpen, setIsPickupDialogOpen] = useState(false);

  // Courier delivery date/time selection
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [isDateTimePopoverOpen, setIsDateTimePopoverOpen] = useState(false);
  const [courierDeliveryMode, setCourierDeliveryMode] = useState<"fast" | "scheduled">("fast");

  // Payment method (on delivery)
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");

  // Confirmation method
  const [confirmationMethod, setConfirmationMethod] = useState<"call" | "message">("call");

  // Self-pickup per-seller date/time selection
  const [selfPickupSelections, setSelfPickupSelections] = useState<Record<string, { date: Date; time: string }>>({});
  const [selfPickupPopoverOpen, setSelfPickupPopoverOpen] = useState<Record<string, boolean>>({});

  // Admin settings for future delivery logic
  const [adminSettings, setAdminSettings] = useState({
    cutoff_time_minutes: 1050,
    avg_delivery_time_minutes: 70,
    delivery_start_hour: 6,
    delivery_end_hour: 24
  });

  // Helper: Get current time in Minsk timezone (UTC+3) — единый источник из pickupUtils

  // Build prep-per-seller list (используется и для доставки, и для слотов)
  const prepPerSeller = useMemo(() => {
    const farmerIds = [...new Set(items.map((i) => i.product.farmer_id).filter(Boolean))] as string[];
    return farmerIds.map((fid) => {
      const farmerItems = items.filter((i) => i.product.farmer_id === fid);
      const maxPrep = Math.max(0, ...farmerItems.map((i) => safePrepTime((i.product as any).prep_time_minutes)));
      const maxLead = Math.max(0, ...farmerItems.map((i) => Number((i.product as any).order_lead_time_hours) || 0));
      const s = sellerPickupSettings.get(fid);
      return {
        farmerId: fid,
        prepTimeMinutes: maxPrep,
        orderLeadTimeHours: maxLead,
        schedule: {
          pickupSlots: (s?.pickup_slots as PickupSlots | null) ?? null,
          busyDates: s?.busy_dates ?? null,
          vacationDates: s?.vacation_dates ?? null,
          orderLeadTimeHours: maxLead,
        },
      };
    });
  }, [items, sellerPickupSettings]);

  // Pickup-point end-of-day cutoff (для типа "пункт выдачи")
  const pickupPointEndMinutes = useMemo(() => {
    if (deliveryType !== "pickup" || !selectedPoint) return undefined;
    const point = pickupPoints.find((p) => p.id === selectedPoint);
    return parseWorkingHoursEnd(point?.working_hours) ?? undefined;
  }, [deliveryType, selectedPoint, pickupPoints]);

  // Ближайшая доставка (учитывает ВСЕХ продавцов в корзине)
  const fastDeliveryResult = useMemo<DeliveryTimeResult>(() => {
    return calculateDeliveryTime(prepPerSeller, adminSettings, pickupPointEndMinutes);
  }, [prepPerSeller, adminSettings, pickupPointEndMinutes]);



  // Самая ранняя возможная дата доставки (для блокировки календаря)
  const earliestDeliveryDate = useMemo<Date>(() => {
    const now = getMinskTime();
    const text = fastDeliveryResult.text;
    if (text.startsWith("Сегодня")) return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (text.startsWith("Завтра")) {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
    const match = text.match(/^(\d{2})\.(\d{2})/);
    if (match) {
      const day = parseInt(match[1]);
      const month = parseInt(match[2]) - 1;
      const year = now.getFullYear();
      const candidate = new Date(year, month, day);
      if (candidate < now) candidate.setFullYear(year + 1);
      return candidate;
    }
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, [fastDeliveryResult]);

  const noDeliveryAvailable = useMemo(
    () => fastDeliveryResult.text === "Нет доступных дат",
    [fastDeliveryResult],
  );

  // Слоты доставки на выбранную дату (с учётом готовности всех продавцов)
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate || noDeliveryAvailable) return [];
    return getDeliveryTimeSlotsForDate(prepPerSeller, adminSettings, selectedDate, pickupPointEndMinutes);
  }, [selectedDate, prepPerSeller, adminSettings, pickupPointEndMinutes, noDeliveryAvailable]);

  // Handle date/time selection
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime("");
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setIsDateTimePopoverOpen(false);
  };

  // Слоты самовывоза для конкретного продавца на дату
  const getSellerTimeSlots = (farmerId: string, date: Date): string[] => {
    const sellerData = prepPerSeller.find((s) => s.farmerId === farmerId);
    if (!sellerData) return [];
    return getPickupTimeSlotsForDate(sellerData.prepTimeMinutes, sellerData.schedule, date);
  };

  // Блокировка дат самовывоза для конкретного продавца
  const isDateDisabledForSeller = (date: Date, farmerId: string): boolean => {
    const sellerData = prepPerSeller.find((s) => s.farmerId === farmerId);
    if (!sellerData) return true;
    return !isPickupDateAvailable(sellerData.prepTimeMinutes, sellerData.schedule, date);
  };


  // Calculate delivery cost
  const deliveryCost = deliveryType === "courier" ? 690 : 0; // 6,90р = 690 kopecks
  const finalTotalPrice = totalPrice + deliveryCost;
  useEffect(() => {
    if (!isAuthLoading && user) {
      fetchPickupPoints();
      fetchFarmerInfo();
      fetchProfileAddress();
    } else if (!isAuthLoading && !user) {
      setIsLoadingPoints(false);
    }
  }, [user, isAuthLoading, items]);

  const fetchProfileAddress = async () => {
    if (!user) return;
    const { data } = await supabase.
    from("profiles").
    select("delivery_address").
    eq("user_id", user.id).
    maybeSingle();
    if (data) {
      const addr = (data as any).delivery_address || "";
      setProfileDeliveryAddress(addr);
      if (addr && !deliveryAddress) {
        setDeliveryAddress(addr);
      }
    }
  };

  // Reset date/time when switching to fast mode
  useEffect(() => {
    if (courierDeliveryMode === "fast") {
      setSelectedDate(undefined);
      setSelectedTime("");
    }
  }, [courierDeliveryMode]);

  // Reset self-pickup selections when switching delivery type
  useEffect(() => {
    setSelfPickupSelections({});
    setSelfPickupPopoverOpen({});
  }, [deliveryType]);
  const fetchPickupPoints = async () => {
    setIsLoadingPoints(true);
    setLoadError(false);
    try {
      const {
        data,
        error
      } = await supabase.from("pickup_points").select("*").eq("is_active", true);
      if (error) throw error;
      if (data) {
        setPickupPoints(data);
        // Don't auto-select first point - user must choose
      }
    } catch (error) {
      console.error("Error fetching pickup points:", error);
      setLoadError(true);
    } finally {
      setIsLoadingPoints(false);
    }
  };

  // Fetch farmer info for all unique farmers in cart
  const fetchFarmerInfo = async () => {
    if (items.length === 0) return;

    // Get unique farmer_ids from cart
    const farmerIds = [...new Set(items.map((item) => item.product.farmer_id).filter(Boolean))] as string[];
    if (farmerIds.length === 0) return;
    const {
      data
    } = await supabase.from("farmers").select("id, name, city, street, address_details, district").in("id", farmerIds);
    if (data) {
      const map = new Map<string, FarmerInfo>();
      data.forEach((farmer) => map.set(farmer.id, farmer));
      setFarmersMap(map);
    }

    // Load admin settings (4 keys in one query)
    try {
      const { data: settingsRows } = await supabase.
      from("app_settings").
      select("key, value").
      in("key", ["cutoff_time_minutes", "avg_delivery_time_minutes", "delivery_start_hour", "delivery_end_hour"]);
      if (settingsRows && settingsRows.length > 0) {
        const s: Record<string, number> = {};
        settingsRows.forEach((r) => {s[r.key] = parseInt(r.value);});
        setAdminSettings((prev) => ({
          cutoff_time_minutes: s.cutoff_time_minutes ?? prev.cutoff_time_minutes,
          avg_delivery_time_minutes: s.avg_delivery_time_minutes ?? prev.avg_delivery_time_minutes,
          delivery_start_hour: s.delivery_start_hour ?? prev.delivery_start_hour,
          delivery_end_hour: s.delivery_end_hour ?? prev.delivery_end_hour
        }));
      }
    } catch (err) {
      console.error("Error fetching admin settings:", err);
    }

    // Fetch pickup settings via RPC
    try {
      const { data: settingsData } = await supabase.rpc("get_seller_pickup_settings", {
        farmer_ids: farmerIds
      } as any);
      if (settingsData && Array.isArray(settingsData)) {
        const settingsMap = new Map<string, SellerPickupSettings>();
        settingsData.forEach((s: any) => settingsMap.set(s.farmer_id, s));
        setSellerPickupSettings(settingsMap);

        // Generate dates to check (today + 14 days)
        const now = new Date();
        const checkDates: string[] = [];
        for (let i = 0; i < 14; i++) {
          const d = new Date(now);
          d.setDate(d.getDate() + i);
          checkDates.push(d.toISOString().split("T")[0]);
        }

        const { data: countsData } = await supabase.rpc("get_orders_count_by_dates", {
          p_farmer_ids: farmerIds,
          p_check_dates: checkDates
        } as any);
        if (countsData && Array.isArray(countsData)) {
          const counts: OrderCountsMap = {};
          countsData.forEach((c: any) => {
            counts[`${c.farmer_id}:${c.order_date}`] = Number(c.order_count);
          });
          setOrderCountsMap(counts);
        }
      }
    } catch (err) {
      console.error("Error fetching pickup settings:", err);
    }
  };

  // Helper to get farmer address for an item
  const getFarmerAddress = (farmerId: string | undefined) => {
    if (!farmerId) return "Адрес уточняйте у продавца";
    const farmer = farmersMap.get(farmerId);
    if (!farmer) return "Адрес уточняйте у продавца";

    const parts: string[] = [];
    if (farmer.city) parts.push(farmer.city);
    if (farmer.street) parts.push(`ул. ${farmer.street}`);
    if (farmer.address_details) parts.push(farmer.address_details);

    return parts.length > 0 ? parts.join(", ") : "Адрес уточняйте у продавца";
  };
  const priceFormatted = formatPrice(finalTotalPrice);
  const handleOrder = async () => {
    if (!user || items.length === 0 || !deliveryType) {
      if (!deliveryType) {
        toast.error("Выберите способ доставки");
      }
      return;
    }

    // Validation based on delivery type
    if (deliveryType === "pickup" && !selectedPoint) {
      toast.error("Выберите пункт выдачи");
      return;
    }
    if (deliveryType === "courier" && !deliveryAddress.trim()) {
      toast.error("Укажите адрес доставки");
      return;
    }

    // Check all items have farmer_id
    const itemsWithoutFarmer = items.filter((item) => !item.product.farmer_id);
    if (itemsWithoutFarmer.length > 0) {
      toast.error("Некоторые товары не могут быть заказаны. Попробуйте удалить их из корзины.");
      return;
    }
    setIsLoading(true);
    try {
      // Build estimated_delivery_time string
      let estimatedDeliveryTime: string | null = null;
      let sellerTimesMap: Record<string, string> = {};
      if (deliveryType === "courier") {
        if (courierDeliveryMode === "scheduled" && selectedDate && selectedTime) {
          const dateStr = format(selectedDate, "d MMMM", { locale: ru });
          estimatedDeliveryTime = `${dateStr} ${selectedTime}`;
        } else {
          estimatedDeliveryTime = fastDeliveryResult.text;
        }
      } else if (deliveryType === "pickup") {
        estimatedDeliveryTime = fastDeliveryResult.text;
      } else if (deliveryType === "self") {
        // Compute per-seller pickup times
        const farmerIds = [...new Set(items.map((i) => i.product.farmer_id).filter(Boolean))] as string[];
        const timeTexts: string[] = [];
        for (const fid of farmerIds) {
          // If user selected custom date/time for this seller, use it
          const customSelection = selfPickupSelections[fid];
          if (customSelection) {
            const dateStr = format(customSelection.date, "d MMMM", { locale: ru });
            const timeText = `${dateStr} ${customSelection.time}`;
            sellerTimesMap[fid] = timeText;
            timeTexts.push(timeText);
          } else {
            const s = sellerPickupSettings.get(fid);
            const farmerItems = items.filter((i) => i.product.farmer_id === fid);
            const maxPrep = Math.max(0, ...farmerItems.map((i) => safePrepTime((i.product as any).prep_time_minutes)));
            const maxLead = Math.max(0, ...farmerItems.map((i) => Number((i.product as any).order_lead_time_hours) || 0));
            const result = calculatePickupTime(
              maxPrep,
              s?.pickup_slots as PickupSlots | null ?? null,
              s?.max_orders_per_day ?? 5,
              s?.busy_dates ?? null,
              s?.vacation_dates ?? null,
              orderCountsMap,
              fid,
              maxLead
            );
            sellerTimesMap[fid] = result.text;
            timeTexts.push(result.text);
          }
        }
        // Store combined text for order-level display
        estimatedDeliveryTime = [...new Set(timeTexts)].join(" / ");
      }

      const {
        data: order,
        error: orderError
      } = await supabase.from("orders").insert({
        buyer_id: user.id,
        pickup_point_id: deliveryType === "pickup" ? selectedPoint : null,
        total_amount: finalTotalPrice,
        status: "pending",
        delivery_type: deliveryType,
        delivery_address: deliveryType === "courier" ? deliveryAddress : null,
        delivery_cost: deliveryCost,
        delivery_date: deliveryType === "courier" && courierDeliveryMode === "scheduled" && selectedDate ?
        format(selectedDate, "yyyy-MM-dd") :
        null,
        notes: deliveryType === "courier" && courierDeliveryMode === "scheduled" && selectedTime ?
        `Доставка в указанное время: ${selectedTime}` :
        null,
        estimated_delivery_time: estimatedDeliveryTime,
        referrer_farmer_id: (() => {
          const refId = localStorage.getItem("referrer_farmer_id");
          const refTs = localStorage.getItem("referrer_farmer_ts");
          if (refId && refTs) {
            const age = Date.now() - parseInt(refTs, 10);
          if (age <= 24 * 60 * 60 * 1000) return refId;
          }
          return null;
        })(),
        payment_method: paymentMethod,
        confirmation_method: confirmationMethod
      } as any).select().single();
      if (orderError) throw orderError;

      // Clear referrer after successful order
      localStorage.removeItem("referrer_farmer_id");
      localStorage.removeItem("referrer_farmer_ts");

      // Create order_items for each cart item (use variant price if available)
      const orderItems = items.map((item) => {
        const addonsPrice = item.addons?.reduce((a, addon) => a + addon.price, 0) || 0;
        const customFieldsData: any = {};
        if (item.customFields && item.customFields.length > 0) {
          customFieldsData.fields = item.customFields;
        }
        if (item.addons && item.addons.length > 0) {
          customFieldsData.addons = item.addons;
        }
        const hasData = Object.keys(customFieldsData).length > 0;
        return {
          order_id: order.id,
          product_id: item.product.id,
          farmer_id: item.product.farmer_id!,
          quantity: item.quantity,
          unit_price: (item.variant?.price ?? item.product.price) + addonsPrice,
          variant_label: item.variant?.label || null,
          status: "pending",
          custom_fields: hasData ? customFieldsData : null
        } as any;
      });
      const {
        error: itemsError
      } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      // Send notification emails (don't block checkout if it fails)
      supabase.functions.invoke("send-new-order-notification", {
        body: {
          order_id: order.id
        }
      }).catch((err) => console.error("Failed to send notification:", err));

      // Send self-pickup notification to buyer if delivery_type is "self"
      if (deliveryType === "self") {
        supabase.functions.invoke("send-self-pickup-notification", {
          body: {
            order_id: order.id,
            seller_times: sellerTimesMap
          }
        }).catch((err) => console.error("Failed to send self-pickup notification:", err));
      }

      // Meta Pixel + Conversions API: Purchase (via shared helper for dedup)
      const totalRubles = Math.floor(finalTotalPrice / 100);
      trackMetaEvent("Purchase", {
        value: totalRubles,
        currency: "BYN",
        content_ids: items.map((it) => it.product.id),
        num_items: items.reduce((s, it) => s + it.quantity, 0),
      });

      // Auto-save delivery address to profile if new/changed
      if (deliveryType === "courier" && deliveryAddress.trim() && deliveryAddress !== profileDeliveryAddress && user) {
        supabase.
        from("profiles").
        update({ delivery_address: deliveryAddress } as any).
        eq("user_id", user.id).
        then(() => {});
      }

      clearCart();
      setOrderSuccess(true);
      toast.success("Заказ успешно оформлен!");
    } catch (error) {
      console.error(error);
      toast.error("Ошибка при оформлении заказа");
    } finally {
      setIsLoading(false);
    }
  };
  if (orderSuccess) {
    return <div className="min-h-screen bg-background pb-16 flex flex-col items-center justify-center px-4">
        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mb-6">
          <Check className="h-10 w-10 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Заказ оформлен!</h1>
        <p className="text-muted-foreground text-center mb-6">
          Менеджер свяжется с Вами для подтверждения заказа. Сейчас безналичная оплата не работает. Оплата наличными при получении.
        </p>
        {showEmailPrompt && (
          <EmailChangePrompt onDone={() => setEmailPromptDismissed(true)} />
        )}
        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={() => navigate("/orders")}>
            Мои заказы
          </Button>
          <Button onClick={() => navigate("/")}>
            На главную
          </Button>
        </div>
      </div>;
  }

  // Show auth prompt if not logged in
  if (!isAuthLoading && !user) {
    return <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Header />
        <main className="container mx-auto px-4 py-16 text-center">
          <div className="mx-auto max-w-md rounded-2xl bg-card p-8 shadow-lg">
            <LogIn className="mx-auto h-12 w-12 text-primary mb-4" />
            <h1 className="text-xl font-bold text-foreground mb-2">Войдите для оформления заказа</h1>
            <p className="text-muted-foreground mb-6">
              Чтобы оформить заказ, необходимо войти в аккаунт или зарегистрироваться.
            </p>
            <Button onClick={() => navigate("/auth")} className="w-full">
              Войти / Регистрация
            </Button>
          </div>
        </main>
        <BottomNavigation />
      </div>;
  }
  return <div className="min-h-screen pb-32 md:pb-0 bg-[#faf5ea]">
      <Header />
      
      <main className="container mx-auto px-3 py-4">
        <PageHeader title="Оформление заказа" backPath="/cart" />

        {/* Delivery type selection - MOVED TO TOP */}
        <div className="rounded-2xl bg-card p-4 shadow-sm mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground">Выберите доставку:</h2>
          </div>
          
          <RadioGroup value={deliveryType} onValueChange={(v) => setDeliveryType(v as "pickup" | "courier" | "self")} className="space-y-2">
            {/* Pickup point option (disabled) */}
            <div className="relative rounded-lg border-2 border-border bg-muted/60 px-3 py-2.5 opacity-60 cursor-not-allowed select-none">
              <RadioGroupItem value="pickup" id="delivery-pickup" className="sr-only" disabled />
              <Label htmlFor="delivery-pickup" className="flex justify-between items-center cursor-not-allowed">
                <span className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-muted-foreground">Пункт выдачи</span>
                </span>
                <span className="text-muted-foreground font-medium">Бесплатно</span>
              </Label>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-muted-foreground/80 text-background text-xs font-bold px-3 py-1 rounded-full">В разработке</span>
              </div>
            </div>

            {/* Courier delivery option */}
            <div
              className={`rounded-lg border-2 px-3 py-2.5 cursor-pointer transition-colors ${
                deliveryType === "courier"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-foreground hover:bg-secondary/50"
              }`}
              onClick={() => { setDeliveryType("courier"); trackMetaEvent("AddPaymentInfo", { delivery_type: "home_delivery" }); }}
            >
              <RadioGroupItem value="courier" id="delivery-courier" className="sr-only" />
              <Label htmlFor="delivery-courier" className="flex justify-between items-center cursor-pointer">
                <span className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  <span className="font-medium">Доставка на дом</span>
                </span>
                <span className="font-medium">6,90<BynSymbol /></span>
              </Label>
            </div>

            {/* Self-pickup option */}
            <div
              className={`rounded-lg border-2 px-3 py-2.5 cursor-pointer transition-colors ${
                deliveryType === "self"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-foreground hover:bg-secondary/50"
              }`}
              onClick={() => { setDeliveryType("self"); trackMetaEvent("AddPaymentInfo", { delivery_type: "pickup" }); }}
            >
              <RadioGroupItem value="self" id="delivery-self" className="sr-only" />
              <Label htmlFor="delivery-self" className="flex justify-between items-center cursor-pointer">
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="font-medium">Самовывоз</span>
                </span>
                <span className={`font-medium ${deliveryType === "self" ? "" : "text-primary"}`}>Бесплатно</span>
              </Label>
            </div>
          </RadioGroup>

          {/* Conditional content based on delivery type */}
          {deliveryType === "pickup" && <div className="mt-4 pt-4 border-t border-border">
              <h3 className="text-sm font-medium text-foreground mb-3">Товары привезут в пункт выдачи:</h3>
              <div className="space-y-3 mb-4">
                {(() => {
              // Group items by farmer_id for delivery time per seller
              const groups = new Map<string, typeof items>();
              items.forEach((item) => {
                const fid = item.product.farmer_id || "unknown";
                if (!groups.has(fid)) groups.set(fid, []);
                groups.get(fid)!.push(item);
              });
              return Array.from(groups.entries()).map(([fid, groupItems]) => {
                const settings = sellerPickupSettings.get(fid);
                const maxPrep = Math.max(0, ...groupItems.map((i) => safePrepTime((i.product as any).prep_time_minutes)));
                const maxLead = Math.max(0, ...groupItems.map((i) => Number((i.product as any).order_lead_time_hours) || 0));
                const ppData = selectedPoint ? pickupPoints.find((p) => p.id === selectedPoint) : null;
                const ppEnd = parseWorkingHoursEnd(ppData?.working_hours) ?? undefined;
                const deliveryResult = calculateDeliveryTimePerSeller(
                  maxPrep,
                  settings?.pickup_slots as PickupSlots | null ?? null,
                  settings?.busy_dates ?? null,
                  settings?.vacation_dates ?? null,
                  adminSettings,
                  ppEnd,
                  maxLead
                );
                return (
                  <div key={fid} className="space-y-1">
                    {groupItems.map((item) =>
                    <div key={getItemKey(item)} className="py-2 px-3 bg-secondary/30 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-foreground">
                                {item.product.name}
                                {item.variant && <span className="text-muted-foreground"> ({item.variant.label})</span>}
                                {" "}× {item.quantity}
                              </span>
                              <span className="text-xs text-primary font-medium">{deliveryResult.text}</span>
                            </div>
                            {item.customFields && item.customFields.length > 0 && (
                              <div className="mt-0.5 space-y-0.5">
                                {item.customFields.map((cf, i) => (
                                  <p key={i} className="text-xs text-muted-foreground">{cf.label}: <span className="font-medium">«{cf.value}»</span></p>
                                ))}
                              </div>
                            )}
                            {item.addons && item.addons.length > 0 && (
                              <div className="mt-0.5 space-y-0.5">
                                {item.addons.map((a, i) => {
                                  const ap = formatPrice(a.price);
                                  return <p key={i} className="text-xs text-muted-foreground">+ {a.name}{a.price > 0 && <> ({ap.formatted}<BynSymbol />)</>}</p>;
                                })}
                              </div>
                            )}
                          </div>
                    )}
                      </div>);

              });
            })()}
              </div>
              
              {/* Pickup point selection button */}
              <Button variant={selectedPoint ? "outline" : "default"} className={`w-full justify-between ${!selectedPoint ? "animate-pulse" : ""}`} onClick={() => setIsPickupDialogOpen(true)} disabled={isLoadingPoints}>
                <span className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  {selectedPoint ? pickupPoints.find((p) => p.id === selectedPoint)?.name : "Выберите пункт выдачи →"}
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              {/* Pickup points dialog */}
              <Dialog open={isPickupDialogOpen} onOpenChange={setIsPickupDialogOpen}>
                <DialogContent className="max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Выберите пункт выдачи</DialogTitle>
                  </DialogHeader>
                  
                  {isLoadingPoints ? <div className="py-4 text-center text-muted-foreground">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Загрузка...
                    </div> : loadError ? <div className="py-4 text-center">
                      <p className="text-destructive mb-3">Не удалось загрузить</p>
                      <Button variant="outline" size="sm" onClick={fetchPickupPoints}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Повторить
                      </Button>
                    </div> : pickupPoints.length === 0 ? <div className="py-4 text-center text-muted-foreground">
                      <p className="mb-3">Пункты выдачи ещё не добавлены</p>
                      {role === "admin" && <Link to="/admin/pickup-points">
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4 mr-2" />
                            Добавить в админке
                          </Button>
                        </Link>}
                    </div> : <div className="space-y-2">
                      {pickupPoints.map((point) => <div key={point.id} className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedPoint === point.id ? "bg-primary/10 border border-primary/30" : "hover:bg-secondary/50 border border-transparent"}`} onClick={() => {
                  setSelectedPoint(point.id);
                  setIsPickupDialogOpen(false);
                }}>
                          <span className="font-medium text-foreground">{point.name}</span>
                          <p className="text-sm text-muted-foreground">{point.address}</p>
                          {point.working_hours && <p className="text-xs text-primary">{point.working_hours}</p>}
                        </div>)}
                    </div>}
                </DialogContent>
              </Dialog>
            </div>}

          {deliveryType === "courier" && <div className="mt-4 pt-4 border-t border-border space-y-4">
              {/* Courier delivery mode selection */}
              <RadioGroup
            value={courierDeliveryMode}
            onValueChange={(v) => setCourierDeliveryMode(v as "fast" | "scheduled")}
            className="space-y-2">

                {/* Fast delivery option */}
                <div
              className={`flex items-start gap-3 py-3 px-3 rounded-lg cursor-pointer transition-colors ${
              courierDeliveryMode === "fast" ?
              "bg-primary/10 border border-primary/30" :
              "hover:bg-secondary/50"}`}
              onClick={() => setCourierDeliveryMode("fast")}>

                  <RadioGroupItem
                value="fast"
                id="courier-fast"
                className="mt-1" />

                  <Label htmlFor="courier-fast" className="flex-1 cursor-pointer">
                    <span className="font-medium text-foreground">Ближайшая доставка</span>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {noDeliveryAvailable
                        ? "Нет доступных дат для доставки в ближайшее время"
                        : `Привезем ваш заказ: ${fastDeliveryResult.text}`}
                    </p>
                  </Label>
                </div>

                {/* Scheduled delivery option */}
                <div
              className={`flex items-start gap-3 py-3 px-3 rounded-lg cursor-pointer transition-colors ${
              courierDeliveryMode === "scheduled" ?
              "bg-primary/10 border border-primary/30" :
              "hover:bg-secondary/50"}`
              }
              onClick={() => setCourierDeliveryMode("scheduled")}>

                  <RadioGroupItem value="scheduled" id="courier-scheduled" className="mt-1" />
                  <Label htmlFor="courier-scheduled" className="flex-1 cursor-pointer">
                    <span className="font-medium text-foreground">Доставка в указанное время</span>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Вы можете выбрать дату и время, когда мы Вам доставим товары
                    </p>
                  </Label>
                </div>
              </RadioGroup>

              {/* Calendar - shown only when scheduled mode is selected */}
              {courierDeliveryMode === "scheduled" &&
          <div className="space-y-1">
                  {noDeliveryAvailable ? (
                    <div className="p-3 rounded-lg bg-muted text-sm text-muted-foreground text-center">
                      Нет доступных дат для доставки. Попробуйте уменьшить количество товаров или выбрать другой способ доставки.
                    </div>
                  ) : (
                  <Popover open={isDateTimePopoverOpen} onOpenChange={setIsDateTimePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate && selectedTime ? `${format(selectedDate, "d MMMM", {
                    locale: ru
                  })}, ${selectedTime}` : "Выбрать время и дату"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 max-w-[calc(100vw-2rem)]" align="start">
                      <Calendar mode="single" selected={selectedDate} onSelect={handleDateSelect} disabled={(date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  if (date < today) return true;
                  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                  if (dateOnly < earliestDeliveryDate) return true;
                  return !isDeliveryDateAvailable(prepPerSeller, adminSettings, date, pickupPointEndMinutes);
                }} className="pointer-events-auto" locale={ru} />
                      {selectedDate && <div className="p-3 border-t border-border">
                          <Label className="text-sm mb-2 block">Время:</Label>
                          {availableTimeSlots.length > 0 ? <Select value={selectedTime} onValueChange={handleTimeSelect}>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите время" />
                              </SelectTrigger>
                              <SelectContent className="bg-popover">
                                {availableTimeSlots.map((slot) => <SelectItem key={slot} value={slot}>{slot}</SelectItem>)}
                              </SelectContent>
                            </Select> : <p className="text-sm text-muted-foreground">
                              На эту дату нет доступного времени
                            </p>}
                        </div>}
                    </PopoverContent>
                  </Popover>
                  )}
                </div>
          }

              {/* Freshness text */}
              <p className="text-xs text-muted-foreground text-center">
                Все товары готовятся под указанное время, поэтому они всегда свежие и вкусные.
              </p>
              
              {/* Delivery address */}
              <div className="space-y-2">
                <Label htmlFor="delivery-address">Адрес доставки:</Label>
                <Textarea id="delivery-address" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Город, улица, дом, квартира" rows={2} />
              </div>
            </div>}

          {deliveryType === "self" && <div className="mt-4 pt-4 border-t border-border">
              <h3 className="text-sm font-medium text-foreground mb-3">При заказе сейчас Ваши товары можно забрать:</h3>
              <div className="space-y-4">
                {(() => {
              // Group items by farmer_id
              const groups = new Map<string, typeof items>();
              items.forEach((item) => {
                const fid = item.product.farmer_id || "unknown";
                if (!groups.has(fid)) groups.set(fid, []);
                groups.get(fid)!.push(item);
              });

              return Array.from(groups.entries()).map(([fid, groupItems]) => {
                const farmer = farmersMap.get(fid);
                const settings = sellerPickupSettings.get(fid);
                const maxPrep = Math.max(0, ...groupItems.map((i) => safePrepTime((i.product as any).prep_time_minutes)));
                const maxLead = Math.max(0, ...groupItems.map((i) => Number((i.product as any).order_lead_time_hours) || 0));

                const pickupResult = calculatePickupTime(
                  maxPrep,
                  settings?.pickup_slots as PickupSlots | null | undefined,
                  settings?.max_orders_per_day ?? 5,
                  settings?.busy_dates,
                  settings?.vacation_dates,
                  orderCountsMap,
                  fid,
                  maxLead
                );

                return (
                  <div key={fid} className="space-y-2">
                        {/* Seller header with pickup time */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-foreground">{farmer?.name || "Продавец"}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {getFarmerAddress(fid)}
                            </p>
                          </div>
                        </div>
                        <div className="py-1.5 px-3 bg-primary/10 rounded-lg">
                          <span className="text-sm text-primary font-medium">
                            {selfPickupSelections[fid]
                              ? `${format(selfPickupSelections[fid].date, "d MMMM", { locale: ru })} ${selfPickupSelections[fid].time}`
                              : pickupResult.text}
                          </span>
                        </div>
                        {/* Date/time picker for this seller */}
                        <Popover
                          open={selfPickupPopoverOpen[fid] || false}
                          onOpenChange={(open) => setSelfPickupPopoverOpen((prev) => ({ ...prev, [fid]: open }))}
                        >
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal text-xs">
                              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                              {selfPickupSelections[fid]
                                ? "Изменить время и дату"
                                : "Выбрать время и дату"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 max-w-[calc(100vw-2rem)]" align="start">
                            <Calendar
                              mode="single"
                              selected={selfPickupSelections[fid]?.date}
                              onSelect={(date) => {
                                if (date) {
                                  setSelfPickupSelections((prev) => {
                                    const next = { ...prev };
                                    if (next[fid]) {
                                      next[fid] = { ...next[fid], date, time: "" };
                                    } else {
                                      next[fid] = { date, time: "" };
                                    }
                                    return next;
                                  });
                                }
                              }}
                              disabled={(date) => isDateDisabledForSeller(date, fid)}
                              className="pointer-events-auto"
                              locale={ru}
                            />
                            {selfPickupSelections[fid]?.date && (
                              <div className="p-3 border-t border-border">
                                <Label className="text-sm mb-2 block">Время:</Label>
                                {(() => {
                                  const slots = getSellerTimeSlots(fid, selfPickupSelections[fid].date);
                                  return slots.length > 0 ? (
                                    <Select
                                      value={selfPickupSelections[fid]?.time || ""}
                                      onValueChange={(time) => {
                                        setSelfPickupSelections((prev) => ({
                                          ...prev,
                                          [fid]: { ...prev[fid], time }
                                        }));
                                        setSelfPickupPopoverOpen((prev) => ({ ...prev, [fid]: false }));
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Выберите время" />
                                      </SelectTrigger>
                                      <SelectContent className="bg-popover">
                                        {slots.map((slot) => (
                                          <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">Нет доступного времени</p>
                                  );
                                })()}
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>
                        {/* Items list */}
                        {groupItems.map((item) =>
                    <div key={getItemKey(item)} className="py-1.5 px-3 bg-secondary/30 rounded-lg">
                            <p className="text-sm text-foreground">
                              {item.product.name}
                              {item.variant && <span className="text-muted-foreground"> ({item.variant.label})</span>}
                              {" "}× {item.quantity}
                            </p>
                            {item.customFields && item.customFields.length > 0 && (
                              <div className="mt-0.5 space-y-0.5">
                                {item.customFields.map((cf, i) => (
                                  <p key={i} className="text-xs text-muted-foreground">{cf.label}: <span className="font-medium">«{cf.value}»</span></p>
                                ))}
                              </div>
                            )}
                            {item.addons && item.addons.length > 0 && (
                              <div className="mt-0.5 space-y-0.5">
                                {item.addons.map((a, i) => {
                                  const ap = formatPrice(a.price);
                                  return <p key={i} className="text-xs text-muted-foreground">+ {a.name}{a.price > 0 && <> ({ap.formatted}<BynSymbol />)</>}</p>;
                                })}
                              </div>
                            )}
                          </div>
                    )}
                      </div>);

              });
            })()}
              </div>
              <p className="text-[10px] text-muted-foreground/70 text-center mt-3">
                Точный адрес самовывоза отправим на телефон после оплаты
              </p>
            </div>}
        </div>

        {/* Payment method on delivery */}
        <div className="rounded-2xl bg-card px-4 py-2.5 shadow-sm mb-4">
          <h2 className="font-bold text-foreground mb-2 text-sm">Оплата при получении</h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod("cash")}
              className={`rounded-lg border-2 px-2 py-1.5 text-xs font-medium transition-colors ${
                paymentMethod === "cash"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-foreground"
              }`}
            >
              Наличные
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("card")}
              className={`rounded-lg border-2 px-2 py-1.5 text-xs font-medium transition-colors ${
                paymentMethod === "card"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-foreground"
              }`}
            >
              Карта
            </button>
          </div>
        </div>

        {/* Confirmation method */}
        <div className="rounded-2xl bg-card px-4 py-2.5 shadow-sm mb-4">
          <h2 className="font-bold text-foreground mb-2 text-sm">Как подтвердить заказ?</h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setConfirmationMethod("call")}
              className={`rounded-lg border-2 px-2 py-1.5 text-xs font-medium transition-colors ${
                confirmationMethod === "call"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-foreground"
              }`}
            >
              Позвонить
            </button>
            <button
              type="button"
              onClick={() => setConfirmationMethod("message")}
              className={`rounded-lg border-2 px-2 py-1.5 text-xs font-medium transition-colors ${
                confirmationMethod === "message"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-foreground"
              }`}
            >
              Написать
            </button>
          </div>
        </div>

        {/* Order summary */}
        <div className="rounded-2xl bg-card p-4 shadow-sm">
          <h2 className="font-bold text-foreground mb-3">Итого</h2>
          
          <div className="space-y-2 text-sm mb-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Товары:</span>
              <span className="text-foreground">{formatPrice(totalPrice).formatted}<BynSymbol /></span>
            </div>
            {deliveryType === "courier" && <div className="flex justify-between">
                <span className="text-muted-foreground">Доставка:</span>
                <span className="text-foreground">6,90<BynSymbol /></span>
              </div>}
          </div>
          
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
            <span>К оплате:</span>
            <span className="text-primary">
              {priceFormatted.formatted}<BynSymbol />
            </span>
          </div>
        </div>
      </main>

      {/* Checkout button */}
      <div className="fixed bottom-14 left-0 right-0 z-40 border-t border-border bg-card p-3 shadow-lg md:hidden">
        <Button className="w-full" size="lg" onClick={handleOrder} disabled={isLoading || !deliveryType || (deliveryType === "pickup" && (!selectedPoint || pickupPoints.length === 0)) || (deliveryType === "courier" && courierDeliveryMode === "fast" && noDeliveryAvailable) || (deliveryType === "courier" && courierDeliveryMode === "scheduled" && (!selectedDate || !selectedTime))}>
          {isLoading ? "Оформление..." : "Заказать"}
        </Button>
      </div>

      <BottomNavigation />
    </div>;
}