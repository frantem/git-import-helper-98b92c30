import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2, GripVertical, Eye, EyeOff, Upload, X } from "lucide-react";

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  discount_text: string | null;
  image_url: string;
  link_url: string | null;
  link_category: string | null;
  link_product_id: string | null;
  color_gradient: string;
  sort_order: number;
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Product {
  id: string;
  title: string;
}

const GRADIENT_PRESETS = [
  { value: "from-black/60 to-black/30", label: "Тёмный (рекомендуется)" },
  { value: "from-black/80 to-transparent", label: "Сильно тёмный слева" },
  { value: "from-black/40 to-black/20", label: "Лёгкое затемнение" },
  { value: "from-primary/70 to-primary/30", label: "Цветной (основной цвет)" },
  { value: "from-transparent to-transparent", label: "Без затемнения" },
];

export default function AdminBanners() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [linkType, setLinkType] = useState<"none" | "category" | "product" | "url">("none");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    discount_text: "",
    image_url: "",
    link_url: "",
    link_category: "",
    link_product_id: "",
    color_gradient: "from-black/60 to-black/30",
    sort_order: "0",
    is_active: true,
  });

  useEffect(() => {
    if (!user || role !== "admin") {
      navigate("/");
      return;
    }
    fetchData();
  }, [user, role]);

  const fetchData = async () => {
    // Fetch banners
    const { data: bannersData } = await supabase
      .from("banners")
      .select("*")
      .order("sort_order");

    if (bannersData) {
      setBanners(bannersData);
    }

    // Fetch categories
    const { data: categoriesData } = await supabase
      .from("categories")
      .select("id, name, slug")
      .order("name");

    if (categoriesData) {
      setCategories(categoriesData);
    }

    // Fetch products
    const { data: productsData } = await supabase
      .from("products")
      .select("id, title")
      .order("title");

    if (productsData) {
      setProducts(productsData);
    }

    setIsLoading(false);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingBanner(null);
    setLinkType("none");
    setImageFile(null);
    setImagePreview(null);
    setForm({
      title: "",
      subtitle: "",
      discount_text: "",
      image_url: "",
      link_url: "",
      link_category: "",
      link_product_id: "",
      color_gradient: "from-black/60 to-black/30",
      sort_order: "0",
      is_active: true,
    });
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    
    // Determine link type
    let type: "none" | "category" | "product" | "url" = "none";
    if (banner.link_product_id) type = "product";
    else if (banner.link_category) type = "category";
    else if (banner.link_url) type = "url";
    setLinkType(type);
    
    setImagePreview(banner.image_url);
    setImageFile(null);
    
    setForm({
      title: banner.title,
      subtitle: banner.subtitle || "",
      discount_text: banner.discount_text || "",
      image_url: banner.image_url,
      link_url: banner.link_url || "",
      link_category: banner.link_category || "",
      link_product_id: banner.link_product_id || "",
      color_gradient: banner.color_gradient,
      sort_order: banner.sort_order.toString(),
      is_active: banner.is_active,
    });
    setShowForm(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Выберите изображение");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Изображение должно быть меньше 5 МБ");
      return;
    }

    setImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

    const { error } = await supabase.storage
      .from("banners")
      .upload(fileName, file);

    if (error) {
      console.error("Upload error:", error);
      toast.error("Ошибка загрузки изображения");
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("banners")
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSave = async () => {
    if (!form.title) {
      toast.error("Заполните название");
      return;
    }

    if (!imageFile && !form.image_url) {
      toast.error("Загрузите изображение");
      return;
    }

    setIsUploading(true);

    let imageUrl = form.image_url;

    // Upload new image if selected
    if (imageFile) {
      const uploadedUrl = await uploadImage(imageFile);
      if (!uploadedUrl) {
        setIsUploading(false);
        return;
      }
      imageUrl = uploadedUrl;
    }

    const bannerData = {
      title: form.title,
      subtitle: form.subtitle || null,
      discount_text: form.discount_text || null,
      image_url: imageUrl,
      link_url: linkType === "url" ? form.link_url : null,
      link_category: linkType === "category" ? form.link_category : null,
      link_product_id: linkType === "product" ? form.link_product_id : null,
      color_gradient: form.color_gradient,
      sort_order: parseInt(form.sort_order) || 0,
      is_active: form.is_active,
    };

    if (editingBanner) {
      const { error } = await supabase
        .from("banners")
        .update(bannerData)
        .eq("id", editingBanner.id);

      if (error) {
        toast.error("Ошибка при обновлении");
      } else {
        toast.success("Баннер обновлён");
        fetchData();
      }
    } else {
      const { error } = await supabase
        .from("banners")
        .insert(bannerData);

      if (error) {
        toast.error("Ошибка при создании");
      } else {
        toast.success("Баннер создан");
        fetchData();
      }
    }

    setIsUploading(false);
    resetForm();
  };

  const handleDelete = async (bannerId: string) => {
    if (!confirm("Удалить баннер?")) return;

    const { error } = await supabase
      .from("banners")
      .delete()
      .eq("id", bannerId);

    if (error) {
      toast.error("Ошибка при удалении");
    } else {
      toast.success("Баннер удалён");
      fetchData();
    }
  };

  const toggleActive = async (bannerId: string, currentActive: boolean) => {
    const { error } = await supabase
      .from("banners")
      .update({ is_active: !currentActive })
      .eq("id", bannerId);

    if (error) {
      toast.error("Ошибка при обновлении");
    } else {
      fetchData();
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setForm({ ...form, image_url: "" });
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

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />

      <main className="container mx-auto px-3 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Link to="/admin">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-foreground">Баннеры</h1>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={resetForm}>
                <Plus className="h-4 w-4 mr-1" />
                Добавить
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingBanner ? "Редактировать баннер" : "Новый баннер"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Заголовок *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Свежий мёд"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Подзаголовок</Label>
                  <Input
                    value={form.subtitle}
                    onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                    placeholder="Натуральный продукт"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Дополнительный текст</Label>
                  <Input
                    value={form.discount_text}
                    onChange={(e) => setForm({ ...form, discount_text: e.target.value })}
                    placeholder="Скидки до -20%"
                  />
                </div>

                {/* Image upload */}
                <div className="space-y-2">
                  <Label>Изображение *</Label>
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-40 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={clearImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">
                        Нажмите для загрузки
                      </span>
                      <span className="text-xs text-muted-foreground mt-1">
                        PNG, JPG до 5 МБ
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageSelect}
                      />
                    </label>
                  )}
                </div>

                {/* Link type selector */}
                <div className="space-y-2">
                  <Label>Куда ведёт баннер</Label>
                  <Select value={linkType} onValueChange={(v) => setLinkType(v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите тип ссылки" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Без ссылки (каталог)</SelectItem>
                      <SelectItem value="category">Категория</SelectItem>
                      <SelectItem value="product">Товар</SelectItem>
                      <SelectItem value="url">Произвольный URL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Category selector */}
                {linkType === "category" && (
                  <div className="space-y-2">
                    <Label>Категория</Label>
                    <Select 
                      value={form.link_category} 
                      onValueChange={(v) => setForm({ ...form, link_category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите категорию" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.slug}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Product selector */}
                {linkType === "product" && (
                  <div className="space-y-2">
                    <Label>Товар</Label>
                    <Select 
                      value={form.link_product_id} 
                      onValueChange={(v) => setForm({ ...form, link_product_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите товар" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((prod) => (
                          <SelectItem key={prod.id} value={prod.id}>
                            {prod.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Custom URL */}
                {linkType === "url" && (
                  <div className="space-y-2">
                    <Label>URL</Label>
                    <Input
                      value={form.link_url}
                      onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                      placeholder="/catalog?discount=true"
                    />
                  </div>
                )}

                {/* Gradient selector with explanation */}
                <div className="space-y-2">
                  <Label>Затемнение</Label>
                  <p className="text-xs text-muted-foreground">
                    Градиент накладывается поверх изображения для лучшей читаемости текста.
                  </p>
                  <Select 
                    value={form.color_gradient} 
                    onValueChange={(v) => setForm({ ...form, color_gradient: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите затемнение" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADIENT_PRESETS.map((preset) => (
                        <SelectItem key={preset.value} value={preset.value}>
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Preview gradient on selected image */}
                  {imagePreview && (
                    <div className="relative mt-2 rounded-lg overflow-hidden">
                      <img
                        src={imagePreview}
                        alt="Gradient preview"
                        className="w-full h-24 object-cover"
                      />
                      <div className={`absolute inset-0 bg-gradient-to-r ${form.color_gradient}`} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white font-semibold text-sm drop-shadow-lg">
                          Превью текста
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Порядок</Label>
                    <Input
                      type="number"
                      value={form.sort_order}
                      onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Активен</Label>
                    <div className="pt-2">
                      <Switch
                        checked={form.is_active}
                        onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                      />
                    </div>
                  </div>
                </div>
                <Button onClick={handleSave} className="w-full" disabled={isUploading}>
                  {isUploading ? "Загрузка..." : editingBanner ? "Сохранить" : "Создать"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2">
          {banners.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              Нет баннеров. Нажмите "Добавить" для создания.
            </div>
          )}
          {banners.map((banner) => (
            <div key={banner.id} className="flex items-center gap-3 rounded-xl bg-card p-3">
              <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
              <img
                src={banner.image_url}
                alt={banner.title}
                className="h-12 w-20 rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-foreground truncate">{banner.title}</h3>
                  {!banner.is_active && (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                      Скрыт
                    </span>
                  )}
                </div>
                {banner.subtitle && (
                  <p className="text-xs text-muted-foreground truncate">{banner.subtitle}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {banner.link_product_id ? "→ Товар" : 
                   banner.link_category ? `→ ${banner.link_category}` : 
                   banner.link_url ? `→ ${banner.link_url}` : "→ Каталог"}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleActive(banner.id, banner.is_active)}
                >
                  {banner.is_active ? (
                    <Eye className="h-4 w-4 text-success" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleEdit(banner)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(banner.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
