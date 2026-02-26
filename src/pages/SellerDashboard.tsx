import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatPrice, parseRublesToKopecks, kopecksToRublesString } from "@/lib/priceUtils";
import { Package, ShoppingBag, Settings, Plus, Pencil, Trash2, Check, Upload, Camera, X, ArrowLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import PickupSettingsSection, { PickupSlots, DEFAULT_PICKUP_SLOTS } from "@/components/PickupSettingsSection";

interface Product {
  id: string;
  title: string;
  price: number;
  old_price: number | null;
  unit: string;
  image_url: string | null;
  description: string | null;
  category_id: string;
  is_active: boolean;
}

interface ProductImage {
  id: string;
  image_url: string;
  sort_order: number;
}

interface ProductVariant {
  id?: string;
  label: string;
  price: number; // Stored in kopecks
  discount_percent: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface CustomFieldLocal {
  id?: string;
  field_type: "text" | "select";
  label: string;
  placeholder: string;
  max_length: number;
  options: { id?: string; label: string }[];
}

interface AddonLocal {
  id?: string;
  name: string;
  price: string; // rubles input string
  selection_type: "checkbox" | "radio";
}

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  status: string;
  variant_label: string | null;
  custom_fields: {
    fields?: Array<{ fieldId: string; label: string; value: string; fieldType: string }>;
    addons?: Array<{ addonId: string; name: string; price: number }>;
  } | null;
  product: {
    title: string;
  } | null;
  order: {
    created_at: string;
    buyer_id: string;
    pickup_point: {
      name: string;
    } | null;
  } | null;
}

interface Farmer {
  id: string;
  name: string;
  description: string | null;
  district: string;
  village: string | null;
  photo_url: string | null;
}

export default function SellerDashboard() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Product form state
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [mainVariant, setMainVariant] = useState<ProductVariant>({
    label: "шт",
    price: 0,
    discount_percent: 0,
  });
  const [productForm, setProductForm] = useState({
    title: "",
    description: "",
    category_id: "",
    image_url: "",
    prep_time_minutes: "" as any,
    composition: "",
    calories: "" as any,
    protein: "" as any,
    fat: "" as any,
    carbs: "" as any,
    shelf_life: "",
  });
  const [customFields, setCustomFields] = useState<CustomFieldLocal[]>([]);
  const [productAddons, setProductAddons] = useState<AddonLocal[]>([]);
  // Separate string states for price inputs (to allow typing decimal separators)
  const [mainPriceInput, setMainPriceInput] = useState("");
  const [variantPriceInputs, setVariantPriceInputs] = useState<Record<number, string>>({});

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    name: "",
    description: "",
    district: "",
    village: "",
    photo_url: "",
    city: "",
    street: "",
  });

  // Pickup settings state
  const [pickupSlots, setPickupSlots] = useState<PickupSlots>(DEFAULT_PICKUP_SLOTS);
  const [maxOrdersPerDay, setMaxOrdersPerDay] = useState(5);
  const [busyDates, setBusyDates] = useState<Date[]>([]);
  const [vacationDates, setVacationDates] = useState<Date[]>([]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (role !== "seller" && role !== "admin") {
      navigate("/");
      return;
    }
    fetchData();
  }, [user, role]);

  const fetchData = async () => {
    // Fetch farmer profile
    const { data: farmerData } = await supabase
      .from("farmers")
      .select("*")
      .eq("user_id", user?.id)
      .maybeSingle();

    if (farmerData) {
      setFarmer(farmerData);
      setSettingsForm({
        name: farmerData.name,
        description: farmerData.description || "",
        district: farmerData.district,
        village: farmerData.village || "",
        photo_url: farmerData.photo_url || "",
        city: (farmerData as any).city || "",
        street: (farmerData as any).street || "",
      });

      // Fetch pickup settings from profiles
      const { data: profileData } = await supabase
        .from("profiles")
        .select("pickup_slots, max_orders_per_day, busy_dates, vacation_dates")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (profileData) {
        if (profileData.pickup_slots) {
          setPickupSlots(profileData.pickup_slots as unknown as PickupSlots);
        }
        if (profileData.max_orders_per_day != null) {
          setMaxOrdersPerDay(profileData.max_orders_per_day as number);
        }
        if (profileData.busy_dates) {
          setBusyDates((profileData.busy_dates as unknown as string[]).map((d: string) => new Date(d + "T00:00:00")));
        }
        if (profileData.vacation_dates) {
          setVacationDates((profileData.vacation_dates as unknown as string[]).map((d: string) => new Date(d + "T00:00:00")));
        }
      }

      // Fetch products (all - active and inactive)
      const { data: productsData } = await supabase
        .from("products")
        .select("*")
        .eq("farmer_id", farmerData.id)
        .order("is_active", { ascending: false })
        .order("created_at", { ascending: false });

      if (productsData) {
        setProducts(productsData);
      }

      // Fetch order items
      const { data: orderItemsData } = await supabase
        .from("order_items")
        .select(`
          id,
          quantity,
          unit_price,
          status,
          variant_label,
          custom_fields,
          product:products(title),
          order:orders(created_at, buyer_id, pickup_point:pickup_points(name))
        `)
        .eq("farmer_id", farmerData.id)
        .order("created_at", { ascending: false });

      if (orderItemsData) {
        setOrderItems(orderItemsData as OrderItem[]);
      }
    }

    // Fetch categories
    const { data: categoriesData } = await supabase
      .from("categories")
      .select("id, name, slug")
      .order("sort_order");

    if (categoriesData) {
      setCategories(categoriesData);
    }

    setIsLoading(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingImage(true);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, file);

    if (uploadError) {
      toast.error("Ошибка загрузки изображения");
      setUploadingImage(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    // If no main image yet, set it as main
    if (!productForm.image_url) {
      setProductForm({ ...productForm, image_url: publicUrl });
    } else {
      // Add to additional images
      setProductImages([...productImages, publicUrl]);
    }
    setUploadingImage(false);
    toast.success("Изображение загружено");
  };

  const removeAdditionalImage = (index: number) => {
    setProductImages(productImages.filter((_, i) => i !== index));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('farmer-avatars')
      .upload(fileName, file);

    if (uploadError) {
      toast.error("Ошибка загрузки фото");
      setUploadingAvatar(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('farmer-avatars')
      .getPublicUrl(fileName);

    setSettingsForm({ ...settingsForm, photo_url: publicUrl });
    setUploadingAvatar(false);
    toast.success("Фото загружено");
  };

  // Save custom fields for a product (delete existing + re-insert)
  const saveCustomFields = async (productId: string) => {
    // With CASCADE DELETE on options FK, deleting fields auto-deletes options
    const { error: deleteError } = await (supabase as any)
      .from("product_custom_fields")
      .delete()
      .eq("product_id", productId);

    if (deleteError) {
      console.error("Error deleting custom fields:", deleteError);
      throw new Error("Ошибка удаления кастомных полей");
    }

    if (customFields.length === 0) return;

    for (let i = 0; i < customFields.length; i++) {
      const field = customFields[i];
      const { data: insertedField, error: insertError } = await (supabase as any)
        .from("product_custom_fields")
        .insert({
          product_id: productId,
          field_type: field.field_type,
          label: field.label,
          placeholder: field.placeholder || null,
          max_length: field.field_type === "text" ? (field.max_length || 50) : null,
          sort_order: i,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error inserting custom field:", insertError);
        throw new Error("Ошибка сохранения кастомного поля: " + field.label);
      }

      if (insertedField && field.options.length > 0) {
        const optionsToInsert = field.options.map((opt: { label: string }, j: number) => ({
          field_id: insertedField.id,
          label: opt.label,
          sort_order: j,
        }));
        const { error: optError } = await (supabase as any).from("product_custom_field_options").insert(optionsToInsert);
        if (optError) {
          console.error("Error inserting custom field options:", optError);
          throw new Error("Ошибка сохранения вариантов поля: " + field.label);
        }
      }
    }
  };

  // Save addons for a product (delete existing + re-insert)
  const saveAddons = async (productId: string) => {
    await supabase
      .from("product_addons")
      .delete()
      .eq("product_id", productId);

    if (productAddons.length === 0) return;

    const addonsToInsert = productAddons.map((addon, i) => ({
      product_id: productId,
      name: addon.name,
      price: parseRublesToKopecks(addon.price),
      selection_type: addon.selection_type,
      sort_order: i,
    }));
    await supabase.from("product_addons").insert(addonsToInsert);
  };

  const handleSaveProduct = async () => {
    if (!farmer || isSaving) return;

    // Validate required fields
    if (!productForm.title.trim()) {
      toast.error("Введите название товара");
      return;
    }
    
    if (selectedCategoryIds.length === 0) {
      toast.error("Выберите хотя бы одну категорию");
      return;
    }

    if (!productForm.composition.trim() || !productForm.shelf_life.trim() ||
        productForm.calories === "" || productForm.protein === "" ||
        productForm.fat === "" || productForm.carbs === "") {
      toast.error("Заполните состав, КБЖУ и срок хранения");
      return;
    }

    // prep_time_minutes is optional - default to 0 ("В наличии")

    setIsSaving(true);

    try {
      // Main price from mainVariant (already in kopecks)
      const priceInKopecks = mainVariant.price;
    // Calculate old_price from discount
    const oldPriceInKopecks = mainVariant.discount_percent > 0
      ? Math.round(priceInKopecks / (1 - mainVariant.discount_percent / 100))
      : null;

    const productData = {
      title: productForm.title,
      description: productForm.description || null,
      price: priceInKopecks,
      old_price: oldPriceInKopecks,
      unit: mainVariant.label,
      category_id: selectedCategoryIds[0],
      image_url: productForm.image_url || null,
      farmer_id: farmer.id,
      prep_time_minutes: productForm.prep_time_minutes || 0,
      composition: productForm.composition || null,
      calories: productForm.calories !== "" ? parseFloat(String(productForm.calories).replace(',', '.')) : null,
      protein: productForm.protein !== "" ? parseFloat(String(productForm.protein).replace(',', '.')) : null,
      fat: productForm.fat !== "" ? parseFloat(String(productForm.fat).replace(',', '.')) : null,
      carbs: productForm.carbs !== "" ? parseFloat(String(productForm.carbs).replace(',', '.')) : null,
      shelf_life: productForm.shelf_life || null,
    };

    if (editingProduct) {
      const { error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", editingProduct.id);

      if (error) {
        toast.error("Ошибка при обновлении товара");
      } else {
        const productId = editingProduct.id;

        // Run all independent save operations in parallel
        await Promise.all([
          // Images
          (async () => {
            await supabase.from("product_images").delete().eq("product_id", productId);
            if (productImages.length > 0) {
              await supabase.from("product_images").insert(
                productImages.map((url, index) => ({ product_id: productId, image_url: url, sort_order: index }))
              );
            }
          })(),
          // Categories
          (async () => {
            const { error: delErr } = await supabase.from("product_categories").delete().eq("product_id", productId);
            if (delErr) console.error("Error deleting categories:", delErr);
            if (selectedCategoryIds.length > 0) {
              const { error: insErr } = await supabase.from("product_categories").insert(
                selectedCategoryIds.map((catId) => ({ product_id: productId, category_id: catId }))
              );
              if (insErr) console.error("Error inserting categories:", insErr);
            }
          })(),
          // Variants
          (async () => {
            await supabase.from("product_variants").delete().eq("product_id", productId);
            const allVariants = [
              { product_id: productId, label: mainVariant.label, price: mainVariant.price, unit: mainVariant.label, is_default: true, sort_order: 0, discount_percent: mainVariant.discount_percent || 0 },
              ...productVariants.map((v, index) => ({ product_id: productId, label: v.label, price: v.price, unit: v.label, is_default: false, sort_order: index + 1, discount_percent: v.discount_percent || 0 }))
            ];
            await supabase.from("product_variants").insert(allVariants);
          })(),
          // Custom fields
          saveCustomFields(productId),
          // Addons
          saveAddons(productId),
        ]);
        
        // Optimistic local update instead of full fetchData()
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...productData } : p));
        toast.success("Товар обновлён");
      }
    } else {
      const { data: newProduct, error } = await supabase
        .from("products")
        .insert(productData)
        .select()
        .single();

      if (error) {
        toast.error("Ошибка при создании товара");
      } else {
        const pid = newProduct.id;
        // Run all independent save operations in parallel
        await Promise.all([
          // Images
          productImages.length > 0
            ? supabase.from("product_images").insert(productImages.map((url, index) => ({ product_id: pid, image_url: url, sort_order: index })))
            : Promise.resolve(),
          // Categories
          selectedCategoryIds.length > 0
            ? supabase.from("product_categories").insert(selectedCategoryIds.map((catId) => ({ product_id: pid, category_id: catId })))
            : Promise.resolve(),
          // Variants
          supabase.from("product_variants").insert([
            { product_id: pid, label: mainVariant.label, price: mainVariant.price, unit: mainVariant.label, is_default: true, sort_order: 0, discount_percent: mainVariant.discount_percent || 0 },
            ...productVariants.map((v, index) => ({ product_id: pid, label: v.label, price: v.price, unit: v.label, is_default: false, sort_order: index + 1, discount_percent: v.discount_percent || 0 }))
          ]),
          // Custom fields
          saveCustomFields(pid),
          // Addons
          saveAddons(pid),
        ]);

        // Optimistic update
        setProducts(prev => [newProduct, ...prev]);
        toast.success("Товар добавлен");
      }
    }
    } finally {
      setIsSaving(false);
      resetProductForm();
    }
  };

  const confirmDeleteProduct = (productId: string) => {
    setDeleteConfirmId(productId);
  };

  const handleDeleteProduct = async () => {
    if (!deleteConfirmId || isDeleting) return;

    setIsDeleting(true);

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", deleteConfirmId);

    setIsDeleting(false);
    setDeleteConfirmId(null);

    if (error) {
      console.error("Delete error:", error);
      toast.error("Ошибка при удалении товара: " + error.message);
    } else {
      toast.success("Товар удалён");
      fetchData();
    }
  };

  const handleToggleActive = async (productId: string, currentState: boolean) => {
    const { error } = await supabase
      .from("products")
      .update({ 
        is_active: !currentState,
        archived_at: currentState ? new Date().toISOString() : null
      })
      .eq("id", productId);

    if (error) {
      toast.error("Ошибка при изменении статуса");
    } else {
      toast.success(currentState ? "Товар скрыт" : "Товар активирован");
      fetchData();
    }
  };

  const handleEditProduct = async (product: Product) => {
    // Fetch additional images
    const { data: imagesData } = await supabase
      .from("product_images")
      .select("image_url")
      .eq("product_id", product.id)
      .order("sort_order");

    // Fetch variants
    const { data: variantsData } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", product.id)
      .order("sort_order");

    // Fetch product categories (many-to-many)
    const { data: productCategoriesData } = await supabase
      .from("product_categories")
      .select("category_id")
      .eq("product_id", product.id);

    setEditingProduct(product);
    setProductForm({
      title: product.title,
      description: product.description || "",
      category_id: product.category_id,
      image_url: product.image_url || "",
      prep_time_minutes: (product as any).prep_time_minutes || "",
      composition: (product as any).composition || "",
      calories: (product as any).calories ?? "",
      protein: (product as any).protein ?? "",
      fat: (product as any).fat ?? "",
      carbs: (product as any).carbs ?? "",
      shelf_life: (product as any).shelf_life || "",
    });
    setProductImages(imagesData?.map(img => img.image_url) || []);
    
    // Set selected categories - fallback to legacy category_id if no product_categories
    const categoryIds = productCategoriesData?.map(pc => pc.category_id) || [];
    setSelectedCategoryIds(categoryIds.length > 0 ? categoryIds : [product.category_id]);
    
    // First variant is mainVariant, rest are additional variants
    // Prices are stored in kopecks, keep them as kopecks
    if (variantsData && variantsData.length > 0) {
      const firstVariant = variantsData[0];
      setMainVariant({
        id: firstVariant.id,
        label: firstVariant.label,
        price: firstVariant.price, // Already in kopecks
        discount_percent: (firstVariant as any).discount_percent || 0,
      });
      // Set main price input string
      setMainPriceInput(kopecksToRublesString(firstVariant.price));
      
      const additionalVariants = variantsData.slice(1).map(v => ({
        id: v.id,
        label: v.label,
        price: v.price, // Already in kopecks
        discount_percent: (v as any).discount_percent || 0,
      }));
      setProductVariants(additionalVariants);
      
      // Set variant price input strings
      const priceInputs: Record<number, string> = {};
      additionalVariants.forEach((v, i) => {
        priceInputs[i] = kopecksToRublesString(v.price);
      });
      setVariantPriceInputs(priceInputs);
    } else {
      // Fallback to product data if no variants (price already in kopecks)
      setMainVariant({
        label: product.unit,
        price: product.price, // Already in kopecks
        discount_percent: product.old_price ? Math.round((1 - product.price / product.old_price) * 100) : 0,
      });
      setMainPriceInput(kopecksToRublesString(product.price));
      setProductVariants([]);
      setVariantPriceInputs({});
    }
    // Fetch custom fields
    const { data: customFieldsData } = await (supabase as any)
      .from("product_custom_fields")
      .select("*")
      .eq("product_id", product.id)
      .order("sort_order");

    if (customFieldsData && customFieldsData.length > 0) {
      const fieldIds = customFieldsData.map((f: any) => f.id);
      const { data: optionsData } = await (supabase as any)
        .from("product_custom_field_options")
        .select("*")
        .in("field_id", fieldIds)
        .order("sort_order");

      setCustomFields(
        customFieldsData.map((f: any) => ({
          id: f.id,
          field_type: f.field_type as "text" | "select",
          label: f.label,
          placeholder: f.placeholder || "",
          max_length: f.max_length || 50,
          options: (optionsData || [])
            .filter((o: any) => o.field_id === f.id)
            .map((o: any) => ({ id: o.id, label: o.label })),
        }))
      );
    } else {
      setCustomFields([]);
    }

    // Fetch addons
    const { data: addonsData } = await supabase
      .from("product_addons")
      .select("*")
      .eq("product_id", product.id)
      .order("sort_order");

    if (addonsData && addonsData.length > 0) {
      setProductAddons(
        addonsData.map((a: any) => ({
          id: a.id,
          name: a.name,
          price: kopecksToRublesString(a.price),
          selection_type: a.selection_type as "checkbox" | "radio",
        }))
      );
    } else {
      setProductAddons([]);
    }

    setShowProductForm(true);
  };

  const resetProductForm = () => {
    setShowProductForm(false);
    setEditingProduct(null);
    setProductImages([]);
    setProductVariants([]);
    setSelectedCategoryIds([]);
    setCustomFields([]);
    setMainVariant({
      label: "шт",
      price: 0,
      discount_percent: 0,
    });
    setProductForm({
      title: "",
      description: "",
      category_id: "",
      image_url: "",
      prep_time_minutes: "" as any,
      composition: "",
      calories: "" as any,
      protein: "" as any,
      fat: "" as any,
      carbs: "" as any,
      shelf_life: "",
    });
    // Reset price input strings
    setMainPriceInput("");
    setVariantPriceInputs({});
    setProductAddons([]);
  };

  // Variants helpers
  const addVariant = () => {
    setProductVariants([
      ...productVariants,
      { label: "", price: 0, discount_percent: 0 }
    ]);
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: string | number) => {
    const updated = [...productVariants];
    (updated[index] as any)[field] = value;
    setProductVariants(updated);
  };

  const removeVariant = (index: number) => {
    setProductVariants(productVariants.filter((_, i) => i !== index));
  };

  const handleMarkCollected = async (itemId: string) => {
    const { error } = await supabase
      .from("order_items")
      .update({ status: "collected" })
      .eq("id", itemId);

    if (error) {
      toast.error("Ошибка при обновлении статуса");
    } else {
      toast.success("Статус обновлён");
      fetchData();
    }
  };

  const handleSaveSettings = async () => {
    if (!farmer) return;

    const { error } = await supabase
      .from("farmers")
      .update({
        name: settingsForm.name,
        description: settingsForm.description || null,
        district: settingsForm.district,
        village: settingsForm.village || null,
        photo_url: settingsForm.photo_url || null,
        city: settingsForm.city || null,
        street: settingsForm.street || null,
      })
      .eq("id", farmer.id);

    if (error) {
      toast.error("Ошибка при сохранении");
      return;
    }

    // Save pickup settings to profiles
    const formatDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        pickup_slots: pickupSlots as any,
        max_orders_per_day: maxOrdersPerDay,
        busy_dates: busyDates.map(formatDate),
        vacation_dates: vacationDates.map(formatDate),
      } as any)
      .eq("user_id", user!.id);

    if (profileError) {
      toast.error("Ошибка сохранения настроек выдачи");
    } else {
      toast.success("Настройки сохранены");
      fetchData();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Header />
        <main className="container mx-auto px-4 py-16 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </main>
        <BottomNavigation />
      </div>
    );
  }

  if (!farmer) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Header />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-xl font-bold text-foreground mb-2">Профиль продавца не найден</h1>
          <p className="text-muted-foreground mb-4">
            Свяжитесь с администрацией для создания профиля продавца
          </p>
          <Button onClick={() => navigate("/profile")}>Вернуться в профиль</Button>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />

      <main className="container mx-auto px-3 py-4">
        <PageHeader title={farmer.name} backPath="/profile" />

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="products" className="flex items-center gap-1">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Товары</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-1 relative">
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Заказы</span>
              {orderItems.filter(o => o.status === "pending").length > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {orderItems.filter(o => o.status === "pending").length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Настройки</span>
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-medium text-foreground">Мои товары ({products.length})</h2>
              <Button size="sm" onClick={() => { resetProductForm(); setShowProductForm(true); }}>
                <Plus className="h-4 w-4 mr-1" />
                Добавить
              </Button>
            </div>

            {products.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                У вас пока нет товаров
              </div>
            ) : (
              <div className="space-y-2">
                {products.map((product) => {
                  const price = formatPrice(product.price);
                  return (
                    <div 
                      key={product.id} 
                      className={`flex items-center gap-3 rounded-xl bg-card p-3 ${!product.is_active ? 'opacity-50' : ''}`}
                    >
                      <img
                        src={product.image_url || "https://placehold.co/60x60"}
                        alt={product.title}
                        className="h-14 w-14 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate">{product.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {price.rubles} р. {price.kopecks > 0 && `${price.kopecks} к.`} / {product.unit}
                          {!product.is_active && <span className="ml-2 text-destructive">• Скрыт</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={product.is_active}
                          onCheckedChange={() => handleToggleActive(product.id, product.is_active)}
                        />
                        <Button variant="ghost" size="icon" onClick={() => handleEditProduct(product)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => confirmDeleteProduct(product.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <h2 className="font-medium text-foreground">Заказы</h2>

            {orderItems.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Пока нет заказов
              </div>
            ) : (
              <div className="space-y-2">
                {orderItems.map((item) => {
                  const price = formatPrice(item.unit_price * item.quantity);
                  const isCollected = item.status === "collected";
                  
                  return (
                    <div key={item.id} className="rounded-xl bg-card p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-foreground">
                            {item.product?.title || "Товар"}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {item.quantity} шт × {formatPrice(item.unit_price).rubles} р.
                          </p>
                          {item.variant_label && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Вариант: <span className="font-medium">{item.variant_label}</span>
                            </p>
                          )}
                          {item.custom_fields?.fields && item.custom_fields.fields.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {item.custom_fields.fields.map((field, idx) => (
                                <p key={idx} className="text-xs text-muted-foreground">
                                  {field.label}: <span className="font-medium">«{field.value}»</span>
                                </p>
                              ))}
                            </div>
                          )}
                          {item.custom_fields?.addons && item.custom_fields.addons.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {item.custom_fields.addons.map((addon, idx) => {
                                const addonPrice = formatPrice(addon.price);
                                return (
                                  <p key={idx} className="text-xs text-muted-foreground">
                                    + {addon.name}{addon.price > 0 && ` (${addonPrice.rubles}${addonPrice.kopecks > 0 ? `,${addonPrice.kopecks.toString().padStart(2,'0')}` : ''} р.)`}
                                  </p>
                                );
                              })}
                            </div>
                          )}
                          {item.order?.pickup_point && (
                            <p className="text-xs text-muted-foreground mt-1">
                              📍 {item.order.pickup_point.name}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-foreground">
                            {price.rubles} р. {price.kopecks > 0 && `${price.kopecks} к.`}
                          </p>
                          {isCollected ? (
                            <span className="text-xs text-success">✓ Собран</span>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-1"
                              onClick={() => handleMarkCollected(item.id)}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Собран
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <h2 className="font-medium text-foreground">Настройки</h2>

            <div className="space-y-4 rounded-xl bg-card p-4">
              {/* Avatar upload */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  {settingsForm.photo_url ? (
                    <img 
                      src={settingsForm.photo_url} 
                      alt="Аватар фермы" 
                      className="h-20 w-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center">
                      <span className="text-3xl">🧑‍🌾</span>
                    </div>
                  )}
                  <label className="absolute -bottom-1 -right-1 cursor-pointer">
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                      <Camera className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={uploadingAvatar}
                    />
                  </label>
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{settingsForm.name || "Ваша ферма"}</h3>
                  <p className="text-sm text-muted-foreground">
                    {uploadingAvatar ? "Загрузка..." : "Нажмите на камеру для изменения фото"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Название</Label>
                <Input
                  value={settingsForm.name}
                  onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Описание</Label>
                <Textarea
                  value={settingsForm.description}
                  onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
                  placeholder="Расскажите о вашей ферме"
                />
              </div>
              <div className="space-y-2">
                <Label>Район</Label>
                <Input
                  value={settingsForm.district}
                  onChange={(e) => setSettingsForm({ ...settingsForm, district: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Населённый пункт</Label>
                <Input
                  value={settingsForm.village}
                  onChange={(e) => setSettingsForm({ ...settingsForm, village: e.target.value })}
                />
              </div>
              
              {/* Address fields for self-pickup */}
              <div className="pt-4 border-t border-border">
                <h3 className="font-medium text-foreground mb-3">Адрес для самовывоза</h3>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Населённый пункт</Label>
                    <Input
                      value={settingsForm.city}
                      onChange={(e) => setSettingsForm({ ...settingsForm, city: e.target.value })}
                      placeholder="Витебск"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Улица</Label>
                    <Input
                      value={settingsForm.street}
                      onChange={(e) => setSettingsForm({ ...settingsForm, street: e.target.value })}
                      placeholder="ул. Целинная"
                    />
                    <p className="text-xs text-muted-foreground">
                      Дом и квартира будут показаны только при самовывозе
                    </p>
                  </div>
                </div>
              </div>

              {/* Pickup settings section */}
              <PickupSettingsSection
                pickupSlots={pickupSlots}
                onPickupSlotsChange={setPickupSlots}
                maxOrdersPerDay={maxOrdersPerDay}
                onMaxOrdersChange={setMaxOrdersPerDay}
                busyDates={busyDates}
                onBusyDatesChange={setBusyDates}
                vacationDates={vacationDates}
                onVacationDatesChange={setVacationDates}
              />
              
              <Button onClick={handleSaveSettings} className="w-full">
                Сохранить
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <BottomNavigation />

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить товар?</AlertDialogTitle>
            <AlertDialogDescription>
              Товар будет полностью удалён. Это действие необратимо.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteProduct}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground"
            >
              {isDeleting ? "Удаление..." : "Удалить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Full-screen product form overlay */}
      {showProductForm && (
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background border-b border-border p-3 flex items-center gap-3">
            <button
              type="button"
              onClick={resetProductForm}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h2 className="text-lg font-bold text-foreground">
              {editingProduct ? "Редактировать товар" : "Новый товар"}
            </h2>
          </div>

          {/* Form body */}
          <div className="p-4 pb-28 space-y-4">
            <div className="space-y-2">
              <Label>Название <span className="text-destructive">*</span></Label>
              <Input
                value={productForm.title}
                onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                placeholder="Название товара"
              />
            </div>
            <div className="space-y-2">
              <Label>Категории <span className="text-destructive">*</span></Label>
              <p className="text-xs text-muted-foreground mb-2">
                Можно выбрать несколько категорий
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                {categories.map((cat) => (
                  <label
                    key={cat.id}
                    className="flex items-center gap-2 cursor-pointer p-2 rounded min-h-[44px]"
                  >
                    <Checkbox
                      checked={selectedCategoryIds.includes(cat.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedCategoryIds([...selectedCategoryIds, cat.id]);
                        } else {
                          setSelectedCategoryIds(selectedCategoryIds.filter(id => id !== cat.id));
                        }
                      }}
                    />
                    <span className="text-sm text-foreground">{cat.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                placeholder="Описание товара"
              />
            </div>

            <div className="space-y-2">
              <Label>Состав <span className="text-destructive">*</span></Label>
              <Textarea
                value={productForm.composition}
                onChange={(e) => setProductForm({ ...productForm, composition: e.target.value })}
                placeholder="Мука, яйца, сахар, масло сливочное..."
              />
            </div>

            <div className="space-y-2">
              <Label>КБЖУ <span className="text-destructive">*</span></Label>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <span className="text-xs text-muted-foreground">К (ккал)</span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={productForm.calories}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9.,]/g, '');
                      setProductForm({ ...productForm, calories: v });
                    }}
                    placeholder="320"
                  />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Б (г)</span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={productForm.protein}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9.,]/g, '');
                      setProductForm({ ...productForm, protein: v });
                    }}
                    placeholder="8"
                  />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Ж (г)</span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={productForm.fat}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9.,]/g, '');
                      setProductForm({ ...productForm, fat: v });
                    }}
                    placeholder="12"
                  />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">У (г)</span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={productForm.carbs}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9.,]/g, '');
                      setProductForm({ ...productForm, carbs: v });
                    }}
                    placeholder="42"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Срок хранения <span className="text-destructive">*</span></Label>
              <Input
                value={productForm.shelf_life}
                onChange={(e) => setProductForm({ ...productForm, shelf_life: e.target.value })}
                placeholder="3 дня при температуре +4°C"
              />
            </div>
            
            {/* Main price block - "Стоимость" */}
            <div className="space-y-3 p-3 rounded-lg border border-border">
              <Label className="text-base font-medium">Стоимость <span className="text-destructive">*</span></Label>
              <p className="text-xs text-muted-foreground">
                Основная цена товара. Укажите вариант (напр. "1 кг", "шт", "0.5 л"), цену и % скидки.
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  value={mainVariant.label}
                  onChange={(e) => setMainVariant({ ...mainVariant, label: e.target.value })}
                  placeholder="1 кг"
                  className="h-9 w-24"
                />
                <div className="flex items-center gap-1">
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={mainPriceInput}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.,]/g, '');
                      setMainPriceInput(value);
                    }}
                    onBlur={() => {
                      const kopecks = parseRublesToKopecks(mainPriceInput);
                      setMainVariant({ ...mainVariant, price: kopecks });
                      setMainPriceInput(kopecksToRublesString(kopecks));
                    }}
                    placeholder="8.50"
                    className="h-9 w-24 text-center"
                  />
                  <span className="text-sm text-muted-foreground">₽</span>
                </div>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={mainVariant.discount_percent || ""}
                    onChange={(e) => setMainVariant({ ...mainVariant, discount_percent: Math.min(99, Math.max(0, parseInt(e.target.value) || 0)) })}
                    placeholder="0"
                    className="h-9 w-14 text-center"
                    max={99}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            </div>

            {/* Prep time field */}
            <div className="space-y-2">
              <Label>Время готовки</Label>
              <p className="text-xs text-muted-foreground">
                Оставьте пустым, если товар уже готов (будет отображаться «В наличии»)
              </p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={productForm.prep_time_minutes}
                  onChange={(e) => setProductForm({
                    ...productForm,
                    prep_time_minutes: e.target.value === "" ? "" as any : parseInt(e.target.value)
                  })}
                  placeholder="0"
                  className="w-32"
                  min={0}
                />
                <span className="text-sm text-muted-foreground">минут</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Фото товара (можно загрузить несколько)</Label>
              
              {/* Main image */}
              <div className="flex flex-wrap gap-2">
                {productForm.image_url && (
                  <div className="relative">
                    <img 
                      src={productForm.image_url} 
                      alt="Главное фото" 
                      className="h-20 w-20 rounded-lg object-cover border-2 border-primary"
                    />
                    <span className="absolute -top-1 -left-1 bg-primary text-primary-foreground text-xs px-1 rounded">
                      Главное
                    </span>
                    <button
                      type="button"
                      onClick={() => setProductForm({ ...productForm, image_url: "" })}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                
                {/* Additional images */}
                {productImages.map((url, index) => (
                  <div key={index} className="relative">
                    <img 
                      src={url} 
                      alt={`Фото ${index + 2}`} 
                      className="h-20 w-20 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeAdditionalImage(index)}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                
                {/* Upload button */}
                <label className="cursor-pointer">
                  <div className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-border">
                    <div className="text-center">
                      <Upload className="h-5 w-5 text-muted-foreground mx-auto" />
                      <span className="text-xs text-muted-foreground">
                        {uploadingImage ? "..." : "+"}
                      </span>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Первое фото будет главным. Добавьте больше фото для галереи.
              </p>
            </div>

            {/* Additional Variants section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Дополнительные варианты</Label>
                <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                  <Plus className="h-3 w-3 mr-1" />
                  Добавить
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Добавьте варианты если товар продаётся в разных объёмах или фасовках (напр. "0,5 л", "2 кг")
              </p>
              
              {productVariants.length > 0 && (
                <div className="space-y-2">
                  {productVariants.map((variant, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 rounded-lg border border-border">
                      <Input
                        value={variant.label}
                        onChange={(e) => updateVariant(index, 'label', e.target.value)}
                        placeholder="0,5 л"
                        className="h-9 flex-1"
                      />
                      <div className="flex items-center gap-1">
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={variantPriceInputs[index] ?? kopecksToRublesString(variant.price)}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9.,]/g, '');
                            setVariantPriceInputs(prev => ({ ...prev, [index]: value }));
                          }}
                          onBlur={() => {
                            const inputValue = variantPriceInputs[index] ?? "";
                            const kopecks = parseRublesToKopecks(inputValue);
                            updateVariant(index, 'price', kopecks);
                            setVariantPriceInputs(prev => ({ 
                              ...prev, 
                              [index]: kopecksToRublesString(kopecks) 
                            }));
                          }}
                          placeholder="4.50"
                          className="h-9 w-24 text-center"
                        />
                        <span className="text-sm text-muted-foreground">₽</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={variant.discount_percent || ""}
                          onChange={(e) => updateVariant(index, 'discount_percent', Math.min(99, Math.max(0, parseInt(e.target.value) || 0)))}
                          placeholder="0"
                          className="h-9 w-14 text-center"
                          max={99}
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeVariant(index)}
                        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-destructive rounded"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add-ons section */}
            <div className="space-y-3 p-3 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Добавки</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setProductAddons([
                      ...productAddons,
                      { name: "", price: "", selection_type: "checkbox" },
                    ])
                  }
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Добавить
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Дополнения к товару с отдельной ценой (необязательные для покупателя)
              </p>

              {productAddons.map((addon, aIndex) => (
                <div key={aIndex} className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border">
                  <Input
                    value={addon.name}
                    onChange={(e) => {
                      const updated = [...productAddons];
                      updated[aIndex] = { ...updated[aIndex], name: e.target.value };
                      setProductAddons(updated);
                    }}
                    placeholder="Название добавки"
                    className="h-9 flex-[3] min-w-0"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={addon.price}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.,]/g, '');
                        const updated = [...productAddons];
                        updated[aIndex] = { ...updated[aIndex], price: value };
                        setProductAddons(updated);
                      }}
                      onBlur={() => {
                        const kopecks = parseRublesToKopecks(addon.price);
                        const updated = [...productAddons];
                        updated[aIndex] = { ...updated[aIndex], price: kopecksToRublesString(kopecks) };
                        setProductAddons(updated);
                      }}
                      placeholder="0"
                      className="h-9 w-14 text-center px-1"
                    />
                    <span className="text-sm text-muted-foreground">₽</span>
                  </div>
                  <Select
                    value={addon.selection_type}
                    onValueChange={(val) => {
                      const updated = [...productAddons];
                      updated[aIndex] = { ...updated[aIndex], selection_type: val as "checkbox" | "radio" };
                      setProductAddons(updated);
                    }}
                  >
                    <SelectTrigger className="h-9 w-16 shrink-0 px-2">
                      <SelectValue>
                        {addon.selection_type === 'checkbox' ? '☑' : '⊙'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checkbox">☑ Галочка</SelectItem>
                      <SelectItem value="radio">⊙ Кружок</SelectItem>
                    </SelectContent>
                  </Select>
                  <button
                    type="button"
                    onClick={() => setProductAddons(productAddons.filter((_, i) => i !== aIndex))}
                    className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-destructive rounded shrink-0"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Custom fields section */}
            <div className="space-y-3 p-3 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Дополнительные поля</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCustomFields([
                        ...customFields,
                        { field_type: "text", label: "", placeholder: "", max_length: 50, options: [] },
                      ])
                    }
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Текст
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCustomFields([
                        ...customFields,
                        { field_type: "select", label: "", placeholder: "", max_length: 50, options: [] },
                      ])
                    }
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Выбор
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Создайте поля, которые покупатель должен заполнить при добавлении в корзину. Не влияют на цену.
              </p>

              {customFields.map((field, fIndex) => (
                <div key={fIndex} className="p-3 rounded-lg bg-card border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase">
                      {field.field_type === "text" ? "Текстовое поле" : "Выбор из вариантов"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCustomFields(customFields.filter((_, i) => i !== fIndex))}
                      className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-destructive rounded"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <Input
                    value={field.label}
                    onChange={(e) => {
                      const updated = [...customFields];
                      updated[fIndex] = { ...updated[fIndex], label: e.target.value };
                      setCustomFields(updated);
                    }}
                    placeholder="Название поля (напр. Надпись, Начинка)"
                    className="h-9"
                  />

                  {field.field_type === "text" && (
                    <Input
                      value={field.placeholder}
                      onChange={(e) => {
                        const updated = [...customFields];
                        updated[fIndex] = { ...updated[fIndex], placeholder: e.target.value };
                        setCustomFields(updated);
                      }}
                      placeholder="Подсказка (напр. Напишите до 5 слов)"
                      className="h-9"
                    />
                  )}

                  {field.field_type === "select" && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {field.options.map((opt, oIndex) => (
                          <div key={oIndex} className="flex items-center gap-1 bg-secondary rounded-lg px-2 py-1">
                            <Input
                              value={opt.label}
                              onChange={(e) => {
                                const updated = [...customFields];
                                const newOptions = [...updated[fIndex].options];
                                newOptions[oIndex] = { ...newOptions[oIndex], label: e.target.value };
                                updated[fIndex] = { ...updated[fIndex], options: newOptions };
                                setCustomFields(updated);
                              }}
                              placeholder="Вариант"
                              className="h-7 w-28 text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...customFields];
                                updated[fIndex] = {
                                  ...updated[fIndex],
                                  options: updated[fIndex].options.filter((_, i) => i !== oIndex),
                                };
                                setCustomFields(updated);
                              }}
                              className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-destructive rounded"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const updated = [...customFields];
                          updated[fIndex] = {
                            ...updated[fIndex],
                            options: [...updated[fIndex].options, { label: "" }],
                          };
                          setCustomFields(updated);
                        }}
                        className="text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Добавить вариант
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sticky save button */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border z-10">
            <Button onClick={handleSaveProduct} className="w-full" disabled={isSaving}>
              {isSaving ? (
                <>
                  <span className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {editingProduct ? "Сохранение..." : "Добавление..."}
                </>
              ) : (
                editingProduct ? "Сохранить" : "Добавить товар"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
