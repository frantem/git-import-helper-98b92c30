import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatPrice, parseRublesToKopecks, kopecksToRublesString } from "@/lib/priceUtils";
import { BynSymbol } from "@/components/ui/byn-symbol";
import { compressImage } from "@/lib/imageUtils";
import { cdnImage } from "@/lib/imageCdn";
import { Plus, Pencil, Trash2, Upload, X, ArrowLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";

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
  farmer_id: string | null;
}

interface ProductVariant {
  id?: string;
  label: string;
  price: number;
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
  price: string;
  selection_type: "checkbox" | "radio";
}

export default function AdminProducts() {
  const { user, role, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Product form state
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [mainVariant, setMainVariant] = useState<ProductVariant>({ label: "", price: 0, discount_percent: 0 });
  const [productForm, setProductForm] = useState({
    title: "", description: "", category_id: "", image_url: "",
    prep_time_minutes: "" as any, order_lead_time_hours: "" as any, composition: "", calories: "" as any,
    protein: "" as any, fat: "" as any, carbs: "" as any, shelf_life: "",
  });
  const [customFields, setCustomFields] = useState<CustomFieldLocal[]>([]);
  const [productAddons, setProductAddons] = useState<AddonLocal[]>([]);
  const [mainPriceInput, setMainPriceInput] = useState("");
  const [variantPriceInputs, setVariantPriceInputs] = useState<Record<number, string>>({});

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    if (role !== "admin") { navigate("/"); return; }
    fetchData();
  }, [user, role, authLoading]);

  const fetchData = async () => {
    const [productsRes, categoriesRes] = await Promise.all([
      supabase.from("products").select("*")
        .eq("is_deleted", false)
        .order("is_active", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("categories").select("id, name, slug").order("sort_order"),
    ]);

    if (productsRes.data) setProducts(productsRes.data);
    if (categoriesRes.data) setCategories(categoriesRes.data);
    setIsLoading(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingImage(true);
    const compressed = await compressImage(file, "product");
    const fileExt = compressed.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('product-images').upload(fileName, compressed);
    if (error) { toast.error("Ошибка загрузки изображения"); setUploadingImage(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
    if (!productForm.image_url) setProductForm({ ...productForm, image_url: publicUrl });
    else setProductImages([...productImages, publicUrl]);
    setUploadingImage(false);
    toast.success("Изображение загружено");
  };

  const removeAdditionalImage = (index: number) => setProductImages(productImages.filter((_, i) => i !== index));

  const saveCustomFields = async (productId: string) => {
    await (supabase as any).from("product_custom_fields").delete().eq("product_id", productId);
    if (customFields.length === 0) return;
    for (let i = 0; i < customFields.length; i++) {
      const field = customFields[i];
      const { data: inserted, error } = await (supabase as any)
        .from("product_custom_fields")
        .insert({ product_id: productId, field_type: field.field_type, label: field.label, placeholder: field.placeholder || null, max_length: field.field_type === "text" ? (field.max_length || 50) : null, sort_order: i })
        .select().single();
      if (error) throw new Error("Ошибка сохранения поля: " + field.label);
      if (inserted && field.options.length > 0) {
        await (supabase as any).from("product_custom_field_options").insert(
          field.options.map((opt, j) => ({ field_id: inserted.id, label: opt.label, sort_order: j }))
        );
      }
    }
  };

  const saveAddons = async (productId: string) => {
    await supabase.from("product_addons").delete().eq("product_id", productId);
    if (productAddons.length === 0) return;
    await supabase.from("product_addons").insert(
      productAddons.map((addon, i) => ({ product_id: productId, name: addon.name, price: parseRublesToKopecks(addon.price), selection_type: addon.selection_type, sort_order: i }))
    );
  };

  const savingRef = useRef(false);

  const handleSaveProduct = async () => {
    if (!editingProduct || savingRef.current) return;
    if (!productForm.title.trim()) { toast.error("Введите название товара"); return; }
    if (selectedCategoryIds.length === 0) { toast.error("Выберите хотя бы одну категорию"); return; }
    if (!productForm.composition.trim() || !productForm.shelf_life.trim() ||
        productForm.calories === "" || productForm.protein === "" ||
        productForm.fat === "" || productForm.carbs === "") {
      toast.error("Заполните состав, КБЖУ и срок хранения"); return;
    }

    savingRef.current = true;
    setIsSaving(true);
    try {
      const priceInKopecks = mainVariant.price;
      const oldPriceInKopecks = mainVariant.discount_percent > 0
        ? Math.round(priceInKopecks / (1 - mainVariant.discount_percent / 100)) : null;

      const productData = {
        title: productForm.title, description: productForm.description || null,
        price: priceInKopecks, old_price: oldPriceInKopecks, unit: mainVariant.label,
        category_id: selectedCategoryIds[0], image_url: productForm.image_url || null,
        prep_time_minutes: productForm.prep_time_minutes || 0,
        composition: productForm.composition || null,
        calories: productForm.calories !== "" ? parseFloat(String(productForm.calories).replace(',', '.')) : null,
        protein: productForm.protein !== "" ? parseFloat(String(productForm.protein).replace(',', '.')) : null,
        fat: productForm.fat !== "" ? parseFloat(String(productForm.fat).replace(',', '.')) : null,
        carbs: productForm.carbs !== "" ? parseFloat(String(productForm.carbs).replace(',', '.')) : null,
        shelf_life: productForm.shelf_life || null,
      };

      const pid = editingProduct.id;
      const { error } = await supabase.from("products").update(productData).eq("id", pid);
      if (error) { toast.error("Ошибка при обновлении товара: " + error.message); return; }

      await Promise.all([
        (async () => {
          await supabase.from("product_images").delete().eq("product_id", pid);
          if (productImages.length > 0) await supabase.from("product_images").insert(productImages.map((url, i) => ({ product_id: pid, image_url: url, sort_order: i })));
        })(),
        (async () => {
          await supabase.from("product_categories").delete().eq("product_id", pid);
          if (selectedCategoryIds.length > 0) await supabase.from("product_categories").insert(selectedCategoryIds.map(catId => ({ product_id: pid, category_id: catId })));
        })(),
        (async () => {
          await supabase.from("product_variants").delete().eq("product_id", pid);
          await supabase.from("product_variants").insert([
            { product_id: pid, label: mainVariant.label, price: mainVariant.price, unit: mainVariant.label, is_default: true, sort_order: 0, discount_percent: mainVariant.discount_percent || 0 },
            ...productVariants.map((v, i) => ({ product_id: pid, label: v.label, price: v.price, unit: v.label, is_default: false, sort_order: i + 1, discount_percent: v.discount_percent || 0 }))
          ]);
        })(),
        saveCustomFields(pid),
        saveAddons(pid),
      ]);
      setProducts(prev => prev.map(p => p.id === pid ? { ...p, ...productData } : p));
      toast.success("Товар обновлён");

      resetProductForm();
    } catch (e: any) {
      toast.error("Ошибка сохранения: " + (e?.message || "неизвестная ошибка"));
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteConfirmId || isDeleting) return;
    setIsDeleting(true);

    await Promise.all([
      supabase.from("product_images").delete().eq("product_id", deleteConfirmId),
      supabase.from("product_variants").delete().eq("product_id", deleteConfirmId),
      supabase.from("product_categories").delete().eq("product_id", deleteConfirmId),
      supabase.from("product_addons").delete().eq("product_id", deleteConfirmId),
      (supabase as any).from("product_custom_fields").delete().eq("product_id", deleteConfirmId),
    ]);

    const { error } = await supabase.from("products").delete().eq("id", deleteConfirmId);

    if (error?.code === "23503") {
      await supabase.from("products").update({ is_active: false, is_deleted: true } as any).eq("id", deleteConfirmId);
      toast.success("Товар удалён");
    } else if (error) {
      toast.error("Ошибка при удалении товара: " + error.message);
    } else {
      toast.success("Товар удалён");
    }

    setIsDeleting(false);
    setDeleteConfirmId(null);
    fetchData();
  };

  const handleToggleActive = async (productId: string, currentState: boolean) => {
    const { error } = await supabase.from("products")
      .update({ is_active: !currentState })
      .eq("id", productId);
    if (error) toast.error("Ошибка при изменении статуса");
    else { toast.success(currentState ? "Товар скрыт" : "Товар активирован"); fetchData(); }
  };

  const handleEditProduct = async (product: Product) => {
    const [imagesRes, variantsRes, catRes] = await Promise.all([
      supabase.from("product_images").select("image_url").eq("product_id", product.id).order("sort_order"),
      supabase.from("product_variants").select("*").eq("product_id", product.id).order("sort_order"),
      supabase.from("product_categories").select("category_id").eq("product_id", product.id),
    ]);

    setEditingProduct(product);
    setProductForm({
      title: product.title, description: product.description || "", category_id: product.category_id,
      image_url: product.image_url || "", prep_time_minutes: (product as any).prep_time_minutes || "",
      composition: (product as any).composition || "", calories: (product as any).calories ?? "",
      protein: (product as any).protein ?? "", fat: (product as any).fat ?? "",
      carbs: (product as any).carbs ?? "", shelf_life: (product as any).shelf_life || "",
    });
    setProductImages(imagesRes.data?.map(img => img.image_url) || []);

    const categoryIds = catRes.data?.map(pc => pc.category_id) || [];
    setSelectedCategoryIds(categoryIds.length > 0 ? categoryIds : [product.category_id]);

    if (variantsRes.data && variantsRes.data.length > 0) {
      const first = variantsRes.data[0];
      setMainVariant({ id: first.id, label: first.label, price: first.price, discount_percent: (first as any).discount_percent || 0 });
      setMainPriceInput(kopecksToRublesString(first.price));
      const additional = variantsRes.data.slice(1).map(v => ({ id: v.id, label: v.label, price: v.price, discount_percent: (v as any).discount_percent || 0 }));
      setProductVariants(additional);
      const inputs: Record<number, string> = {};
      additional.forEach((v, i) => { inputs[i] = kopecksToRublesString(v.price); });
      setVariantPriceInputs(inputs);
    } else {
      setMainVariant({ label: product.unit, price: product.price, discount_percent: product.old_price ? Math.round((1 - product.price / product.old_price) * 100) : 0 });
      setMainPriceInput(kopecksToRublesString(product.price));
      setProductVariants([]);
      setVariantPriceInputs({});
    }

    const { data: cfData } = await (supabase as any).from("product_custom_fields").select("*").eq("product_id", product.id).order("sort_order");
    if (cfData && cfData.length > 0) {
      const fieldIds = cfData.map((f: any) => f.id);
      const { data: optData } = await (supabase as any).from("product_custom_field_options").select("*").in("field_id", fieldIds).order("sort_order");
      setCustomFields(cfData.map((f: any) => ({
        id: f.id, field_type: f.field_type as "text" | "select", label: f.label, placeholder: f.placeholder || "", max_length: f.max_length || 50,
        options: (optData || []).filter((o: any) => o.field_id === f.id).map((o: any) => ({ id: o.id, label: o.label })),
      })));
    } else setCustomFields([]);

    const { data: addonData } = await supabase.from("product_addons").select("*").eq("product_id", product.id).order("sort_order");
    if (addonData && addonData.length > 0) {
      setProductAddons(addonData.map((a: any) => ({ id: a.id, name: a.name, price: kopecksToRublesString(a.price), selection_type: a.selection_type as "checkbox" | "radio" })));
    } else setProductAddons([]);

    setShowProductForm(true);
  };

  const resetProductForm = () => {
    setShowProductForm(false);
    setEditingProduct(null);
    setProductImages([]);
    setProductVariants([]);
    setSelectedCategoryIds([]);
    setCustomFields([]);
    setMainVariant({ label: "", price: 0, discount_percent: 0 });
    setProductForm({ title: "", description: "", category_id: "", image_url: "", prep_time_minutes: "" as any, composition: "", calories: "" as any, protein: "" as any, fat: "" as any, carbs: "" as any, shelf_life: "" });
    setMainPriceInput("");
    setVariantPriceInputs({});
    setProductAddons([]);
  };

  const addVariant = () => setProductVariants([...productVariants, { label: "", price: 0, discount_percent: 0 }]);
  const updateVariant = (index: number, field: keyof ProductVariant, value: string | number) => {
    const updated = [...productVariants]; (updated[index] as any)[field] = value; setProductVariants(updated);
  };
  const removeVariant = (index: number) => setProductVariants(productVariants.filter((_, i) => i !== index));

  if (authLoading || isLoading) {
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

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />
      <main className="container mx-auto px-3 py-4">
        <div className="flex items-center gap-2 mb-4">
          <Link to="/admin">
            <Button variant="ghost" className="p-2 min-h-[44px] min-w-[44px]">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-foreground">Товары</h1>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-medium text-foreground">Все товары ({products.length})</h2>
          </div>

          {products.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">Товаров пока нет</div>
          ) : (
            <div className="space-y-2">
              {products.map((product) => {
                const price = formatPrice(product.price);
                return (
                  <div key={product.id} className={`flex items-center gap-3 rounded-xl bg-card p-3 ${!product.is_active ? 'opacity-50' : ''}`}>
                    <img src={product.image_url ? cdnImage(product.image_url, "thumb") : "https://placehold.co/60x60"} alt={product.title} className="h-14 w-14 rounded-lg object-cover" loading="lazy" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate">{product.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {price.formatted}<BynSymbol /> / {product.unit}
                        {!product.is_active && <span className="ml-2 text-destructive">• Скрыт</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch checked={product.is_active} onCheckedChange={() => handleToggleActive(product.id, product.is_active)} />
                      <Button variant="ghost" size="icon" onClick={() => handleEditProduct(product)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteConfirmId(product.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <BottomNavigation />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить товар?</AlertDialogTitle>
            <AlertDialogDescription>Товар будет полностью удалён. Это действие необратимо.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} disabled={isDeleting} className="bg-destructive text-destructive-foreground">
              {isDeleting ? "Удаление..." : "Удалить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Full-screen product form overlay */}
      {showProductForm && (
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
          <div className="sticky top-0 z-10 bg-background border-b border-border p-3 flex items-center gap-3">
            <button type="button" onClick={resetProductForm} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg">
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h2 className="text-lg font-bold text-foreground">Редактировать товар</h2>
          </div>

          <div className="p-4 pb-28 space-y-4">
            <div className="space-y-2">
              <Label>Название <span className="text-destructive">*</span></Label>
              <Input value={productForm.title} onChange={(e) => setProductForm({ ...productForm, title: e.target.value })} placeholder="Название товара" />
            </div>
            <div className="space-y-2">
              <Label>Категории <span className="text-destructive">*</span></Label>
              <p className="text-xs text-muted-foreground mb-2">Можно выбрать несколько категорий</p>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                {categories.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-2 cursor-pointer p-2 rounded min-h-[44px]">
                    <Checkbox
                      checked={selectedCategoryIds.includes(cat.id)}
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedCategoryIds([...selectedCategoryIds, cat.id]);
                        else setSelectedCategoryIds(selectedCategoryIds.filter(id => id !== cat.id));
                      }}
                    />
                    <span className="text-sm text-foreground">{cat.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} placeholder="Описание товара" />
            </div>

            <div className="space-y-2">
              <Label>Состав <span className="text-destructive">*</span></Label>
              <Textarea value={productForm.composition} onChange={(e) => setProductForm({ ...productForm, composition: e.target.value })} placeholder="Мука, яйца, сахар, масло сливочное..." />
            </div>

            <div className="space-y-2">
              <Label>КБЖУ <span className="text-destructive">*</span></Label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key: "calories", label: "К (ккал)", ph: "320" },
                  { key: "protein", label: "Б (г)", ph: "8" },
                  { key: "fat", label: "Ж (г)", ph: "12" },
                  { key: "carbs", label: "У (г)", ph: "42" },
                ].map(({ key, label, ph }) => (
                  <div key={key}>
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <Input type="text" inputMode="decimal" value={(productForm as any)[key]}
                      onChange={(e) => setProductForm({ ...productForm, [key]: e.target.value.replace(/[^0-9.,]/g, '') })}
                      placeholder={ph} />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Срок хранения <span className="text-destructive">*</span></Label>
              <Input value={productForm.shelf_life} onChange={(e) => setProductForm({ ...productForm, shelf_life: e.target.value })} placeholder="3 дня при температуре +4°C" />
            </div>

            {/* Main price */}
            <div className="space-y-3 p-3 rounded-lg border border-border">
              <Label className="text-base font-medium">Стоимость <span className="text-destructive">*</span></Label>
              <p className="text-xs text-muted-foreground">Основная цена товара.</p>
              <div className="flex items-center gap-2 flex-wrap">
                <Input value={mainVariant.label} onChange={(e) => setMainVariant({ ...mainVariant, label: e.target.value })} placeholder="250 г" className="h-9 w-24" />
                <div className="flex items-center gap-1">
                  <Input type="text" inputMode="decimal" value={mainPriceInput}
                    onChange={(e) => setMainPriceInput(e.target.value.replace(/[^0-9.,]/g, ''))}
                    onBlur={() => { const k = parseRublesToKopecks(mainPriceInput); setMainVariant({ ...mainVariant, price: k }); setMainPriceInput(kopecksToRublesString(k)); }}
                    placeholder="8.90" className="h-9 w-24 text-center" />
                  <span className="text-sm text-muted-foreground">₽</span>
                </div>
                <div className="flex items-center gap-1">
                  <Input type="number" value={mainVariant.discount_percent || ""}
                    onChange={(e) => setMainVariant({ ...mainVariant, discount_percent: Math.min(99, Math.max(0, parseInt(e.target.value) || 0)) })}
                    placeholder="0" className="h-9 w-14 text-center" max={99} />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            </div>

            {/* Prep time */}
            <div className="space-y-2">
              <Label>Время приготовления</Label>
              <p className="text-xs text-muted-foreground">Оставьте пустым, если товар уже готов</p>
              <div className="flex items-center gap-2">
                <Input type="number" value={productForm.prep_time_minutes}
                  onChange={(e) => setProductForm({ ...productForm, prep_time_minutes: e.target.value === "" ? "" as any : parseInt(e.target.value) })}
                  placeholder="0" className="w-32" min={0} />
                <span className="text-sm text-muted-foreground">минут</span>
              </div>
            </div>

            {/* Images */}
            <div className="space-y-2">
              <Label>Фото товара</Label>
              <div className="flex flex-wrap gap-2">
                {productForm.image_url && (
                  <div className="relative">
                    <img src={productForm.image_url} alt="Главное фото" className="h-20 w-20 rounded-lg object-cover border-2 border-primary" />
                    <span className="absolute -top-1 -left-1 bg-primary text-primary-foreground text-xs px-1 rounded">Главное</span>
                    <button type="button" onClick={() => setProductForm({ ...productForm, image_url: "" })}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {productImages.map((url, index) => (
                  <div key={index} className="relative">
                    <img src={url} alt={`Фото ${index + 2}`} className="h-20 w-20 rounded-lg object-cover" />
                    <button type="button" onClick={() => removeAdditionalImage(index)}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <label className="cursor-pointer">
                  <div className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-border">
                    <div className="text-center">
                      <Upload className="h-5 w-5 text-muted-foreground mx-auto" />
                      <span className="text-xs text-muted-foreground">{uploadingImage ? "..." : "+"}</span>
                    </div>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                </label>
              </div>
            </div>

            {/* Additional Variants */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Дополнительные варианты</Label>
                <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                  <Plus className="h-3 w-3 mr-1" />Добавить
                </Button>
              </div>
              {productVariants.length > 0 && (
                <div className="space-y-2">
                  {productVariants.map((variant, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 rounded-lg border border-border">
                      <Input value={variant.label} onChange={(e) => updateVariant(index, 'label', e.target.value)} placeholder="0,5 л" className="h-9 flex-1" />
                      <div className="flex items-center gap-1">
                        <Input type="text" inputMode="decimal"
                          value={variantPriceInputs[index] ?? kopecksToRublesString(variant.price)}
                          onChange={(e) => setVariantPriceInputs(prev => ({ ...prev, [index]: e.target.value.replace(/[^0-9.,]/g, '') }))}
                          onBlur={() => { const k = parseRublesToKopecks(variantPriceInputs[index] ?? ""); updateVariant(index, 'price', k); setVariantPriceInputs(prev => ({ ...prev, [index]: kopecksToRublesString(k) })); }}
                          placeholder="4.50" className="h-9 w-24 text-center" />
                        <span className="text-sm text-muted-foreground">₽</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Input type="number" value={variant.discount_percent || ""}
                          onChange={(e) => updateVariant(index, 'discount_percent', Math.min(99, Math.max(0, parseInt(e.target.value) || 0)))}
                          placeholder="0" className="h-9 w-14 text-center" max={99} />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                      <button type="button" onClick={() => removeVariant(index)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-destructive rounded">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add-ons */}
            <div className="space-y-3 p-3 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Добавки</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setProductAddons([...productAddons, { name: "", price: "", selection_type: "checkbox" }])}>
                  <Plus className="h-3 w-3 mr-1" />Добавить
                </Button>
              </div>
              {productAddons.map((addon, aIndex) => (
                <div key={aIndex} className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border">
                  <Input value={addon.name} onChange={(e) => { const u = [...productAddons]; u[aIndex] = { ...u[aIndex], name: e.target.value }; setProductAddons(u); }} placeholder="Название добавки" className="h-9 flex-[3] min-w-0" />
                  <div className="flex items-center gap-1 shrink-0">
                    <Input type="text" inputMode="decimal" value={addon.price}
                      onChange={(e) => { const u = [...productAddons]; u[aIndex] = { ...u[aIndex], price: e.target.value.replace(/[^0-9.,]/g, '') }; setProductAddons(u); }}
                      onBlur={() => { const k = parseRublesToKopecks(addon.price); const u = [...productAddons]; u[aIndex] = { ...u[aIndex], price: kopecksToRublesString(k) }; setProductAddons(u); }}
                      placeholder="0" className="h-9 w-14 text-center px-1" />
                    <span className="text-sm text-muted-foreground">₽</span>
                  </div>
                  <Select value={addon.selection_type} onValueChange={(val) => { const u = [...productAddons]; u[aIndex] = { ...u[aIndex], selection_type: val as "checkbox" | "radio" }; setProductAddons(u); }}>
                    <SelectTrigger className="h-9 w-16 shrink-0 px-2">
                      <SelectValue>{addon.selection_type === 'checkbox' ? '☑' : '⊙'}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checkbox">☑ Галочка</SelectItem>
                      <SelectItem value="radio">⊙ Кружок</SelectItem>
                    </SelectContent>
                  </Select>
                  <button type="button" onClick={() => setProductAddons(productAddons.filter((_, i) => i !== aIndex))} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-destructive rounded shrink-0">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Custom fields */}
            <div className="space-y-3 p-3 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Дополнительные поля</Label>
                <div className="flex gap-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => setCustomFields([...customFields, { field_type: "text", label: "", placeholder: "", max_length: 50, options: [] }])}>
                    <Plus className="h-3 w-3 mr-1" />Текст
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setCustomFields([...customFields, { field_type: "select", label: "", placeholder: "", max_length: 50, options: [] }])}>
                    <Plus className="h-3 w-3 mr-1" />Выбор
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Поля, которые покупатель должен заполнить или выбрать, перед добавлением в корзину.</p>

              {customFields.map((field, fIndex) => (
                <div key={fIndex} className="p-3 rounded-lg bg-card border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase">
                      {field.field_type === "text" ? "Текстовое поле" : "Выбор из вариантов"}
                    </span>
                    <button type="button" onClick={() => setCustomFields(customFields.filter((_, i) => i !== fIndex))} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-destructive rounded">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <Input value={field.label} onChange={(e) => { const u = [...customFields]; u[fIndex] = { ...u[fIndex], label: e.target.value }; setCustomFields(u); }}
                    placeholder={field.field_type === "text" ? "Название (напр. Надпись)" : "Название (напр. Начинка)"} className="h-9" />
                  {field.field_type === "text" && (
                    <Input value={field.placeholder || ""} onChange={(e) => { const u = [...customFields]; u[fIndex] = { ...u[fIndex], placeholder: e.target.value }; setCustomFields(u); }}
                      placeholder="Подсказка (напр. Напишите до 5 слов)" className="h-9" />
                  )}
                  {field.field_type === "select" && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {field.options.map((opt, oIndex) => (
                          <div key={oIndex} className="flex items-center gap-1 bg-secondary rounded-lg px-2 py-1">
                            <Input value={opt.label} onChange={(e) => {
                              const u = [...customFields]; const opts = [...u[fIndex].options]; opts[oIndex] = { ...opts[oIndex], label: e.target.value }; u[fIndex] = { ...u[fIndex], options: opts }; setCustomFields(u);
                            }} className="h-7 w-20 text-xs px-1 border-0 bg-transparent" />
                            <button type="button" onClick={() => {
                              const u = [...customFields]; u[fIndex] = { ...u[fIndex], options: u[fIndex].options.filter((_, i) => i !== oIndex) }; setCustomFields(u);
                            }} className="text-destructive p-1 min-h-[32px] min-w-[32px] flex items-center justify-center">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => {
                        const u = [...customFields]; u[fIndex] = { ...u[fIndex], options: [...u[fIndex].options, { label: "" }] }; setCustomFields(u);
                      }}>
                        <Plus className="h-3 w-3 mr-1" />Вариант
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Fixed bottom save button */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border z-20">
            <Button onClick={handleSaveProduct} disabled={isSaving} className="w-full h-12 text-base font-semibold">
              {isSaving ? "Сохранение..." : "Сохранить изменения"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
