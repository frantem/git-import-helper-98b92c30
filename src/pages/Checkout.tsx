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
import { calculatePickupTime, calculatePickupReadyDate, PickupTimeResult, calculateDeliveryTime, calculateDeliveryTimePerSeller, DeliveryTimeResult, parseWorkingHoursEnd } from "@/lib/pickupUtils";
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
  house: string | null;
  entrance: string | null;
  apartment: string | null;
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

  // Helper: Get current time in Minsk timezone (UTC+3)
  const getMinskTime = () => {
    const now = new Date();
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utcTime + 3 * 60 * 60000);
  };

  // Calculate fast delivery time
  const fastDeliveryResult = useMemo<DeliveryTimeResult>(() => {
    // Find the item with the longest prep time — it's the bottleneck
    let slowestItem = items[0];
    let maxPrep = ((slowestItem?.product as any)?.prep_time_minutes || 90);
    for (const item of items) {
      const prep = (item.product as any).prep_time_minutes || 90;
      if (prep > maxPrep) {
        maxPrep = prep;
        slowestItem = item;
      }
    }
    // Use only the slowest seller's schedule
    const slowestFarmerId = slowestItem?.product.farmer_id;
    const sellerData = slowestFarmerId ? (() => {
      const s = sellerPickupSettings.get(slowestFarmerId);
      return [{
        farmerId: slowestFarmerId,
        pickupSlots: s?.pickup_slots as PickupSlots | null ?? null,
        busyDates: s?.busy_dates ?? null,
        vacationDates: s?.vacation_dates ?? null
      }];
    })() : [];
    // For pickup delivery type, respect pickup point working hours
    const selectedPointData = selectedPoint ? pickupPoints.find((p) => p.id === selectedPoint) : null;
    const ppEndMinutes = deliveryType === "pickup" ? parseWorkingHoursEnd(selectedPointData?.working_hours) ?? undefined : undefined;
    return calculateDeliveryTime(maxPrep, sellerData, adminSettings, ppEndMinutes);
  }, [items, sellerPickupSettings, adminSettings, deliveryType, selectedPoint, pickupPoints]);

  // Collect all busy/vacation dates from sellers in cart (for calendar blocking)
  const allBlockedDates = useMemo(() => {
    const blocked: Date[] = [];
    sellerPickupSettings.forEach((s) => {
      [...(s.busy_dates || []), ...(s.vacation_dates || [])].forEach((d) => {
        blocked.push(new Date(d + "T00:00:00"));
      });
    });
    return blocked;
  }, [sellerPickupSettings]);

  // Compute earliest delivery date from fastDeliveryResult
  const earliestDeliveryDate = useMemo<Date>(() => {
    const now = getMinskTime();
    const text = fastDeliveryResult.text;
    if (text.startsWith("Сегодня")) return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (text.startsWith("Завтра")) {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
    // Parse "DD.MM HH:MM–HH:MM"
    const match = text.match(/^(\d{2})\.(\d{2})/);
    if (match) {
      const day = parseInt(match[1]);
      const month = parseInt(match[2]) - 1;
      let year = now.getFullYear();
      const candidate = new Date(year, month, day);
      if (candidate < now) candidate.setFullYear(year + 1);
      return candidate;
    }
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, [fastDeliveryResult]);

  // Generate available time slots for selected date (using Minsk time)
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) return [];
    const slots: string[] = [];
    const { delivery_start_hour: startHour, delivery_end_hour: endHour } = adminSettings;

    // Check if selected date is the earliest delivery date
    const isEarliestDate =
      selectedDate.getFullYear() === earliestDeliveryDate.getFullYear() &&
      selectedDate.getMonth() === earliestDeliveryDate.getMonth() &&
      selectedDate.getDate() === earliestDeliveryDate.getDate();

    const minSlotMinutes = isEarliestDate ? fastDeliveryResult.earliestMinutes : startHour * 60;

    for (let hour = startHour; hour < endHour && hour < 24; hour++) {
      const slotMinutes = hour * 60;
      if (slotMinutes < minSlotMinutes) continue;
      const nextHour = hour + 1;
      slots.push(`${hour.toString().padStart(2, "0")}:00–${nextHour.toString().padStart(2, "0")}:00`);
    }
    return slots;
  }, [selectedDate, adminSettings, fastDeliveryResult, earliestDeliveryDate]);

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime(""); // Reset time when date changes
  };

  // Handle time selection and close popover
  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setIsDateTimePopoverOpen(false);
  };

  // Helper: generate time slots for a specific seller on a specific date (with carryover)
  const getSellerTimeSlots = (farmerId: string, date: Date): string[] => {
    const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
    const settings = sellerPickupSettings.get(farmerId);
    if (!settings?.pickup_slots) return [];
    const slots = settings.pickup_slots as PickupSlots;
    const dayKey = DAY_KEYS[date.getDay()];
    const daySlot = slots[dayKey];
    if (!daySlot || !daySlot.active) return [];

    const parseT = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    const slotStart = parseT(daySlot.start);
    const slotEnd = parseT(daySlot.end);

    // Check busy/vacation
    const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
    if (settings.busy_dates?.includes(dateStr)) return [];
    if (settings.vacation_dates?.includes(dateStr)) return [];

    // Get max prep time for this seller's items
    const farmerItems = items.filter((i) => i.product.farmer_id === farmerId);
    const maxPrep = Math.max(...farmerItems.map((i) => (i.product as any).prep_time_minutes || 90));

    // Calculate when the item is actually ready using carryover logic
    const readyResult = calculatePickupReadyDate(
      maxPrep,
      slots,
      settings.busy_dates,
      settings.vacation_dates,
    );

    if (!readyResult) return [];

    // Compare selected date with ready date
    const readyDateStr = `${readyResult.readyDate.getFullYear()}-${(readyResult.readyDate.getMonth() + 1).toString().padStart(2, "0")}-${readyResult.readyDate.getDate().toString().padStart(2, "0")}`;

    let earliestSlotMinutes = slotStart;

    if (dateStr === readyDateStr) {
      // On the ready date, slots start from readyTime
      earliestSlotMinutes = Math.max(slotStart, readyResult.readyTimeMinutes);
    } else if (date < readyResult.readyDate) {
      // Before ready date — no slots available
      return [];
    }
    // After ready date — full slot window available (earliestSlotMinutes = slotStart)

    const result: string[] = [];
    for (let hour = Math.floor(earliestSlotMinutes / 60); hour < Math.floor(slotEnd / 60) && hour < 24; hour++) {
      const startMin = hour * 60;
      const endMin = (hour + 1) * 60;
      if (startMin < earliestSlotMinutes) continue;
      if (endMin > slotEnd) continue;

      result.push(`${hour.toString().padStart(2, "0")}:00\u2013${(hour + 1).toString().padStart(2, "0")}:00`);
    }
    return result;
  };

  // Check if a date is disabled for a specific seller (with carryover)
  const isDateDisabledForSeller = (date: Date, farmerId: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;

    const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
    const settings = sellerPickupSettings.get(farmerId);
    if (!settings?.pickup_slots) return true;
    const slots = settings.pickup_slots as PickupSlots;
    const dayKey = DAY_KEYS[date.getDay()];
    const daySlot = slots[dayKey];
    if (!daySlot || !daySlot.active) return true;

    // Check busy/vacation dates
    const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
    if (settings.busy_dates?.includes(dateStr)) return true;
    if (settings.vacation_dates?.includes(dateStr)) return true;

    // Get max prep time for this seller's items
    const farmerItems = items.filter((i) => i.product.farmer_id === farmerId);
    const maxPrep = Math.max(...farmerItems.map((i) => (i.product as any).prep_time_minutes || 90));

    // Calculate when the item is actually ready using carryover logic
    const readyResult = calculatePickupReadyDate(
      maxPrep,
      slots,
      settings.busy_dates,
      settings.vacation_dates,
    );

    if (!readyResult) return true;

    // Date is available if it's on or after the ready date
    const readyDateOnly = new Date(readyResult.readyDate);
    readyDateOnly.setHours(0, 0, 0, 0);
    const checkDateOnly = new Date(date);
    checkDateOnly.setHours(0, 0, 0, 0);

    if (checkDateOnly < readyDateOnly) return true;

    // On the ready date, check if there are actually slots available
    if (checkDateOnly.getTime() === readyDateOnly.getTime()) {
      return getSellerTimeSlots(farmerId, date).length === 0;
    }

    return false;
  };

  // Calculate delivery cost
  const deliveryCost = deliveryType === "courier" ? 700 : 0; // 7р = 700 kopecks
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
    } = await supabase.from("farmers").select("id, name, city, street, house, entrance, apartment, district").in("id", farmerIds);
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
            const maxPrep = Math.max(...farmerItems.map((i) => (i.product as any).prep_time_minutes || 90));
            const result = calculatePickupTime(
              maxPrep,
              s?.pickup_slots as PickupSlots | null ?? null,
              s?.max_orders_per_day ?? 5,
              s?.busy_dates ?? null,
              s?.vacation_dates ?? null,
              orderCountsMap,
              fid
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
        })()
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
          custom_fields: hasData ? JSON.stringify(customFieldsData) : null
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

      // Meta Pixel + Conversions API Purchase event
      const totalRubles = Math.floor(finalTotalPrice / 100);
      const eventId = crypto.randomUUID();

      // Client-side pixel (for users without ad blockers)
      window.fbq?.('track', 'Purchase', {
        value: totalRubles,
        currency: 'BYN'
      }, { eventID: eventId });

      // Server-side CAPI (bypasses ad blockers)
      supabase.functions.invoke("meta-conversions-api", {
        body: {
          event_name: "Purchase",
          event_id: eventId,
          value: totalRubles,
          currency: "BYN",
          event_source_url: window.location.href,
          user_agent: navigator.userAgent
        }
      }).catch((err) => console.error("Meta CAPI error:", err));

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
        <div className="flex gap-3">
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
  return <div className="min-h-screen bg-background pb-32 md:pb-0">
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
            {/* Pickup point option */}
            <div className="relative flex items-start gap-3 py-3 px-3 rounded-lg bg-muted/60 opacity-60 cursor-not-allowed select-none">
              <RadioGroupItem value="pickup" id="delivery-pickup" className="mt-1" disabled />
              <Label htmlFor="delivery-pickup" className="flex-1 cursor-not-allowed">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-muted-foreground">Пункт выдачи</span>
                  </div>
                  <span className="text-muted-foreground font-medium">Бесплатно</span>
                </div>
              </Label>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-muted-foreground/80 text-background text-xs font-bold px-3 py-1 rounded-full">В разработке</span>
              </div>
            </div>

            {/* Courier delivery option */}
            <div className={`flex items-start gap-3 py-3 px-3 rounded-lg cursor-pointer transition-colors ${deliveryType === "courier" ? "bg-primary/10 border border-primary/30" : "hover:bg-secondary/50"}`} onClick={() => setDeliveryType("courier")}>
              <RadioGroupItem value="courier" id="delivery-courier" className="mt-1" />
              <Label htmlFor="delivery-courier" className="flex-1 cursor-pointer">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">Доставка на дом</span>
                  </div>
                  <span className="text-foreground font-medium">7<BynSymbol /></span>
                </div>
              </Label>
            </div>

            {/* Self-pickup option */}
            <div className={`flex items-start gap-3 py-3 px-3 rounded-lg cursor-pointer transition-colors ${deliveryType === "self" ? "bg-primary/10 border border-primary/30" : "hover:bg-secondary/50"}`} onClick={() => setDeliveryType("self")}>
              <RadioGroupItem value="self" id="delivery-self" className="mt-1" />
              <Label htmlFor="delivery-self" className="flex-1 cursor-pointer">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">Самовывоз</span>
                  </div>
                  <span className="text-primary font-medium">Бесплатно</span>
                </div>
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
                const maxPrep = Math.max(...groupItems.map((i) => (i.product as any).prep_time_minutes || 90));
                const ppData = selectedPoint ? pickupPoints.find((p) => p.id === selectedPoint) : null;
                const ppEnd = parseWorkingHoursEnd(ppData?.working_hours) ?? undefined;
                const deliveryResult = calculateDeliveryTimePerSeller(
                  maxPrep,
                  settings?.pickup_slots as PickupSlots | null ?? null,
                  settings?.busy_dates ?? null,
                  settings?.vacation_dates ?? null,
                  adminSettings,
                  ppEnd
                );
                return (
                  <div key={fid} className="space-y-1">
                        {groupItems.map((item) =>
                    <div key={getItemKey(item)} className="flex justify-between items-center py-2 px-3 bg-secondary/30 rounded-lg">
                            <span className="text-sm text-foreground">{item.product.name} × {item.quantity}</span>
                            <span className="text-xs text-primary font-medium">{deliveryResult.text}</span>
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
                      Привезем ваш заказ: {fastDeliveryResult.text}
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
                  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                  if (dateOnly < earliestDeliveryDate) return true;
                  // Block busy/vacation dates of all sellers
                  return allBlockedDates.some((bd) =>
                  bd.getFullYear() === date.getFullYear() &&
                  bd.getMonth() === date.getMonth() &&
                  bd.getDate() === date.getDate()
                  );
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
                </div>
          }

              {/* Freshness text */}
              <p className="text-xs text-muted-foreground text-center">
                Товары готовятся под указанное время, поэтому они всегда свежие и вкусные
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
                const maxPrep = Math.max(...groupItems.map((i) => (i.product as any).prep_time_minutes || 90));

                const pickupResult = calculatePickupTime(
                  maxPrep,
                  settings?.pickup_slots as PickupSlots | null | undefined,
                  settings?.max_orders_per_day ?? 5,
                  settings?.busy_dates,
                  settings?.vacation_dates,
                  orderCountsMap,
                  fid
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
                            <p className="text-sm text-foreground">{item.product.name} × {item.quantity}</p>
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

        {/* Payment info */}
        

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
                <span className="text-foreground">7<BynSymbol /></span>
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
        <Button className="w-full" size="lg" onClick={handleOrder} disabled={isLoading || !deliveryType || deliveryType === "pickup" && (!selectedPoint || pickupPoints.length === 0)}>
          {isLoading ? "Оформление..." : "Оплатить"}
        </Button>
      </div>

      <BottomNavigation />
    </div>;
}